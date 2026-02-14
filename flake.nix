{
  description = "Aurora Player — a beautiful local music player for Linux";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        packages.default = pkgs.stdenv.mkDerivation rec {
          pname = "aurora-player";
          # NOTE: Update version to match the version in package.json
          version = "2.4.0";

          src = ./.;

          nativeBuildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            makeWrapper
          ];

          buildInputs = with pkgs; [
            electron_28
            glib
            nss
            nspr
            at-spi2-atk
            cups
            dbus
            libdrm
            gtk3
            pango
            cairo
            xorg.libX11
            xorg.libXcomposite
            xorg.libXdamage
            xorg.libXext
            xorg.libXfixes
            xorg.libXrandr
            xorg.libxcb
            mesa
            expat
            alsa-lib
          ];

          configurePhase = ''
            export HOME=$TMPDIR
            npm ci --ignore-scripts
          '';

          buildPhase = ''
            npm run build
          '';

          installPhase = ''
            mkdir -p $out/lib/aurora-player
            cp -r dist dist-electron node_modules package.json $out/lib/aurora-player/

            mkdir -p $out/bin
            makeWrapper ${pkgs.electron_28}/bin/electron $out/bin/aurora-player \
              --add-flags "$out/lib/aurora-player/dist-electron/main.js" \
              --prefix LD_LIBRARY_PATH : "${pkgs.lib.makeLibraryPath buildInputs}"

            mkdir -p $out/share/applications
            cat > $out/share/applications/aurora-player.desktop << EOF
            [Desktop Entry]
            Name=Aurora Player
            Comment=A beautiful local music player
            Exec=$out/bin/aurora-player
            Icon=$out/share/icons/hicolor/512x512/apps/aurora-player.png
            Type=Application
            Categories=Audio;Music;Player;AudioVideo;
            Keywords=music;player;audio;flac;mp3;
            EOF

            mkdir -p $out/share/icons/hicolor/512x512/apps
            cp build/icon.png $out/share/icons/hicolor/512x512/apps/aurora-player.png
          '';

          meta = with pkgs.lib; {
            description = "A beautiful local music player for Linux";
            license = licenses.mit;
            platforms = platforms.linux;
            mainProgram = "aurora-player";
          };
        };

        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.npm
            electron_28
          ];
        };
      });
}
