# ── AgentTrust Frontend ── Multi-stage Dockerfile ──────────────
# Next.js 14 standalone output for minimal production image
# Target: GHCR ghcr.io/toxmon/agentrust-frontend

# ── Stage 1: Build ───────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Build-time environment variables (defaults, can be overridden)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

ARG NEXT_PUBLIC_CHAIN_ID=8453
ARG NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
ARG NEXT_PUBLIC_AGENT_REGISTRY=0xc44cC67485A6A5AB46978752789954a8Ae845eeA
ARG NEXT_PUBLIC_SERVICE_AGREEMENT=0x109bA5eDd23c247771F2FcD7572E8334278dBE81
ARG NEXT_PUBLIC_TRUST_NFT=0x0374f7516E57e778573B2e90E6D7113b8253FF5C
ARG NEXT_PUBLIC_ENS_BASENAME=agentrust.base.eth
ARG NEXT_PUBLIC_BLOCK_EXPLORER=https://basescan.org

ENV NEXT_PUBLIC_CHAIN_ID=$NEXT_PUBLIC_CHAIN_ID
ENV NEXT_PUBLIC_RPC_URL=$NEXT_PUBLIC_RPC_URL
ENV NEXT_PUBLIC_AGENT_REGISTRY=$NEXT_PUBLIC_AGENT_REGISTRY
ENV NEXT_PUBLIC_SERVICE_AGREEMENT=$NEXT_PUBLIC_SERVICE_AGREEMENT
ENV NEXT_PUBLIC_TRUST_NFT=$NEXT_PUBLIC_TRUST_NFT
ENV NEXT_PUBLIC_ENS_BASENAME=$NEXT_PUBLIC_ENS_BASENAME
ENV NEXT_PUBLIC_BLOCK_EXPLORER=$NEXT_PUBLIC_BLOCK_EXPLORER

RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output from builder
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
