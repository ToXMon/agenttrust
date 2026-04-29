#!/bin/bash
# AgentTrust AXL Node Manager
# Starts 2 Gensyn AXL nodes for P2P agent communication

set -e

AXL_DIR="/a0/usr/projects/agentrust/axl"
CONFIG_DIR="$AXL_DIR/configs"
NODE_BIN="$AXL_DIR/node"
LOG_DIR="/tmp"

# Peer IDs (generated from ed25519 keys)
# Node A: f91e048671228a2c3f79493c59391687f837b27ad58d54ab61f99366863fce22
# Node B: 5342ef9e91ddf13bf91037714045b563fe2e316213356a5441c749732015c758

case "${1:-start}" in
  start)
    echo "Starting AXL nodes..."
    
    # Kill any existing instances
    lsof -ti:9002 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    lsof -ti:9012 2>/dev/null | xargs -r kill -9 2>/dev/null || true
    sleep 2
    
    # Start Node A (Requester)
    echo "  Starting Node A (api=9002, tcp=7000, role=requester)..."
    $NODE_BIN -config $CONFIG_DIR/node-a.json > $LOG_DIR/axl-node-a.log 2>&1 &
    echo "  Node A PID: $!"
    
    sleep 5
    
    # Start Node B (Provider)
    echo "  Starting Node B (api=9012, tcp=7000, role=provider)..."
    $NODE_BIN -config $CONFIG_DIR/node-b.json > $LOG_DIR/axl-node-b.log 2>&1 &
    echo "  Node B PID: $!"
    
    sleep 5
    
    # Verify both nodes
    echo ""
    echo "Verification:"
    curl -sf http://localhost:9002/topology > /dev/null && echo "  Node A: RUNNING (port 9002)" || echo "  Node A: FAILED"
    curl -sf http://localhost:9012/topology > /dev/null && echo "  Node B: RUNNING (port 9012)" || echo "  Node B: FAILED"
    echo ""
    echo "AXL nodes started. Logs: $LOG_DIR/axl-node-{a,b}.log"
    echo "Node A API: http://localhost:9002  |  Node B API: http://localhost:9012"
    ;;
  
  stop)
    echo "Stopping AXL nodes..."
    lsof -ti:9002 2>/dev/null | xargs -r kill 2>/dev/null || true
    lsof -ti:9012 2>/dev/null | xargs -r kill 2>/dev/null || true
    echo "AXL nodes stopped."
    ;;
    
  status)
    echo "AXL Node Status:"
    curl -sf http://localhost:9002/topology 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Node A: RUNNING (pubkey: {d["our_public_key"][:16]}...)')" 2>/dev/null || echo "  Node A: STOPPED"
    curl -sf http://localhost:9012/topology 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Node B: RUNNING (pubkey: {d["our_public_key"][:16]}...)')" 2>/dev/null || echo "  Node B: STOPPED"
    ;;
    
  test)
    echo "Testing P2P messaging (A→B)..."
    NODE_B_PUBKEY=$(curl -s http://localhost:9012/topology | python3 -c 'import sys,json; print(json.load(sys.stdin)["our_public_key"])')
    curl -s -X POST http://localhost:9002/send \
      -H "X-Destination-Peer-Id: $NODE_B_PUBKEY" \
      -H 'Content-Type: application/json' \
      -d '{"type":"ping","payload":{"msg":"test"}}' > /dev/null
    sleep 1
    RESULT=$(curl -s http://localhost:9012/recv)
    if [ -n "$RESULT" ]; then
      echo "  SUCCESS: Message received at Node B: $RESULT"
    else
      echo "  FAILED: No message received"
    fi
    ;;
    
  *)
    echo "Usage: $0 {start|stop|status|test}"
    exit 1
    ;;
esac
