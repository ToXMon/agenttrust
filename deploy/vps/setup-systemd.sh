#!/bin/bash
# ── AgentTrust AXL Node Systemd Setup ──────────────────────
# Run as root on VPS. Creates systemd services for both AXL nodes.
set -e

AXL_DIR="/opt/agenttrust/axl"

# ── Node A (Requester) Service ─────────────────────────────────
cat > /etc/systemd/system/axl-node-a.service << 'EOF'
[Unit]
Description=AgentTrust AXL Node A (Requester)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/agenttrust/axl
ExecStart=/opt/agenttrust/axl/node --config /opt/agenttrust/axl/configs/node-a.json
Restart=always
RestartSec=5
LimitNOFILE=65535

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=axl-node-a

[Install]
WantedBy=multi-user.target
EOF

# ── Node B (Provider) Service ──────────────────────────────────
cat > /etc/systemd/system/axl-node-b.service << 'EOF'
[Unit]
Description=AgentTrust AXL Node B (Provider)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/agenttrust/axl
ExecStart=/opt/agenttrust/axl/node --config /opt/agenttrust/axl/configs/node-b.json
Restart=always
RestartSec=5
LimitNOFILE=65535

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=axl-node-b

[Install]
WantedBy=multi-user.target
EOF

# ── Enable and start ────────────────────────────────────────────
echo "Reloading systemd..."
systemctl daemon-reload

echo "Enabling services..."
systemctl enable axl-node-a axl-node-b

echo "Starting AXL Node A..."
systemctl start axl-node-a
sleep 5

echo "Starting AXL Node B..."
systemctl start axl-node-b
sleep 5

echo ""
echo "=== Service Status ==="
systemctl status axl-node-a --no-pager -l | head -15
echo ""
systemctl status axl-node-b --no-pager -l | head -15
