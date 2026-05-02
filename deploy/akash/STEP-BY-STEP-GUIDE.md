# 🚀 AgentTrust Akash Deployment Guide

> **For non-developers.** Follow these steps in order. Take your time. Each step builds on the last.

---

## What You're Doing

You have 4 Docker images (pre-built, already on GitHub):
1. **Frontend** — The website dashboard (Next.js)
2. **AXL Alpha** — The requester agent node
3. **AXL Beta** — The provider agent node
4. **Orchestrator** — Agent coordination service

You'll deploy each one to Akash (decentralized cloud), then wire them together.

**Think of it like:** Renting 4 virtual computers on a decentralized cloud, each running one piece of your app.

---

## Before You Start — What You Need

### ✅ You need:
- A web browser (Chrome, Firefox, etc.)
- A GitHub account
- A credit card (Akash offers $100 free trial credits)
- 30-45 minutes of focused time

### ❌ You do NOT need:
- Command line / terminal skills
- Docker installed
- Crypto wallets (for trial)
- Programming knowledge

---

## Step 1: Access Akash Console

1. Open your browser and go to: **https://console.akash.network**
2. Click **"Sign In"** (top right)
3. Sign in with your **GitHub account**
4. You'll see the Akash Dashboard

### 💰 Getting Credits

- New users get **$100 free credits** (trial)
- Trial deployments last **24 hours** (you can redeploy)
- For the hackathon demo, 24 hours is plenty
- If you need longer, you can add a credit card

> **⚠️ Important:** Trial deployments auto-close after 24 hours. If your demo is tomorrow, deploy tomorrow morning.

---

## Step 2: Make Docker Images Public

Your images are on GitHub Container Registry (GHCR). They're probably private by default.

1. Go to: **https://github.com/ToXMon?tab=packages**
2. You'll see 4 packages (agentrust-frontend, agentrust-axl-alpha, etc.)
3. For EACH package:
   a. Click on the package name
   b. Click **"Package settings"** (right sidebar)
   c. Scroll to **"Danger Zone"** → **"Change visibility"**
   d. Click **"Change visibility"** → Select **"Public"**
   e. Type the package name to confirm

> **Why?** Akash needs to pull these images. Private images = deployment failure.

---

## Step 3: Deploy the Frontend (First!)

This is your website. Deploy it first so you have a URL to work with.

### 3.1 Create a New Deployment

1. In Akash Console, click **"Deploy"** (top right) or go to **"Create Deployment"**
2. You'll see an SDL editor (text box with YAML code)

### 3.2 Paste the Frontend SDL

1. Open this file from the repo: `deploy/akash/frontend.yaml`
2. **Copy ALL the text** and paste it into the Akash SDL editor
3. **Replace everything** in the editor with the pasted text

The SDL should look like:
```yaml
version: "2.0"
services:
  frontend:
    image: ghcr.io/toxmon/agentrust-frontend:v0.1.0
    env:
      - NEXT_PUBLIC_CHAIN_ID=8453
      ...
```

### 3.3 Review and Deploy

1. Click **"Create Deployment"**
2. Akash will show you the cost estimate (should be very cheap, ~$0.10-0.50/day)
3. Accept the cost
4. Wait for the deployment to be **"Active"** (usually 1-3 minutes)

### 3.4 Get Your Frontend URL

Once active:
1. Click on your deployment
2. Look for the **"Leases"** tab
3. Click the lease to see details
4. You'll see a **URI** like: `https://abc123.provider.akashian.io`
5. **WRITE THIS DOWN** — this is your frontend URL!

### 3.5 Test It

1. Open the URI in a new browser tab
2. You should see the AgentTrust dashboard
3. If you see "Application error" or blank page, see **Troubleshooting** below

---

## Step 4: Deploy AXL Node Alpha (Requester)

This is the agent that sends requests.

### 4.1 Create Another Deployment

1. Go back to Akash Console
2. Click **"Create Deployment"** again (new deployment)
3. Paste the content of `deploy/akash/axl-node-alpha.yaml`

### 4.2 Wait for Active

Same as before — wait 1-3 minutes for "Active" status.

### 4.3 Note the Alpha URI

