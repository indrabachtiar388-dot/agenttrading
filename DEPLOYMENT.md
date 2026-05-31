# Deployment Guide

Complete guide for deploying the Meme Agent application to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Build Optimization](#build-optimization)
4. [Deployment Platforms](#deployment-platforms)
   - [Netlify](#netlify-deployment)
   - [Vercel](#vercel-deployment)
5. [Custom Domain Setup](#custom-domain-setup)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Post-Deployment](#post-deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- Git repository set up
- Production API keys ready
- Domain name (optional)

## Environment Variables

### Required Variables

Create a `.env.production` file or set these in your deployment platform:

```bash
# Solana Configuration
VITE_SOLANA_RPC=https://api.mainnet-beta.solana.com
VITE_HELIUS_API_KEY=your_production_helius_api_key
VITE_DEV_MODE=false

# Analytics (Optional)
VITE_GA_TRACKING_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# API Configuration
VITE_API_TIMEOUT=30000
VITE_MAX_RETRIES=3
```

### Getting API Keys

1. **Helius API Key**
   - Sign up at [helius.xyz](https://helius.xyz)
   - Create a new project
   - Copy the API key

2. **Google Analytics**
   - Go to [analytics.google.com](https://analytics.google.com)
   - Create a new property
   - Get the Measurement ID (G-XXXXXXXXXX)

3. **Sentry DSN**
   - Sign up at [sentry.io](https://sentry.io)
   - Create a new project (React)
   - Copy the DSN from project settings

---

## Build Optimization

### Local Build Test

Test the production build locally:

```bash
# Install dependencies
npm install

# Run production build
npm run build

# Preview the build
npm run preview
```

### Build Analysis

Analyze bundle size:

```bash
npm run build:analyze
```

This generates a `dist/stats.html` file showing:
- Bundle composition
- Largest dependencies
- Code splitting effectiveness

### Expected Build Output

```
dist/
├── assets/
│   ├── js/
│   │   ├── react-vendor-[hash].js
│   │   ├── solana-vendor-[hash].js
│   │   ├── icons-[hash].js
│   │   └── [name]-[hash].js
│   ├── css/
│   │   └── [name]-[hash].css
│   └── [other assets]
└── index.html
```

---

## Deployment Platforms

## Netlify Deployment

### Method 1: Deploy via Git (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Click "Deploy site"

4. **Set Environment Variables**
   - Go to Site settings → Environment variables
   - Add each variable from `.env.production`:
     ```
     VITE_SOLANA_RPC = https://api.mainnet-beta.solana.com
     VITE_HELIUS_API_KEY = your_key_here
     VITE_DEV_MODE = false
     VITE_GA_TRACKING_ID = G-XXXXXXXXXX
     VITE_SENTRY_DSN = https://xxxxx@sentry.io/xxxxx
     ```

5. **Trigger Redeploy**
   - Go to Deploys → Trigger deploy → Deploy site

### Method 2: Deploy via CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize site
netlify init

# Deploy
netlify deploy --prod
```

### Netlify Configuration

The `netlify.toml` file is already configured with:
- Build settings
- Redirect rules for SPA
- Security headers
- Cache control
- Compression settings

---

## Vercel Deployment

### Method 1: Deploy via Git (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for production deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository

3. **Configure Project**
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**
   - Add each variable from `.env.production`
   - Make sure to select "Production" environment

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete

### Method 2: Deploy via CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Vercel Configuration

The `vercel.json` file is already configured with:
- Build settings
- Security headers
- Rewrites for SPA
- Environment variable references

---

## Custom Domain Setup

### Netlify Custom Domain

1. **Add Domain**
   - Go to Site settings → Domain management
   - Click "Add custom domain"
   - Enter your domain (e.g., `memeagent.com`)

2. **Configure DNS**
   
   **Option A: Use Netlify DNS (Recommended)**
   - Click "Set up Netlify DNS"
   - Update nameservers at your domain registrar
   - Wait for DNS propagation (up to 48 hours)

   **Option B: Use External DNS**
   - Add A record: `@` → `75.2.60.5`
   - Add CNAME: `www` → `your-site.netlify.app`

3. **Enable HTTPS**
   - Netlify automatically provisions SSL certificate
   - Enable "Force HTTPS" in domain settings

### Vercel Custom Domain

1. **Add Domain**
   - Go to Project settings → Domains
   - Enter your domain
   - Click "Add"

2. **Configure DNS**
   - Add A record: `@` → `76.76.21.21`
   - Add CNAME: `www` → `cname.vercel-dns.com`

3. **SSL Certificate**
   - Automatically provisioned by Vercel
   - No additional configuration needed

### DNS Propagation Check

```bash
# Check DNS propagation
dig yourdomain.com
nslookup yourdomain.com
```

Or use online tools:
- [whatsmydns.net](https://whatsmydns.net)
- [dnschecker.org](https://dnschecker.org)

---

## CI/CD Pipeline

### GitHub Actions Setup

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
        env:
          VITE_SOLANA_RPC: ${{ secrets.VITE_SOLANA_RPC }}
          VITE_HELIUS_API_KEY: ${{ secrets.VITE_HELIUS_API_KEY }}
          VITE_DEV_MODE: false

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --prod
```

### Setting Up GitHub Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `VITE_SOLANA_RPC`
   - `VITE_HELIUS_API_KEY`
   - `VITE_GA_TRACKING_ID`
   - `VITE_SENTRY_DSN`
   - `NETLIFY_AUTH_TOKEN` (from Netlify)
   - `NETLIFY_SITE_ID` (from Netlify)

### Getting Netlify Tokens

```bash
# Get auth token
netlify login
netlify status

# Get site ID
netlify sites:list
```

---

## Post-Deployment

### Verification Checklist

- [ ] Site loads correctly
- [ ] All pages are accessible
- [ ] Wallet connection works
- [ ] Trading functionality works
- [ ] Images and assets load
- [ ] No console errors
- [ ] Analytics tracking works
- [ ] Error tracking works
- [ ] Mobile responsive
- [ ] HTTPS enabled
- [ ] Custom domain works (if configured)

### Performance Testing

1. **Google PageSpeed Insights**
   - Visit [pagespeed.web.dev](https://pagespeed.web.dev)
   - Enter your domain
   - Check scores for mobile and desktop

2. **Lighthouse Audit**
   ```bash
   # Install Lighthouse CLI
   npm install -g lighthouse
   
   # Run audit
   lighthouse https://yourdomain.com --view
   ```

3. **WebPageTest**
   - Visit [webpagetest.org](https://webpagetest.org)
   - Test from multiple locations

### Monitoring Setup

1. **Sentry Dashboard**
   - Monitor errors in real-time
   - Set up alerts for critical errors
   - Review performance metrics

2. **Google Analytics**
   - Verify tracking is working
   - Set up custom events
   - Create conversion goals

3. **Uptime Monitoring**
   - Use [UptimeRobot](https://uptimerobot.com) (free)
   - Or [Pingdom](https://pingdom.com)
   - Set up alerts for downtime

---

## Troubleshooting

### Build Failures

**Issue: "Module not found" errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Issue: "Out of memory" during build**
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Deployment Issues

**Issue: Environment variables not working**
- Ensure variables are prefixed with `VITE_`
- Redeploy after adding variables
- Check variable names match exactly

**Issue: 404 errors on page refresh**
- Verify redirect rules in `netlify.toml` or `vercel.json`
- Ensure SPA routing is configured

**Issue: Assets not loading**
- Check `base` path in `vite.config.js`
- Verify asset paths are relative
- Check CSP headers aren't blocking resources

### Performance Issues

**Issue: Slow initial load**
- Check bundle size with `npm run build:analyze`
- Ensure code splitting is working
- Verify compression is enabled

**Issue: Slow API calls**
- Use a premium RPC endpoint
- Implement request caching
- Add loading states

### Security Issues

**Issue: CSP violations**
- Check browser console for CSP errors
- Update CSP headers in `netlify.toml`
- Whitelist necessary domains

**Issue: Mixed content warnings**
- Ensure all resources use HTTPS
- Update API endpoints to HTTPS
- Check third-party scripts

---

## Rollback Procedure

### Netlify Rollback

1. Go to Deploys
2. Find the last working deployment
3. Click "Publish deploy"

### Vercel Rollback

1. Go to Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Git Rollback

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

---

## Support and Resources

- **Netlify Docs**: [docs.netlify.com](https://docs.netlify.com)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vite Docs**: [vitejs.dev](https://vitejs.dev)
- **Solana Docs**: [docs.solana.com](https://docs.solana.com)

---

## Next Steps

After successful deployment:

1. Set up monitoring and alerts
2. Configure backup strategy
3. Plan for scaling
4. Set up staging environment
5. Document incident response procedures

For questions or issues, refer to the project documentation or contact the development team.
