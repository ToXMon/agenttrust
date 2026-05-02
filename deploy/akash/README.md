# Akash Deployment for AgentTrust

> **🟢 All services are LIVE.** See [DEPLOYED.md](./DEPLOYED.md) for live endpoints, deployment IDs, and smoke test results.

## Overview

AgentTrust uses 4 Akash containers for decentralized agent compute:

| Container | SDL File | Resources | Purpose |
|-----------|----------|-----------|--------|
| **Frontend** | `frontend-prod.yaml` | 1 CPU, 2Gi RAM, 5Gi storage | Next.js 14 dashboard (static export) |
| **Orchestrator** | `orchestrator-prod.yaml` | 2 CPU, 4Gi RAM, 10Gi storage | Agent orchestrator + cron demo scheduler |
| **AXL Node Alpha** | `axl-alpha-prod.yaml` | 1 CPU, 2Gi RAM, 5Gi storage | Researcher agent (Gensyn AXL Node 1) |
| **AXL Node Beta** | `axl-beta-prod.yaml` | 1 CPU, 2Gi RAM, 5Gi storage | Provider agent (Gensyn AXL Node 2) |

## Why Akash?

- **Separate IPs**: Gensyn AXL prize requires P2P across separate nodes (not in-process). Each Akash container gets a unique IP.
- **Decentralized**: Aligns with Ethereum ethos — agents run on decentralized infrastructure.
- **Cost**: $0 with trial credits ($100 free).
- **Custom domains**: Via Cloudflare CNAME to Akash endpoints.

## ⚠️ Critical: Funded vs Trial Deployment

| Aspect | Trial (Credit Card) | Funded (Wallet) |
--------|---------------------|------------------|
| **Max Duration** | **24 hours** | **Unlimited** |
| **Cost** | $100 free credits | Pay per block (uact) |
| **Best For** | Testing | **Production/Demo** |
| **Auto-close** | Yes, after 24h | No |

**For the hackathon demo, use FUNDED deployment.** Trial deployments auto-close after 24 hours — if a judge visits your project after that, it's down.

### How to Deploy Funded

1. Create an Akash wallet:
```bash
provider-services keys add agenttrust-wallet
```

2. Fund wallet with AKT (swap to uact via BME):
```bash
akash tx bme mint-act 5000000uakt --from agenttrust-wallet -y
```

3. Create certificate:
```bash
provider-services tx cert create client --from agenttrust-wallet
```

4. Deploy each SDL:
```bash
# Orchestrator
provider-services tx deployment create orchestrator.yaml --from agenttrust-wallet

# AXL Node Alpha
provider-services tx deployment create axl-node-alpha.yaml --from agenttrust-wallet

# AXL Node Beta
provider-services tx deployment create axl-node-beta.yaml --from agenttrust-wallet
```

5. Send manifests after lease is created:
```bash
provider-services send-manifest orchestrator.yaml \
  --dseq $DSEQ --provider $PROVIDER --from agenttrust-wallet
```

## SDL Validation

Before deploying, validate each SDL:

```bash
provider-services tx deployment create orchestrator.yaml --dry-run
provider-services tx deployment create axl-node-alpha.yaml --dry-run
provider-services tx deployment create axl-node-beta.yaml --dry-run
```

## Cloudflare CNAME Configuration

Point custom domains to Akash endpoints:

| Subdomain | Target | Purpose |
|-----------|--------|--------|
| `agentrust.xyz` | Akash Frontend URI | AgentTrust dashboard |
| `orchestrator.agenttrust.xyz` | Akash Orchestrator URI | Agent coordination API |
| `axl-alpha.agenttrust.xyz` | Akash AXL Alpha URI | Researcher AXL node |
| `axl-beta.agenttrust.xyz` | Akash AXL Beta URI | Provider AXL node |

### Cloudflare DNS Setup
1. Go to Cloudflare Dashboard → DNS → Records
2. Add CNAME record for each subdomain
3. Proxy status: DNS only (gray cloud) — Akash handles SSL
4. TTL: Auto

## Cost Analysis

| Item | Cost |
|------|------|
| 4 Akash containers (estimated) | ~$5-15/day |
| With funded wallet (AKT) | Covers full hackathon week |
| Cloudflare CNAME | $0 |
| Custom domain (agentrust.xyz) | ~$10/year |
| **Total for hackathon** | **~$0-15** |

## Troubleshooting

### Container won't start
- Check SDL syntax: `provider-services tx deployment create --dry-run`
- Verify image tags are explicit (never `:latest`)
- Check resource availability in selected placement

### Can't reach endpoint
- Verify lease is active: `provider-services query lease list --owner $ADDR --state active`
- Check Cloudflare CNAME propagation: `dig axl-alpha.agenttrust.xyz`
- Verify SDL `expose` section has `global: true`

### Trial expired (24h)
- This is expected for trial deployments
- Switch to funded deployment for demo duration
- Re-deploy with funded wallet

## References

- [Akash Docs](https://akash.network/docs/)
- [Akash SDL Reference](https://akash.network/docs/getting-started/stack-definition-language/)
- [Akash Console](https://console.akash.network/)
- [Akash CLI Installation](https://akash.network/docs/getting-started/installation/)
- [Custom Domains on Akash](https://akash.network/docs/guides/custom-domains/)
