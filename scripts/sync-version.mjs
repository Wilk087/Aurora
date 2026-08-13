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

/** Files that carry a copy of the version, and how to find it. */
const targets = [
  {
    file: 'PKGBUILD',
    pattern: /^pkgver=.*$/m,
    replacement: `pkgver=${release}`,
  },
  {
    file: 'flake.nix',
    pattern: /^(\s*)version = "[^"]*";$/m,
    replacement: (m, indent) => `${indent}version = "${release}";`,
  },
]

let drift = false

for (const { file, pattern, replacement } of targets) {
  const path = resolve(root, file)
  const before = readFileSync(path, 'utf-8')

  if (!pattern.test(before)) {
    console.error(`${file}: could not find a version line matching ${pattern}`)
    process.exit(1)
  }

  const after = before.replace(pattern, replacement)

  if (before === after) {
    console.log(`  ok       ${file} (${release})`)
    continue
  }

  drift = true

  if (check) {
    const currentLine = before.match(pattern)[0].trim()
    console.error(`  DRIFT    ${file}: has "${currentLine}", expected ${release}`)
  } else {
    writeFileSync(path, after)
    console.log(`  updated  ${file} -> ${release}`)
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