1. Open the lease details
2. Copy the **URI** — this is your Alpha node endpoint
3. **WRITE THIS DOWN** — you'll need it for:
   - The frontend's `AXL_NODE_A_URL` setting
   - Node Beta's peer configuration
   - ENS text records

---

## Step 5: Deploy AXL Node Beta (Provider)

This is the agent that provides services.

### 5.1 Create Another Deployment

1. **"Create Deployment"** again
2. Paste `deploy/akash/axl-node-beta.yaml`

### 5.2 Note the Beta URI

Same as Alpha — write down the URI.

---

## Step 6: Update the Frontend (Connect to AXL Nodes)

Now you have URIs for both AXL nodes. Update the frontend to connect.

### 6.1 Update the Deployment (keeps the same URI!)

**⚠️ Do NOT close/delete your deployment.** That gives you a new URI and breaks everything (ENS records, wiring, etc.).

Instead, use Akash's **"Update"** feature:

1. Go to your **frontend deployment** in Akash Console
2. Click **"Update"** (or the pencil/edit icon on your deployment)
3. The SDL editor opens with your current YAML
4. Find these two lines:
```yaml
- AXL_NODE_A_URL=http://localhost:9002
- AXL_NODE_B_URL=http://localhost:9012
```
5. Replace `localhost:9002` with your **Alpha URI** and `localhost:9012` with your **Beta URI**

**Example:**
```yaml
- AXL_NODE_A_URL=https://abc123.provider.akashian.io
- AXL_NODE_B_URL=https://def456.provider.akashian.io
```

6. Click **"Update Deployment"** or **"Accept"**
7. Wait 1-2 minutes — the deployment restarts with the new env vars
8. **Your URI stays exactly the same!** The container just restarts with new settings.

### 6.2 Verify

1. Open your frontend URI (same one as before)
2. Go to the **Messages** page
3. You should see the AXL connection status update

> **Why not close and redeploy?** Closing = new URI = you'd have to update ENS records, reconnect everything, and start over. Update = same URI, just new settings. Much easier.

> **Same principle applies to ALL services:** If you ever need to change env vars, use "Update" — never close and redeploy.

---

## Step 7: Update ENS Records with Live URIs

Your ENS records currently point to `localhost`. Update them to the live Akash URIs.

### 7.1 Run the ENS Update Script

This needs to run from a terminal. If you have the repo cloned locally:

```bash
# Set the live URIs as environment variables
export FRONTEND_URL="https://YOUR_FRONTEND_URI"
export AXL_ALPHA_ENDPOINT="axl://YOUR_ALPHA_URI:9002"
export AXL_BETA_ENDPOINT="axl://YOUR_BETA_URI:9012"

# Run the ENS setup script
npx tsx scripts/setup-ens-production.ts
```

### 7.2 If You Don't Have a Terminal

Ask the AI assistant (me) to run this for you. Just provide the 3 URIs.

---

## Step 8: Deploy the Orchestrator (Optional)

The orchestrator coordinates between agents. It's optional for the demo.

1. **"Create Deployment"**
2. Paste `deploy/akash/orchestrator.yaml`
3. Update the AXL URLs in the env vars (same as Step 6)
4. Deploy

---

## ✅ Verification Checklist

After everything is deployed, check each item:

| # | Check | How to Verify |
|---|-------|---------------|
| 1 | Frontend loads | Open frontend URI → see dashboard |
| 2 | Agent cards show | /agents page shows ENS data |
| 3 | Trust scores visible | /trust page shows scores |
| 4 | AXL nodes connected | /messages page shows node status |
| 5 | ENS records live | Visit basescan.org, search agentrust.base.eth |
| 6 | Demo flow works | REGISTER → DISCOVER → NEGOTIATE → ESCROW → EXECUTE → VERIFY → SETTLE |

---

## 🔧 Troubleshooting Common Errors

### Error: "Image pull failed" / "Image not found"

**What it means:** Akash can't access your Docker image.

**Fix:**
1. Go to https://github.com/ToXMon?tab=packages
2. Check each package is set to **Public** (not Private)
3. Redeploy after changing visibility

**Verify:** Open `https://ghcr.io/toxmon/agentrust-frontend:v0.1.0` in browser — should not show 401/403.

---

### Error: "Application error" on frontend

**What it means:** The Next.js app crashed on startup.

