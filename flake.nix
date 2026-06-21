{
  description = "hugo-moo-theme development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forAllSystems = fn: nixpkgs.lib.genAttrs systems (system: fn nixpkgs.legacyPackages.${system});

      # --- Vendored browser JS, pinned by URL + hash ---------------------------
      # Nix fetches these reproducibly; `nix run .#vendor` copies them into
      # assets/js/vendor/ which IS committed to the repo, because the deploy CI
      # runs a plain `hugo` (no nix) and picks them up through Hugo Pipes.
      # To bump: change the version, run `nix run .#vendor`, then update the hash
      # nix prints on mismatch (or `nix store prefetch-file <url>`).
      htmxVersion = "2.0.9";
      mkHtmx = pkgs: pkgs.fetchurl {
        url = "https://github.com/bigskysoftware/htmx/releases/download/v${htmxVersion}/htmx.min.js";
        hash = "sha256-V9kZFRUzmSK9E1bXstgLHuOynxs6LGWgeLuLLo/Zrl8=";
      };

      mkVendor = pkgs: pkgs.writeShellApplication {
        name = "vendor-js";
        runtimeInputs = [ pkgs.coreutils ];
        text = ''
          root="''${1:-.}"
          dest="$root/assets/js/vendor"
          mkdir -p "$dest"
          install -m 0644 ${mkHtmx pkgs} "$dest/htmx.min.js"
          echo "vendored htmx ${htmxVersion} -> $dest/htmx.min.js"
        '';
      };
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [
            pkgs.biome
            pkgs.hugo
            pkgs.direnv
          ];
        };
      });

      # `nix build .#htmx` -> ./result is the raw pinned htmx.min.js.
      packages = forAllSystems (pkgs: {
        htmx = mkHtmx pkgs;
      });

      # `nix run .#vendor` -> writes assets/js/vendor/htmx.min.js (commit the result).
      apps = forAllSystems (pkgs: {
        vendor = {
          type = "app";
          program = "${mkVendor pkgs}/bin/vendor-js";
        };
        default = {
          type = "app";
          program = "${mkVendor pkgs}/bin/vendor-js";
        };
      });
    };
}
