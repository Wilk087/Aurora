# Maintainer: Wilk087 <business@wilk087.dev>
#
# Source package: builds Aurora from the tagged release and runs it on the
# system Electron. Most users want `aurora-player-bin` from the AUR instead,
# which repackages the released AppImage and needs no build step.
#
# pkgver is kept in sync with package.json by scripts/sync-version.mjs.
# Do not edit it by hand; run `npm run sync-version`.

pkgname=aurora-player
pkgver=2.9.0
pkgrel=1
pkgdesc="A beautiful local music player for Linux"
arch=('x86_64')
url="https://github.com/Wilk087/Aurora"
license=('GPL-3.0-or-later')
# Must stay on the same Electron major the app is developed and tested against
# (see devDependencies.electron in package.json). Bumping one without the other
# ships Arch users a runtime nobody tested.
depends=('electron43' 'gstreamer' 'gst-plugins-base' 'gst-plugins-good')
makedepends=('npm' 'nodejs')
provides=("${pkgname}=${pkgver}")
conflicts=("${pkgname}-bin")
source=("${pkgname}-${pkgver}.tar.gz::${url}/archive/refs/tags/v${pkgver}.tar.gz")
sha256sums=('SKIP')

build() {
  cd "${srcdir}/Aurora-${pkgver}"
  npm ci --ignore-scripts
  npm run build

  # The packaged app only needs runtime dependencies. Without this the package
  # would ship electron, electron-builder, vite, and typescript to every user.
  npm prune --omit=dev --ignore-scripts
}

package() {
  cd "${srcdir}/Aurora-${pkgver}"

  # Install app files
  install -dm755 "${pkgdir}/usr/lib/${pkgname}"
  cp -r dist dist-electron node_modules package.json "${pkgdir}/usr/lib/${pkgname}/"

  # Launcher script using system electron
  install -dm755 "${pkgdir}/usr/bin"
  cat > "${pkgdir}/usr/bin/${pkgname}" << 'EOF'
#!/bin/bash
exec electron43 /usr/lib/aurora-player/dist-electron/main.js "$@"
EOF
  chmod 755 "${pkgdir}/usr/bin/${pkgname}"

  # Desktop entry
  install -Dm644 /dev/stdin "${pkgdir}/usr/share/applications/${pkgname}.desktop" << EOF
[Desktop Entry]
Name=Aurora Player
Comment=A beautiful local music player
Exec=${pkgname} %U
Icon=${pkgname}
Type=Application
Categories=Audio;Music;Player;AudioVideo;
Keywords=music;player;audio;flac;mp3;
MimeType=audio/mpeg;audio/flac;audio/ogg;audio/opus;audio/wav;audio/x-wav;audio/mp4;audio/aac;audio/x-ms-wma;
EOF

  # Icon
  install -Dm644 build/icon.png "${pkgdir}/usr/share/icons/hicolor/512x512/apps/${pkgname}.png"

  # License — install the real GPL-3 text from the repository rather than
  # embedding a copy here, which is how the previous heredoc ended up splicing
  # MIT permission text into a GPL header.
  install -Dm644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
}
