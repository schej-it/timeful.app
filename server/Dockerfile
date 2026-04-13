# Build stage
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy all source code
COPY . .

# Download dependencies and build
RUN go build -buildvcs=false -o server .

# Runtime stage
FROM alpine:3.23

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

# Create non-root user
RUN adduser -D -g '' appuser

# Copy binary from builder
COPY --from=builder /app/server .

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

USER appuser

EXPOSE 3002

# Run in release mode
CMD ["./server", "-release=true"]