**Fix:**
1. Check the deployment logs in Akash Console ("Logs" tab)
2. Common causes:
   - Missing env var → add it to the SDL env section
   - `NEXT_PUBLIC_` vars missing → ensure all are in the SDL
3. All required env vars:
```
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_AGENT_REGISTRY=0xc44cC67485A6A5AB46978752789954a8Ae845eeA
NEXT_PUBLIC_SERVICE_AGREEMENT=0x109bA5eDd23c247771F2FcD7572E8334278dBE81
NEXT_PUBLIC_TRUST_NFT=0x0374f7516E57e778573B2e90E6D7113b8253FF5C
NEXT_PUBLIC_ENS_BASENAME=agentrust.base.eth
NEXT_PUBLIC_BLOCK_EXPLORER=https://basescan.org
```

---

### Error: Deployment stuck in "Pending" / "Unfulfilled"

**What it means:** No Akash provider accepted your deployment (price too low or resources unavailable).

**Fix:**
1. Try increasing the price in the SDL:
```yaml
pricing:
  frontend:
    denom: uact
    amount: 5000  # was 1000, try higher
```
2. Try reducing resources:
```yaml
resources:
  cpu:
    units: 0.5  # smaller = cheaper = more likely accepted
  memory:
    size: 512Mi  # was 1Gi, try smaller
```
3. Redeploy with the updated SDL

---

### Error: AXL nodes not communicating

**What it means:** The two AXL nodes can't find each other.

**Fix:**
1. Check that both nodes are deployed and Active
2. The nodes use Gensyn's bootstrap peers for discovery:
   - `tls://34.46.48.224:9001`
   - `tls://136.111.135.206:9001`
3. If nodes still can't connect, update their configs to reference each other's Akash URIs
4. This requires rebuilding the Docker images with updated configs — ask the AI assistant for help

---

### Error: "Insufficient funds" / "Out of credits"

**What it means:** Your trial credits ran out.

**Fix:**
1. Add a credit card in Akash Console → Billing
2. Or close old deployments and create new ones
3. Check your spending in the Billing section

---

### Error: Deployment disappeared after 24 hours

**What it means:** Trial deployments auto-close after 24 hours.

**Fix:**
1. This is normal for trial accounts
2. Just redeploy with the same SDL
3. For persistent deployments, add a credit card

---

### Error: Frontend shows data but AXL messages don't work

**What it means:** Frontend can't reach the AXL nodes.

**Fix:**
1. Check that `AXL_NODE_A_URL` and `AXL_NODE_B_URL` in the SDL point to the correct Akash URIs
2. Test: Open `https://YOUR_ALPHA_URI/topology` in browser — should return JSON
3. If you get a connection error, the AXL node might not be running — check its logs

---

### Error: ENS names don't resolve on the frontend

**What it means:** The frontend can't read ENS text records from Base Mainnet.

**Fix:**
1. The frontend uses the public RPC `https://mainnet.base.org` which can be rate-limited
2. Try a paid RPC like Alchemy or Infura for better reliability
3. Or add a retry mechanism in the frontend code
4. Verify records exist: `npx tsx scripts/check-ens.ts`

---

## 📞 Getting Help

If you're stuck:

1. **Check the logs first** — Akash Console → Your Deployment → "Logs" tab
2. **Ask the AI assistant** — paste the error message and we'll fix it together
3. **Akash Discord** — https://discord.gg/akash — community support
4. **Akash Docs** — https://akash.network/docs/

---

## 🗺️ Quick Reference: Your Deployment URLs

Fill this in as you deploy:

```
Frontend URL:     https://_________________________
AXL Alpha URL:    https://_________________________
AXL Beta URL:     https://_________________________
Orchestrator URL: https://_________________________
```

---

## 📋 Summary: Deploy Order

```
1. Make GHCR packages public  ←── Do this FIRST
2. Deploy Frontend           ←── Get the URL
3. Deploy AXL Alpha           ←── Get the URL  
4. Deploy AXL Beta            ←── Get the URL
5. Update Frontend SDL        ←── Add AXL URLs, redeploy
6. Update ENS records         ←── Set live endpoints
7. (Optional) Deploy Orchestrator
8. Verify everything works
```

You got this! 🎉
