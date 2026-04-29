# Gensyn AXL Deep Research Report

> **Date**: 2026-04-27
> **Purpose**: Complete knowledge acquisition for Gensyn AXL integration in AgentTrust
> **Status**: CRITICAL FINDING — AXL is a Go binary, NOT a browser library

---

## Executive Summary

AXL (Agent Exchange Layer) is Gensyn's peer-to-peer encrypted mesh network for AI agent communication. It is a **Go binary** providing REST endpoints — there is **no npm package, no JS/TS SDK, no browser support**. This fundamentally changes our architecture from "client-side only" to requiring at least 2 server-side AXL nodes.

---

## 1. AXL Architecture Deep Dive

### What AXL Actually Is
- **Go binary** that runs as a network node
- Encrypted P2P mesh networking using Yggdrasil protocol
- Ed25519 identity keys (not Ethereum keys)
- Userspace networking via gVisor (no root/TUN required)
- Auto-discovery via public bootstrap peers

### 4-Layer Stack

| Layer | Port | Role |
|-------|------|------|
| HTTP API | `:9002` | REST interface for apps to interact with the node |
| Multiplexer | internal | Routes inbound messages by envelope type |
| gVisor TCP | `:7000` | Userspace networking (no root/TUN) |
| Yggdrasil Core | internal | Mesh routing, ed25519 identity, TLS peering |

### How Peering Works
1. Each node generates an ed25519 private key → derives a Peer ID
2. Node connects to Gensyn's **2 public bootstrap peers** (hardcoded)
3. Yggdrasil mesh auto-discovers all connected nodes
4. Nodes can then send messages directly to any peer by Peer ID

---

## 2. Installation & Setup

### Prerequisites
- **Go 1.25.5+** (required for build)
- OpenSSL (for key generation)
- Linux or macOS

### Build from Source
```bash
# Clone the AXL repository
git clone https://github.com/gensyn-ai/axl.git
cd axl

# Build the binary
make build
# Produces: ./node binary

# Generate ed25519 key pair
openssl genpkey -algorithm ed25519 -out private.pem
```

### Node Configuration (`node-config.json`)
```json
{
  "api_port": 9002,
  "tcp_port": 7000,
  "private_key_file": "private.pem",
  "bootstrap_peers": [
    "/ip4/.../tcp/.../p2p/<bootstrap-peer-id-1>",
    "/ip4/.../tcp/.../p2p/<bootstrap-peer-id-2>"
  ]
}
```

### Start Node
```bash
./node -config node-config.json
```

---

## 3. Running 2 Communicating Nodes

### Node A Configuration
```json
{
  "api_port": 9002,
  "tcp_port": 7000,
  "private_key_file": "private-a.pem"
}
```

### Node B Configuration (different ports on same machine)
```json
{
  "api_port": 9012,
  "tcp_port": 7010,
  "private_key_file": "private-b.pem"
}
```

### Start Both
```bash
# Terminal 1
./node -config node-a.json

# Terminal 2  
./node -config node-b.json
```

Both auto-connect to bootstrap peers and discover each other via the Yggdrasil mesh.

### Verify Connection
```bash
# Check Node A's topology
curl http://localhost:9002/topology

# Check Node B's topology
curl http://localhost:9012/topology
```

---

## 4. The 5 HTTP REST Endpoints

### 4.1. `GET /topology` — Node Info & Peer Discovery
Returns the node's identity and list of connected peers.

```bash
curl http://localhost:9002/topology
```

Response includes:
- `peer_id` — This node's ed25519-derived peer ID
- `peers` — List of connected peer IDs
- Network status information

### 4.2. `POST /send` — Send Message (Fire-and-Forget)

```bash
curl -X POST http://localhost:9002/send \
  -H "X-Destination-Peer-Id: <target-peer-id>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "service_request",
    "payload": {"service": "data-analysis", "amount": "100"}
  }'
```

**Critical**: This is **fire-and-forget** — no delivery confirmation, no ACK.

### 4.3. `GET /recv` — Poll for Inbound Messages

```bash
curl http://localhost:9002/recv
```

- Returns `204 No Content` if no messages
- Returns `200 OK` with JSON body if messages available
- Must poll repeatedly (100ms interval recommended)

### 4.4. `POST /mcp/{peer_id}/{service}` — JSON-RPC via MCP

```bash
curl -X POST http://localhost:9002/mcp/<peer-id>/<service-name> \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

For MCP (Model Context Protocol) integration with other agents.

### 4.5. `POST /a2a/{peer_id}` — JSON-RPC via A2A

```bash
curl -X POST http://localhost:9002/a2a/<peer-id> \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "message/send",
    "id": 1,
    "params": {"message": "hello"}
  }'
```

For Agent-to-Agent protocol communication.

---

## 5. TypeScript Integration Strategy

Since there's **no JS/TS SDK**, we need a thin HTTP wrapper:

```typescript
// axl/axl-client.ts

