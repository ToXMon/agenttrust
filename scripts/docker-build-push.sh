#!/bin/bash
# ── AgentTrust Docker Build & Push to GHCR ────────────────────
# Run this script locally (Docker not available in dev container)
#
# Usage:
#   chmod +x scripts/docker-build-push.sh
#   ./scripts/docker-build-push.sh          # Build all
#   ./scripts/docker-build-push.sh push     # Build + push

set -e

VERSION="${1:-v0.1.0}"
PUSH="${2:-}"
REGISTRY="ghcr.io/toxmon"
PROJ_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "═══════════════════════════════════════════════════"
echo " AgentTrust Docker Build & Push"
echo " Version: $VERSION"
echo " Registry: $REGISTRY"
echo " Project: $PROJ_DIR"
echo "═══════════════════════════════════════════════════"

# ── Login to GHCR ──────────────────────────────────────────────
if [ "$PUSH" = "push" ]; then
  echo "[1/5] Logging in to GHCR..."
  echo "$GITHUB_TOKEN" | docker login ghcr.io -u ToXMon --password-stdin
fi

# ── 1. Frontend ────────────────────────────────────────────────
echo "[2/5] Building frontend..."
cd "$PROJ_DIR/frontend"
docker build -t ${REGISTRY}/agentrust-frontend:${VERSION} .
if [ "$PUSH" = "push" ]; then
  docker push ${REGISTRY}/agentrust-frontend:${VERSION}
fi
echo "  ✅ agentrust-frontend:${VERSION}"

# ── 2. AXL Node Alpha ─────────────────────────────────────────
echo "[3/5] Building AXL Node Alpha (requester)..."
cd "$PROJ_DIR"
docker build -f deploy/akash/axl-node.Dockerfile \
  --build-arg CONFIG_FILE=configs/node-a.json \
  -t ${REGISTRY}/agentrust-axl-alpha:${VERSION} .
if [ "$PUSH" = "push" ]; then
  docker push ${REGISTRY}/agentrust-axl-alpha:${VERSION}
fi
echo "  ✅ agentrust-axl-alpha:${VERSION}"

# ── 3. AXL Node Beta ──────────────────────────────────────────
echo "[4/5] Building AXL Node Beta (provider)..."
docker build -f deploy/akash/axl-node.Dockerfile \
  --build-arg CONFIG_FILE=configs/node-b.json \
  -t ${REGISTRY}/agentrust-axl-beta:${VERSION} .
if [ "$PUSH" = "push" ]; then
  docker push ${REGISTRY}/agentrust-axl-beta:${VERSION}
fi
echo "  ✅ agentrust-axl-beta:${VERSION}"

# ── 4. Orchestrator (placeholder — uses frontend image base) ───
echo "[5/5] Building Orchestrator (placeholder)..."
cd "$PROJ_DIR/frontend"
docker build \
  --build-arg ORCHESTRATOR_MODE=true \
  -t ${REGISTRY}/agentrust-orchestrator:${VERSION} . 2>/dev/null || \
  docker build -t ${REGISTRY}/agentrust-orchestrator:${VERSION} .
if [ "$PUSH" = "push" ]; then
  docker push ${REGISTRY}/agentrust-orchestrator:${VERSION}
fi
echo "  ✅ agentrust-orchestrator:${VERSION}"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════"
echo " Built 4 images:"
echo "   ${REGISTRY}/agentrust-frontend:${VERSION}"
echo "   ${REGISTRY}/agentrust-axl-alpha:${VERSION}"
echo "   ${REGISTRY}/agentrust-axl-beta:${VERSION}"
echo "   ${REGISTRY}/agentrust-orchestrator:${VERSION}"
if [ "$PUSH" = "push" ]; then
  echo " Pushed to GHCR ✅"
else
  echo " Run with 'push' arg to push: $0 $VERSION push"
fi
echo "═══════════════════════════════════════════════════"
