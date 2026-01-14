# Timeful NixOS Module
#
# Usage: Add to your configuration.nix:
#   imports = [ ./timeful.nix ];
#   services.timeful = {
#     enable = true;
#     domain = "timeful.example.com";
#     envFile = "/var/lib/timeful/.env";
#   };
#
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

    repo = lib.mkOption {
      type = lib.types.str;
      default = "https://github.com/Razboy20/timeful.app";
      description = "Git repository URL";
    };

    branch = lib.mkOption {
      type = lib.types.str;
      default = "main";
      description = "Git branch to deploy";
    };
  };

  config = lib.mkIf cfg.enable {
    # Required packages
    environment.systemPackages = [
      pkgs.docker-compose
      pkgs.git
    ];

    # Enable Docker
    virtualisation.docker.enable = true;

    # Create data directory and clone/update repo
    systemd.services.timeful-setup = {
      description = "Setup Timeful repository";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      path = [ pkgs.git ];

      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
      };

      script = ''
        mkdir -p ${cfg.dataDir}

        if [ ! -d "${cfg.dataDir}/repo/.git" ]; then
          git clone --branch ${cfg.branch} ${cfg.repo} ${cfg.dataDir}/repo
        else
          cd ${cfg.dataDir}/repo
          git fetch origin
          git reset --hard origin/${cfg.branch}
        fi

        # Always ensure env file is linked (git reset removes the symlink)
        if [ -f "${cfg.envFile}" ]; then
          ln -sf ${cfg.envFile} ${cfg.dataDir}/repo/server/.env
        fi
      '';
    };

    # Main Timeful service
    systemd.services.timeful = {
      description = "Timeful App";
      after = [
        "docker.service"
        "network-online.target"
        "timeful-setup.service"
      ];
      wants = [
        "docker.service"
        "network-online.target"
      ];
      requires = [ "timeful-setup.service" ];
      wantedBy = [ "multi-user.target" ];

      serviceConfig = {
        Type = "oneshot";
        RemainAfterExit = true;
        WorkingDirectory = "${cfg.dataDir}/repo";
        ExecStart = "${pkgs.docker-compose}/bin/docker-compose up -d --build";
        ExecStop = "${pkgs.docker-compose}/bin/docker-compose down";
        ExecReload = "${pkgs.docker-compose}/bin/docker-compose up -d --build";
      };
    };

    # Caddy reverse proxy
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

    # # Firewall
    # networking.firewall.allowedTCPPorts = [ 80 443 ];
  };
}