export class AXLClient {
  private readonly baseUrl: string;
  private readonly pollInterval: number;
  private polling: boolean;
  private onMessage: ((msg: any) => void) | null;

  constructor(nodeUrl: string) {
    this.baseUrl = nodeUrl; // e.g., "https://axl-node-a.agenttrust.xyz"
    this.pollInterval = 100; // 100ms polling
    this.polling = false;
    this.onMessage = null;
  }

  async getTopology() {
    const res = await fetch(`${this.baseUrl}/topology`);
    return res.json();
  }

  async send(peerId: string, message: any) {
    await fetch(`${this.baseUrl}/send`, {
      method: "POST",
      headers: {
        "X-Destination-Peer-Id": peerId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });
  }

  async recv(): Promise<any | null> {
    const res = await fetch(`${this.baseUrl}/recv`);
    if (res.status === 204) return null;
    return res.json();
  }

  startPolling(callback: (msg: any) => void) {
    this.onMessage = callback;
    this.polling = true;
    const poll = async () => {
      if (!this.polling) return;
      const msg = await this.recv();
      if (msg && this.onMessage) this.onMessage(msg);
      setTimeout(poll, this.pollInterval);
    };
    poll();
  }

  stopPolling() {
    this.polling = false;
  }
}
```

---

## 6. Live Demo Deployment Strategy

### The Problem
- AXL nodes are Go binaries — they can't run in the browser
- Our frontend is a static Next.js export (client-side only)
- Judges need to SEE two agents communicating

### Recommended Architecture

```
┌───────────────────────────────────────────────────────────┐
│                    JUDGES / BROWSER                        │
│                  (Next.js Dashboard)                       │
└──────┬───────────────────────────────┬────────────────────┘
       │                               │
       │  HTTPS                        │  HTTPS
       ▼                               ▼
┌──────────────┐               ┌──────────────┐
│  AXL Node A  │◄──── P2P ───►│  AXL Node B  │
│  (Akash/VM)  │               │  (Akash/VM)  │
│  :9002 API   │               │  :9012 API   │
│  :7000 TCP   │               │  :7010 TCP   │
└──────────────┘               └──────────────┘
       ▲                               ▲
       │         Nginx Reverse Proxy    │
       │  /api/node-a/* → localhost:9002 │
       │  /api/node-b/* → localhost:9012 │
       └─────────────────────────────────┘
```

### Option A: Single VM with 2 Nodes (Recommended for Demo)
- 1 VPS (DigitalOcean/Hetzner $5/mo, or Akash deployment)
- Run 2 AXL binaries on different ports
- Nginx reverse proxy with CORS headers
- Dashboard connects to proxy URLs

### Option B: Akash Deployment (Decentralized)
- Deploy AXL nodes as Docker containers on Akash
- Each node gets its own endpoint
- Dashboard on Vercel connects to both

### Option C: Cloudflare Tunnel (Free)
- Run AXL nodes on any machine
- Use `cloudflared tunnel` to expose API ports
- Free, works from behind NAT
- Dashboard on Vercel connects via tunnel URLs

### CORS Solution (Critical)
AXL nodes do NOT support CORS. Must use one of:
1. **Nginx reverse proxy** with `add_header Access-Control-Allow-Origin *`
2. **Cloudflare Worker** as CORS proxy
3. **Next.js API routes** as server-side proxy (requires dropping static export)

---

## 7. Gensyn Prize Requirements

### Prize Structure
- **$5,000 total pool**
- 1st Place: $2,500
- 2nd Place: $1,500
- 3rd Place: $1,000

### Requirements
- **Must use AXL for inter-agent communication** (no centralized broker)
- **Must demonstrate across SEPARATE AXL nodes** (not in-process)
- Judged on:
  - Depth of AXL integration
  - Code quality
  - Documentation
  - Working examples
  - Innovation in P2P agent communication

### What Judges Want to See
1. Two distinct AXL nodes running separately
2. Agents discovering each other via AXL
3. Meaningful message exchange (not just "hello")
4. Real P2P communication (not simulated)
5. Integration with other hackathon sponsors (ENS, Uniswap, etc.)

---

## 8. Skeleton Code Assessment & Integration Plan

### Current State

| File | Status | Action Required |
|------|--------|-----------------|
| `axl/protocol.ts` | ✅ Good | Keep message types and interfaces as-is |
| `axl/node-config.ts` | ❌ Wrong approach | Replace `AXLNode` class with `AXLClient` (HTTP wrapper) |
| `axl/message-handler.ts` | ⚠️ Structure OK | Wire up to poll `/recv` endpoint |
| `axl/trust-verify.ts` | ⚠️ Partial | Wire to on-chain data (not AXL-specific) |

### Integration Roadmap

#### Phase 1: AXL Client Library (2-3h)
- Create `axl/axl-client.ts` — HTTP wrapper for 5 endpoints
- Handle polling, message parsing, error handling
- No external dependencies needed (just fetch)

#### Phase 2: Node Deployment (2-3h)
- Build AXL Go binary from source
- Configure 2 nodes with different ports
- Set up Nginx or Cloudflare tunnel for CORS
- Verify P2P connectivity via `/topology`

#### Phase 3: Message Protocol Integration (3-4h)
- Map our `MessageType` enum to AXL `/send` payloads
- Implement message serialization/deserialization
- Add ACK layer on top of fire-and-forget `/send`
- Wire `MessageHandler` to AXL polling loop

#### Phase 4: Agent Logic (3-4h)
- Implement requester-agent flow: discover → query trust → request service
- Implement provider-agent flow: listen → verify trust → accept/reject → deliver
- Wire in ENS identity resolution
- Wire in Uniswap payment settlement

#### Phase 5: Frontend Dashboard (2-3h)
- Agent discovery panel showing AXL topology
- Live message log between agents
- Trust verification status
- Service agreement lifecycle visualization

#### Phase 6: Demo Polish (1-2h)
- Pre-warm nodes before demo
- Test full flow end-to-end
- Prepare fallback scenarios

---

## 9. Key Risks & Gotchas

### Critical Risks
1. **Fire-and-forget `/send`** — No delivery guarantee. Must build ACK layer.
2. **No store-and-forward** — Both nodes MUST be online for message delivery.
3. **No CORS support** — Must use reverse proxy or tunnel.
4. **Poll-based `/recv`** — 100ms polling loop required, not event-driven.
5. **Peer discovery latency** — Nodes may take 30-60s to discover each other. Start early.

### Gotchas
- AXL uses ed25519 keys, NOT Ethereum keys. Mapping needed.
- No message ordering guarantees.
- No built-in encryption beyond TLS transport.
- Bootstrap peers may be unstable during hackathon.
- Go binary must be compiled for target architecture.

### Mitigations
- Build ACK/resend layer for critical messages
- Start AXL nodes 5 minutes before demo
- Have backup node configs ready
- Use Nginx for CORS + rate limiting
- Test on same network first, then across internet

---

## 10. Reference Materials

### Official Resources
- **Blog Post**: https://blog.gensyn.ai/introducing-axl/
- **Documentation**: https://docs.gensyn.ai/tech/agent-exchange-layer
- **GitHub (AXL)**: https://github.com/gensyn-ai/axl
- **Demo App**: https://github.com/gensyn-ai/collaborative-autoresearch-demo
- **Gensyn GitHub**: https://github.com/gensyn-ai

### Ecosystem
- **ETHGlobal Prize Page**: https://ethglobal.com/events/openagents/prizes
- **Gensyn Ecosystem Article**: https://www.coingabbar.com/en/crypto-currency-news/gensyn-ai-token-launch-delphi-mainnet-kraken-2026

### Integration Patterns
- **Best reference**: `collaborative-autoresearch-demo` — Zero-dependency Python client
- **Pattern**: HTTP-only via `urllib.request` (Python stdlib)
- **Message protocol**: JSON via `/send`, polled via `/recv`, peer IDs from `/topology`

---

## Appendix A: AXL Node Docker Setup

```dockerfile
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git make openssl

WORKDIR /app
RUN git clone https://github.com/gensyn-ai/axl.git .
RUN make build

# Generate keys at runtime
FROM alpine:3.19
RUN apk add --no-cache openssl

COPY --from=builder /app/node /usr/local/bin/axl-node

# Entrypoint script generates keys if not present
COPY <<'EOF' /entrypoint.sh
#!/bin/sh
if [ ! -f /data/private.pem ]; then
  openssl genpkey -algorithm ed25519 -out /data/private.pem
fi
axl-node -config /config/node-config.json
EOF
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

## Appendix B: Nginx CORS Proxy Config

```nginx
server {
    listen 80;
    server_name axl.agenttrust.xyz;

    # Node A
    location /api/node-a/ {
        proxy_pass http://127.0.0.1:9002/;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers *;
        if ($request_method = OPTIONS) {
            return 204;
        }
    }

    # Node B  
    location /api/node-b/ {
        proxy_pass http://127.0.0.1:9012/;
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers *;
        if ($request_method = OPTIONS) {
            return 204;
        }
    }
}
```

## Appendix C: Cloudflare Tunnel Alternative

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# Create tunnel
cloudflared tunnel create agenttrust-axl

# Expose Node A
cloudflared tunnel route dns agenttrust-axl axl-a.agenttrust.xyz
cloudflared tunnel --url http://localhost:9002 &

# Expose Node B
cloudflared tunnel --url http://localhost:9012 &
```

Note: Cloudflare tunnel free tier adds CORS headers automatically.
