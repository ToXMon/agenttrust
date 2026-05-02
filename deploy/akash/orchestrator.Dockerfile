# ── AgentTrust Orchestrator ── Dockerfile ──────────────────────────
# Agent coordination service - runs demo scenarios, connects to AXL nodes
# Target: GHCR ghcr.io/toxmon/agentrust-orchestrator

FROM node:20-alpine

RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --omit=dev

COPY tsconfig.json ./
COPY agents/ ./agents/
COPY sdk/ ./sdk/
COPY axl/configs/ ./axl/configs/
COPY axl/keys/ ./axl/keys/
COPY demo/ ./demo/

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget -q --spider http://localhost:3001/health || exit 1

# Run orchestrator - periodic demo scenario execution
CMD ["npx", "tsx", "demo/scenario.ts"]
