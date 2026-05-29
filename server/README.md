# Schej.it API

API docs (available when the server is running): http://localhost:3002/swagger/index.html

## Debug

- Install mongodb
- Install `air`, a package that facilitates live reload for Go apps
  - `go install github.com/cosmtrek/air@latest`
- To run the server, simply run `air` in the root directory of the server

## Make a backup of the mongodb database

- Run `mongodump --host="localhost:27017" --db=schej-it` to make a backup
- Run `mongorestore --uri mongodb://localhost:27017 ./dump --drop` to restore only when you intend to replace the current local `schej-it` database. The `--drop` flag removes existing data before importing the dump.

## Tests

Pure unit tests can run on the host or in a container.

Mongo-backed route tests should use the isolated Compose test stack from the repo root:

```sh
docker compose --env-file .env.development -f compose.yaml -f compose.test.yaml up -d mongo-test
docker compose --env-file .env.development -f compose.yaml -f compose.test.yaml run --rm server-test
docker compose --env-file .env.development -f compose.yaml -f compose.test.yaml down -v
```

The `down -v` cleanup is scoped to the isolated `timeful-test` Compose stack and
its test-only Mongo volume.

When running Mongo-backed tests directly on the host, set `MONGODB_URI` to a dedicated test database first. Those tests no longer default to `127.0.0.1:27017`.
