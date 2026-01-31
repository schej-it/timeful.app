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
{ self }:
{
  config,
  pkgs,
  lib,
  ...
}:

let
  cfg = config.services.timeful;

  server = self.packages.${pkgs.stdenv.hostPlatform.system}.server;
  frontend = (self.packages.${pkgs.stdenv.hostPlatform.system}.frontend.override {
    googleClientId = cfg.googleClientId;
    microsoftClientId = cfg.microsoftClientId;
    posthogApiKey = cfg.posthogApiKey;
  });
in
{
  options.services.timeful = {
    enable = lib.mkEnableOption "Timeful scheduling app";

    domain = lib.mkOption {
      type = lib.types.str;
      example = "timeful.example.com";
      description = "Domain name for Timeful";
    };

    enableCaddy = lib.mkOption {
      type = lib.types.bool;
      default = true;
      description = "Whether to configure Caddy as a reverse proxy for Timeful";
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

    port = lib.mkOption {
      type = lib.types.port;
      default = 3002;
      description = "Port the Go server listens on";
    };

    googleClientId = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Google OAuth client ID (baked into frontend build)";
    };

    microsoftClientId = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "Microsoft OAuth client ID (baked into frontend build)";
    };

    posthogApiKey = lib.mkOption {
      type = lib.types.str;
      default = "";
      description = "PostHog analytics API key (baked into frontend build)";
    };
  };

  config = lib.mkIf cfg.enable {

    # MongoDB as an OCI container
    virtualisation.oci-containers = {
      backend = "podman";
      containers.timeful-mongo = {
        image = "mongo:7";
        volumes = [ "${cfg.dataDir}/mongo:/data/db" ];
        ports = [ "127.0.0.1:27017:27017" ];
      };
    };

    virtualisation.podman.enable = true;

    # Go server as a native systemd service
    systemd.services.timeful = {
      description = "Timeful scheduling server";
      after = [
        "podman-timeful-mongo.service"
        "network-online.target"
      ];
      wants = [
        "podman-timeful-mongo.service"
        "network-online.target"
      ];
      wantedBy = [ "multi-user.target" ];

      preStart = ''
        mkdir -p ${cfg.dataDir}/logs
      '';

      serviceConfig = {
        Type = "simple";
        ExecStart = "${server}/bin/server -release=true";
        WorkingDirectory = cfg.dataDir;
        EnvironmentFile = cfg.envFile;
        Environment = [
          "FRONTEND_DIST=${frontend}"
          "MONGODB_URI=mongodb://127.0.0.1:27017"
          "GIN_MODE=release"
        ];
        Restart = "on-failure";
        RestartSec = 5;

        User = "timeful";
        Group = "timeful";
        StateDirectory = "timeful";
        PrivateTmp = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        NoNewPrivileges = true;
        ReadWritePaths = [ cfg.dataDir ];
      };
    };

    users.users.timeful = {
      isSystemUser = true;
      group = "timeful";
      home = cfg.dataDir;
    };
    users.groups.timeful = { };

    # Optional Caddy reverse proxy
    services.caddy = lib.mkIf cfg.enableCaddy {
      enable = true;
      virtualHosts = {
        "${cfg.domain}" = {
          extraConfig = ''
            reverse_proxy localhost:${toString cfg.port}
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
