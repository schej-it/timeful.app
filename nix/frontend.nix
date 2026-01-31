{
  lib,
  buildNpmPackage,
  nodejs_20,
  googleClientId ? "",
  microsoftClientId ? "",
  posthogApiKey ? "",
}:

buildNpmPackage {
  pname = "timeful-frontend";
  version = "0-unstable";

  src = lib.sources.cleanSource ../frontend;

  nodejs = nodejs_20;

  npmDepsHash = "sha256-vgVGAWwv0AvRlDgqYKRQ/uRXlr6XXdlgwf2F+b8Apeo=";

  env = {
    VUE_APP_GOOGLE_CLIENT_ID = googleClientId;
    VUE_APP_MICROSOFT_CLIENT_ID = microsoftClientId;
    VUE_APP_POSTHOG_API_KEY = posthogApiKey;
  };

  buildPhase = ''
    runHook preBuild
    npx vue-cli-service build
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    cp -r dist $out
    runHook postInstall
  '';

  dontNpmInstall = true;

  meta = {
    description = "Timeful scheduling frontend";
  };
}
