# Build stage
FROM golang:1.26.3-alpine3.23 AS builder

WORKDIR /app

# Cache module downloads separately from application source changes.
COPY go.mod go.sum ./
RUN go mod download

# Copy the remaining build inputs and compile the server binary.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -buildvcs=false -o /out/server .

# Runtime stage
FROM alpine:3.23

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user and writable runtime directories
RUN adduser -D -g '' appuser \
	&& mkdir -p /app/logs \
	&& chown -R appuser:appuser /app

# Copy binary from builder
COPY --from=builder /out/server ./server

USER appuser

EXPOSE 3002

CMD ["./server"]
