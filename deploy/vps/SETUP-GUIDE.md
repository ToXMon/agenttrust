# AXL Node VPS Deployment Guide

## Overview

Deploy 2 Gensyn AXL P2P nodes on a single VPS so they can communicate via the Yggdrasil mesh.
Both nodes on the same machine = no NAT = `/send` works = real messages flow.

## Prerequisites

- Linux VPS (Ubuntu 22.04+ recommended)
- Root or sudo access
- At least 2GB RAM (AXL nodes use ~100MB each)
- Ports 9002, 9012, 7000 available

## Quick Start (5 commands)

```bash
# 1. Create directory
mkdir -p /opt/agenttrust/axl && cd /opt/agenttrust/axl

# 2. Upload the package (scp from your machine)
# scp deploy/vps/axl-nodes-vps.tar.gz root@YOUR_VPS:/opt/agenttrust/axl/

tar xzf axl-nodes-vps.tar.gz

# 3. Fix config paths for VPS
sed -i 's|/a0/usr/projects/agentrust/axl/keys/|/opt/agenttrust/axl/keys/|g' configs/node-a.json
sed -i 's|/a0/usr/projects/agentrust/axl/keys/|/opt/agenttrust/axl/keys/|g' configs/node-b.json

# 4. Install as systemd services
bash setup-systemd.sh

# 5. Verify
bash verify.sh
```

## File Structure After Setup

```
/opt/agenttrust/axl/
├── node                    # AXL Go binary (17MB)
├── configs/
│   ├── node-a.json         # Requester node config (api_port=9002)
│   ├── node-b.json         # Provider node config (api_port=9012)
│   └── peers.json          # Peer registry
├── keys/
│   ├── private-a.pem       # Ed25519 key for Node A
│   └── private-b.pem       # Ed25519 key for Node B
├── setup-systemd.sh        # Creates systemd services
├── verify.sh               # Tests connectivity
└── status.sh               # Shows node status
```

## Architecture

```
Internet → VPS
           ├── AXL Node A (api:9002, tcp:7000)
           │     └── gVisor → Yggdrasil mesh → bootstrap peers
           ├── AXL Node B (api:9012, tcp:7000)
           │     └── gVisor → Yggdrasil mesh → bootstrap peers
           └── nginx/cloudflared → HTTPS for external access
```

Both nodes share the same OS kernel → gVisor discovers local peers → direct mesh path → `/send` works.
