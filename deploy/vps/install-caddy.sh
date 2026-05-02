#!/bin/bash
# ── Install Caddy reverse proxy for HTTPS AXL access ──────────
# Caddy provides automatic HTTPS via Let's Encrypt
set -e

DOMAIN_A=${1:-axl-a.agentrust.xyz}
DOMAIN_B=${2:-axl-b.agentrust.xyz}
EMAIL=${3:-admin@agentrust.xyz}

echo "=== Installing Caddy ==="
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
if [ ! -f /etc/apt/sources.list.d/caddy-stable.list ]; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
fi
apt-get install -y caddy

echo "=== Configuring Caddy for AXL nodes ==="
cat > /etc/caddy/Caddyfile << CADDYEOF
${DOMAIN_A} {
  reverse_proxy localhost:9002
}

${DOMAIN_B} {
  reverse_proxy localhost:9012
}
CADDYEOF

echo "Caddyfile written:"
cat /etc/caddy/Caddyfile

echo ""
echo "=== Restarting Caddy ==="
systemctl restart caddy
systemctl enable caddy
sleep 3
systemctl status caddy --no-pager -l | head -15

echo ""
echo "=== DONE ==="
echo "AXL Node A: https://${DOMAIN_A}/topology"
echo "AXL Node B: https://${DOMAIN_B}/topology"
echo ""
echo "Test with:"
echo "  curl -sf https://${DOMAIN_A}/topology | python3 -m json.tool | head -10"
echo "  curl -sf https://${DOMAIN_B}/topology | python3 -m json.tool | head -10"
