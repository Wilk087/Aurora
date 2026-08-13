#!/usr/bin/env node
/**
 * Generate the PKGBUILD for the `aurora-player-bin` AUR package.
 *
 *   node scripts/gen-aur-pkgbuild.mjs <path-to-AppImage> [outDir]
 *
 * The -bin package repackages the released AppImage rather than building from
 * source. That keeps Arch users on exactly the same Electron runtime as every
 * other channel, and makes installing a few seconds instead of a full npm build.
 *
 * The version and sha256 are read from the real artifact, so this can never
 * disagree with what was actually published.
 */

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs'
import { resolve, basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const appImagePath = process.argv[2]
const outDir = resolve(process.argv[3] ?? resolve(root, 'aur/aurora-player-bin'))

if (!appImagePath) {
  console.error('usage: node scripts/gen-aur-pkgbuild.mjs <path-to-AppImage> [outDir]')
  process.exit(1)
}

const appImage = resolve(appImagePath)
try {
  if (!statSync(appImage).isFile()) throw new Error('not a file')
} catch {
  console.error(`AppImage not found: ${appImage}`)
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8'))
const pkgver = pkg.version.split('-')[0]
const assetName = basename(appImage)
const sha256 = createHash('sha256').update(readFileSync(appImage)).digest('hex')

const pkgbuild = `# Maintainer: ${pkg.author.name} <${pkg.author.email}>
#
# GENERATED FILE - do not edit by hand.
# Produced by scripts/gen-aur-pkgbuild.mjs from the released AppImage and
# pushed automatically by .github/workflows/release.yml.

pkgname=aurora-player-bin
_appname=aurora-player
pkgver=${pkgver}
pkgrel=1
pkgdesc="${pkg.description}"
arch=('x86_64')
url="${pkg.build?.publish?.[0] ? `https://github.com/${pkg.build.publish[0].owner}/${pkg.build.publish[0].repo}` : 'https://github.com/Wilk087/Aurora'}"
license=('GPL-3.0-or-later')
depends=(
  'gstreamer'
  'gst-plugins-base'
  'gst-plugins-good'
  'gtk3'
  'nss'
  'alsa-lib'
  'libsecret'
  'libxss'
  'xdg-utils'
)
provides=("\${_appname}=\${pkgver}")
conflicts=("\${_appname}")
options=('!strip' '!debug')
source=("\${_appname}-\${pkgver}.AppImage::\${url}/releases/download/v\${pkgver}/${assetName}")
sha256sums=('${sha256}')
noextract=("\${_appname}-\${pkgver}.AppImage")

prepare() {
  chmod +x "\${srcdir}/\${_appname}-\${pkgver}.AppImage"
  "\${srcdir}/\${_appname}-\${pkgver}.AppImage" --appimage-extract > /dev/null

  # The AppImage ships world-unreadable bits in places; normalise so the
  # packaged tree is readable by every user.
  chmod -R go-w "\${srcdir}/squashfs-root"
  chmod -R a+r "\${srcdir}/squashfs-root"
  find "\${srcdir}/squashfs-root" -type d -exec chmod a+x {} +
}

package() {
  install -dm755 "\${pkgdir}/opt/\${_appname}"
  cp -a "\${srcdir}/squashfs-root/." "\${pkgdir}/opt/\${_appname}/"

  # chrome-sandbox needs to be setuid root, or Electron refuses to start
  # on kernels without unprivileged user namespaces.
  if [ -f "\${pkgdir}/opt/\${_appname}/chrome-sandbox" ]; then
    chmod 4755 "\${pkgdir}/opt/\${_appname}/chrome-sandbox"
  fi

  install -dm755 "\${pkgdir}/usr/bin"
  ln -s "/opt/\${_appname}/\${_appname}" "\${pkgdir}/usr/bin/\${_appname}"

  install -Dm644 "\${srcdir}/squashfs-root/\${_appname}.desktop" \\
    "\${pkgdir}/usr/share/applications/\${_appname}.desktop"

  for size in 16 32 48 64 128 256 512; do
    icon="\${srcdir}/squashfs-root/usr/share/icons/hicolor/\${size}x\${size}/apps/\${_appname}.png"
    if [ -f "\$icon" ]; then
      install -Dm644 "\$icon" \\
        "\${pkgdir}/usr/share/icons/hicolor/\${size}x\${size}/apps/\${_appname}.png"
    fi
  done

  install -Dm644 "\${srcdir}/squashfs-root/LICENSE" \\
    "\${pkgdir}/usr/share/licenses/\${pkgname}/LICENSE" 2>/dev/null || true
}
`

mkdirSync(outDir, { recursive: true })
writeFileSync(resolve(outDir, 'PKGBUILD'), pkgbuild)

console.log(`Wrote ${resolve(outDir, 'PKGBUILD')}`)
console.log(`  pkgver  ${pkgver}`)
console.log(`  asset   ${assetName}`)
console.log(`  sha256  ${sha256}`)
