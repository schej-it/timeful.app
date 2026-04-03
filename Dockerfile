# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
ARG VUE_APP_POSTHOG_API_KEY=""
ENV VUE_APP_POSTHOG_API_KEY=$VUE_APP_POSTHOG_API_KEY
RUN npm run build

# Stage 2: Build Go server
FROM golang:1.21-alpine AS server-builder
WORKDIR /app/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -o server .

# Stage 3: Final image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY --from=server-builder /app/server/server ./server
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist
EXPOSE 3002
CMD ["./server", "-release"]
