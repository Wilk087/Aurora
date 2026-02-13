# Maintainer: Wilk087
# NOTE: Update pkgver to match the version in package.json
pkgname=aurora-player
pkgver=2.2.0
pkgrel=1
pkgdesc="A beautiful local music player for Linux"
arch=('x86_64')
url="https://github.com/Wilk087/Aurora"
license=('GPL-3.0-or-later')
depends=('electron28' 'gstreamer' 'gst-plugins-base' 'gst-plugins-good')
makedepends=('npm' 'nodejs')
source=("${pkgname}-${pkgver}.tar.gz::${url}/archive/refs/tags/v${pkgver}.tar.gz")
sha256sums=('SKIP')

build() {
  cd "${srcdir}/Aurora-${pkgver}"
  npm ci --ignore-scripts
  npm run build
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
exec electron28 /usr/lib/aurora-player/dist-electron/main.js "$@"
EOF
  chmod 755 "${pkgdir}/usr/bin/${pkgname}"

  # Desktop entry
  install -Dm644 /dev/stdin "${pkgdir}/usr/share/applications/${pkgname}.desktop" << EOF
[Desktop Entry]
Name=Aurora Player
Comment=A beautiful local music player
Exec=${pkgname}
Icon=${pkgname}
Type=Application
Categories=Audio;Music;Player;AudioVideo;
Keywords=music;player;audio;flac;mp3;
EOF

  # Icon
  install -Dm644 build/icon.png "${pkgdir}/usr/share/icons/hicolor/512x512/apps/${pkgname}.png"

  # License
  install -Dm644 /dev/stdin "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE" << 'EOF'
GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Copyright (C) 2007 Free Software Foundation, Inc. <https://fsf.org/>
Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.

of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
}
