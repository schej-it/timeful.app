# syntax=docker/dockerfile:1.7

FROM node:26-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:26-bookworm-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

COPY . .

ARG VITE_POSTHOG_API_KEY=""
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_MICROSOFT_CLIENT_ID=""

RUN VITE_POSTHOG_API_KEY="$VITE_POSTHOG_API_KEY" \
    VITE_GOOGLE_CLIENT_ID="$VITE_GOOGLE_CLIENT_ID" \
    VITE_MICROSOFT_CLIENT_ID="$VITE_MICROSOFT_CLIENT_ID" \
    npm run build

# Move to /build so it's not hidden by volume mount
RUN mv dist /build

FROM scratch AS dist
COPY --from=builder /build /dist
