{
  description = "Timeful - scheduling platform for finding the best time to meet";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs, ... }:
    {
      nixosModules.default = import ./nixos/timeful.nix { src = self; };
    };
}
