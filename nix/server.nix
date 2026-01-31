{
  lib,
  buildGoModule,
  cacert,
}:

buildGoModule {
  pname = "timeful-server";
  version = "0-unstable";

  src = lib.fileset.toSource {
    root = ../server;
    fileset = lib.fileset.intersection (lib.fileset.fromSource (lib.sources.cleanSource ../server)) (
      lib.fileset.unions [
        ../server/go.mod
        ../server/go.sum
        (lib.fileset.fileFilter (file: lib.hasSuffix ".go" file.name) ../server)
        ../server/docs
      ]
    );
  };

  vendorHash = "sha256-cTSZSLDC+ku89yV6OFCcs8l0ABNLzH30ZB8w/4OQC28=";

  subPackages = [ "." ];

  buildInputs = [ cacert ];

  env.GOFLAGS = "-buildvcs=false";

  meta = {
    description = "Timeful scheduling server";
    mainProgram = "server";
  };
}
