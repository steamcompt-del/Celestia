---
description: Deploy to Cloudflare Workers and Pages
---

# Deploy Workflow

// turbo-all

## Prerequisites
1. Cloudflare account with Workers & Pages enabled
2. Wrangler authenticated: `npx wrangler login`

## Deploy Worker API

1. Navigate to worker directory
```bash
cd apps/worker
```

2. Deploy to Cloudflare Workers
```bash
npx wrangler deploy
```

3. Note the worker URL from output (e.g., `https://celestia-api.your-subdomain.workers.dev`)

## Deploy Frontend to Cloudflare Pages

1. Create `.env.local` in `apps/web/` with your worker URL:
```bash
VITE_API_URL=https://celestia-api.your-subdomain.workers.dev/api
```

2. Build the frontend
```bash
cd apps/web
npm run build
```

3. Deploy to Cloudflare Pages via dashboard:
   - Go to https://dash.cloudflare.com/ -> Pages
   - Create project -> Connect Git repository
   - Or upload `dist/` folder directly

## Quick Deploy (Worker only)
```bash
npm run deploy
```

## Environment Variables for Pages
Set in Cloudflare Pages dashboard:
- `VITE_API_URL` = `https://celestia-api.your-subdomain.workers.dev/api`
