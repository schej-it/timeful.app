# Timeful NixOS Module
#
# Usage in a flake-based NixOS configuration:
#
# 1. Add timeful as a flake input:
#
#   inputs = {
#     nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
#     timeful.url = "github:Razboy20/timeful.app";
#   };
#
# 2. Import the module in your nixosConfigurations:
#
#   outputs = inputs@{ nixpkgs, timeful, ... }: {
#     nixosConfigurations.my-host = nixpkgs.lib.nixosSystem {
#       modules = [
#         ./configuration.nix
#         timeful.nixosModules.default
#       ];
#     };
#   };
#
# 3. Configure the service in your configuration.nix:
#
#   services.timeful = {
#     enable = true;
#     domain = "timeful.example.com";
#     envFile = "/var/lib/timeful/.env";
#   };
#
{ src }:
{
  config,
  pkgs,
  lib,
  ...
}:

let
  cfg = config.services.timeful;
in
{
  options.services.timeful = {
    enable = lib.mkEnableOption "Timeful scheduling app";

    domain = lib.mkOption {
      type = lib.types.str;
      example = "timeful.example.com";
      description = "Domain name for Timeful";
    };

    envFile = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/timeful/.env";
      description = "Path to the environment file with secrets";
    };

    dataDir = lib.mkOption {
      type = lib.types.path;
      default = "/var/lib/timeful";
      description = "Directory for Timeful data";
    };
  };

  config = lib.mkIf cfg.enable {
    environment.systemPackages = [
      pkgs.docker-compose
    ];

    virtualisation.docker.enable = true;

    systemd.services.timeful = {
      description = "Timeful App";
      after = [
        "docker.service"
        "network-online.target"
      ];
      wants = [
        "docker.service"
        "network-online.target"
      ];
      wantedBy = [ "multi-user.target" ];

      preStart = ''
        rm -rf ${cfg.dataDir}/repo
        cp -r ${src} ${cfg.dataDir}/repo
        chmod -R u+w ${cfg.dataDir}/repo
        ln -sf ${cfg.envFile} ${cfg.dataDir}/repo/server/.env
      '';

      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        WorkingDirectory = "${cfg.dataDir}/repo";
        ExecStart = "${pkgs.docker-compose}/bin/docker-compose up -d --build";
        ExecStop = "${pkgs.docker-compose}/bin/docker-compose down";
        ExecReload = "${pkgs.docker-compose}/bin/docker-compose up -d --build";
      };
    };

    services.caddy = {
      enable = true;
      virtualHosts = {
        "${cfg.domain}" = {
          extraConfig = ''
            reverse_proxy localhost:3002
            encode gzip zstd

            header {
              X-Content-Type-Options nosniff
              X-Frame-Options SAMEORIGIN
              Referrer-Policy strict-origin-when-cross-origin
              -Server
            }
          '';
        };
      };
    };
  };
}
