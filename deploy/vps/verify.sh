#!/bin/bash
# ── AgentTrust AXL Node Verification ──────────────────────
# Run after setup to verify both nodes are running and can communicate.
set -e

echo "=== Service Status ==="
systemctl is-active axl-node-a axl-node-b

echo ""
echo "=== Node A Topology (port 9002) ==="
TOPO_A=$(curl -sf --max-time 5 'http://localhost:9002/topology')
echo "$TOPO_A" | python3 -m json.tool 2>/dev/null | head -20
echo ""
PEER_ID_A=$(echo "$TOPO_A" | python3 -c 'import sys,json; print(json.load(sys.stdin)["our_public_key"])' 2>/dev/null)
echo "Node A Peer ID: $PEER_ID_A"

echo ""
echo "=== Node B Topology (port 9012) ==="
TOPO_B=$(curl -sf --max-time 5 'http://localhost:9012/topology')
echo "$TOPO_B" | python3 -m json.tool 2>/dev/null | head -20
echo ""
PEER_ID_B=$(echo "$TOPO_B" | python3 -c 'import sys,json; print(json.load(sys.stdin)["our_public_key"])' 2>/dev/null)
echo "Node B Peer ID: $PEER_ID_B"

echo ""
echo "=== Testing /send (Node A → Node B) ==="
RESULT=$(curl -sf --max-time 10 -X POST 'http://localhost:9002/send' \
  -H 'Content-Type: application/json' \
  -H "X-Destination-Peer-Id: $PEER_ID_B" \
  -d '{"type":"ping","from":"verify-script"}' \
  -w '\nHTTP_CODE:%{http_code} SENT_BYTES:%{header_json}' 2>&1)

echo "$RESULT"

echo ""
echo "=== Checking /recv on Node B ==="
RECV=$(curl -sf --max-time 5 'http://localhost:9012/recv' -w '\nHTTP_CODE:%{http_code}' 2>&1)
echo "$RECV"

echo ""
echo "=== DONE ==="
if echo "$RESULT" | grep -q 'HTTP_CODE:200'; then
  echo "✅ /send WORKS! Real P2P messaging is functional."
  echo ""
  echo "Node A Peer ID: $PEER_ID_A"
  echo "Node B Peer ID: $PEER_ID_B"
  echo ""
  echo "These peer IDs need to go into the AgentTrust .env file:"
  echo "  AXL_NODE_A_PEER_ID=$PEER_ID_A"
  echo "  AXL_NODE_B_PEER_ID=$PEER_ID_B"
else
  echo "❌ /send failed. Nodes may need more time to discover each other."
  echo "   Wait 30s and run this script again."
fi
