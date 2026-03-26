# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Go server with self-hosting patches
FROM golang:1.20-alpine AS server-build
RUN apk add --no-cache patch
WORKDIR /build
COPY server/ server/
COPY deploy/patches/self-hosting.patch .
RUN patch -p1 < self-hosting.patch
WORKDIR /build/server
RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -buildvcs=false -o server .

# Stage 3: Runtime
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata

# Match directory layout expected by main.go (frontendPath = "../frontend/dist")
WORKDIR /app/server
COPY --from=server-build /build/server/server ./
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

EXPOSE 3002

CMD ["./server", "-release=true"]
