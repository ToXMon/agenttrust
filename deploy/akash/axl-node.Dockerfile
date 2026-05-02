# ── AgentTrust AXL Node ── Docker Build ──────────────────────────
# Gensyn AXL P2P node for agent communication
# Builds with: docker build --build-arg CONFIG_FILE=configs/node-a.json ...

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy AXL binary (force-included in git)
COPY axl/node /app/axl-node
RUN chmod +x /app/axl-node

# Copy configs and keys
COPY axl/configs/ /app/configs/
COPY axl/keys/ /app/keys/

ARG CONFIG_FILE=configs/node-a.json
ENV CONFIG_FILE=${CONFIG_FILE}

# API port + TCP P2P port
EXPOSE 9002 9012 7000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:9002/topology || exit 1

CMD ["/app/axl-node", "--config", "/app/${CONFIG_FILE}"]
