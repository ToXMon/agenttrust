# ── AgentTrust AXL Node ── Dockerfile ──────────────────────────
# Runs a Gensyn AXL binary with config and keys
# Target: GHCR ghcr.io/toxmon/agentrust-axl-alpha / agentrust-axl-beta
#
# Build:
#   cd /a0/usr/projects/agentrust
#   docker build -f deploy/akash/axl-node.Dockerfile #     -t ghcr.io/toxmon/agentrust-axl-alpha:v0.1.0 #     --build-arg CONFIG_FILE=configs/node-a.json .
#
#   docker build -f deploy/akash/axl-node.Dockerfile #     -t ghcr.io/toxmon/agentrust-axl-beta:v0.1.0 #     --build-arg CONFIG_FILE=configs/node-b.json .

FROM debian:bookworm-slim

RUN apt-get update &&     apt-get install -y --no-install-recommends ca-certificates curl &&     rm -rf /var/lib/apt/lists/*

WORKDIR /axl

# Copy binary
COPY axl/node /axl/node
RUN chmod +x /axl/node

# Copy all configs and keys
COPY axl/configs/ /axl/configs/
COPY axl/keys/ /axl/keys/

ARG CONFIG_FILE=configs/node-a.json
ENV CONFIG_FILE=${CONFIG_FILE}

# Expose API port (9002 for alpha, 9012 for beta) and TCP port
EXPOSE 9002 9012 7000

# Health check against API port
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3   CMD curl -sf http://localhost:9002/topology || curl -sf http://localhost:9012/topology || exit 1

ENTRYPOINT [