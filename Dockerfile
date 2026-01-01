# Multi-stage build for production image
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci && npm install -g vue-cli-service

COPY frontend/ ./
RUN npm run build


# Go build stage
FROM golang:1.20-alpine AS go-builder

RUN apk add --no-cache git

WORKDIR /app/server

# Copy go mod files
COPY server/go.mod server/go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY server/ ./

# Build Go application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .


# Production stage
FROM alpine:latest

# Install runtime dependencies
RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

# Copy built frontend from frontend-builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Copy built Go binary from go-builder stage
COPY --from=go-builder /app/server/server ./server

# Copy static files if they exist
COPY --from=go-builder /app/server/static ./static

# Create logs directory
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Change ownership
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3002/api/health || exit 1

# Environment variables
ENV GIN_MODE=release
ENV PORT=3002

# Start server
CMD ["./server", "-release=true"]
