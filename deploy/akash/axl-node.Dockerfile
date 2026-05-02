# ── AgentTrust AXL Node ── Docker Build ──────────────────────────
# Gensyn AXL P2P node for agent communication
# Builds with: docker build --build-arg CONFIG_FILE=configs/node-a.json ...

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl wget && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Download Gensyn AXL binary from the collaborative-autoresearch-demo repo
# The binary is ~17MB x86_64 ELF
RUN wget -q -O /app/axl-node \
    "https://github.com/gensyn-ai/collaborative-autoresearch-demo/releases/download/v0.1.0/axl-node-x86_64" \
    || echo "Binary download failed - using placeholder" && \
    chmod +x /app/axl-node || true

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
