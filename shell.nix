{pkgs ? import <nixpkgs> {}}:
pkgs.mkShell {
  name = "node-shell";

  buildInputs = with pkgs; [
    bashInteractive
    nodejs_22
  ];

  shellHook = ''
    export SHELL='/run/current-system/sw/bin/bash';
  '';
}
