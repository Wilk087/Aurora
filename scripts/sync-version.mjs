#!/usr/bin/env node
/**
 * Single source of truth for the app version.
 *
 * package.json is authoritative. This script propagates its version into every
 * other file that carries one, so they can never drift apart again.
 *
 *   node scripts/sync-version.mjs           rewrite the other files
 *   node scripts/sync-version.mjs --check   exit 1 if anything is out of sync
 *
 * Prerelease suffixes (2.9.0-dev) are stripped for the distro packaging files,
 * because neither pacman nor Nix accepts a dash in a version. package.json keeps
 * the full string.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const check = process.argv.includes('--check')

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const full = pkg.version
const release = full.split('-')[0]

if (!/^\d+\.\d+\.\d+$/.test(release)) {
  console.error(`package.json version "${full}" does not start with a x.y.z release number`)
  process.exit(1)
}

// The Arch source package runs on the system Electron, so it must depend on the
// same major the app is built and tested against. Derive it from
// devDependencies rather than letting someone remember to bump it by hand —
// that is how the package ended up on electron28 while development moved to 33.
const electronRange = pkg.devDependencies?.electron ?? ''
const electronMajor = /(\d+)/.exec(electronRange)?.[1]

if (!electronMajor) {
  console.error(`could not read an Electron major from devDependencies.electron ("${electronRange}")`)
  process.exit(1)
}

/** Files that carry a copy of the version, and how to find it. */
const targets = [
  {
    file: 'PKGBUILD',
    pattern: /^pkgver=.*$/m,
    replacement: `pkgver=${release}`,
  },
  {
    file: 'PKGBUILD',
    label: `electron${electronMajor} dependency`,
    pattern: /^depends=\('electron\d+'(.*)$/m,
    replacement: (_m, rest) => `depends=('electron${electronMajor}'${rest}`,
  },
  {
    file: 'PKGBUILD',
    label: `electron${electronMajor} launcher`,
    pattern: /^exec electron\d+ /m,
    replacement: `exec electron${electronMajor} `,
  },
  {
    file: 'flake.nix',
    pattern: /^(\s*)version = "[^"]*";$/m,
    replacement: (m, indent) => `${indent}version = "${release}";`,
  },
]

let drift = false

for (const { file, pattern, replacement, label } of targets) {
  const what = label ?? `version ${release}`
  const path = resolve(root, file)
  const before = readFileSync(path, 'utf-8')

  if (!pattern.test(before)) {
    console.error(`${file}: could not find a line matching ${pattern}`)
    process.exit(1)
  }

  const after = before.replace(pattern, replacement)

  if (before === after) {
    console.log(`  ok       ${file} (${what})`)
    continue
  }

  drift = true

  if (check) {
    const currentLine = before.match(pattern)[0].trim()
    console.error(`  DRIFT    ${file}: has "${currentLine}", expected ${what}`)
  } else {
    writeFileSync(path, after)
    console.log(`  updated  ${file} -> ${what}`)
  }
}

if (check && drift) {
  console.error(
    `\nVersion drift detected. package.json says ${full} (release ${release}).\n` +
    `Run "node scripts/sync-version.mjs" and commit the result.`
  )
  process.exit(1)
}

if (check) console.log(`\nAll version references agree on ${release}.`)
else if (!drift) console.log(`\nNothing to do, everything already on ${release}.`)
