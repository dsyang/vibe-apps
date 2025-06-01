# Deployment Guide for vibe-apps

## Vercel Deployment

### Environment Variables

When adding environment variables, follow these naming conventions:
- All variables must be prefixed with `VITE_` to be accessible in the frontend code
- Example: `VITE_API_URL`, `VITE_FEATURE_FLAGS`

To add environment variables:
1. Go to Project Settings > Environment Variables
2. Add variables for each environment:
   - Development (for `dev` branches)
   - Preview (for pull requests)
   - Production (for `main` branch)

### Environment Variables Configuration

The application uses the following environment variables:

```typescript
// Production
VITE_APP_NAME=Vibe Apps
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false
VITE_API_URL=https://api.production.your-domain.com
VITE_API_VERSION=v1
VITE_ENABLE_CRASH_REPORTING=true

// Preview/Staging
VITE_APP_NAME=Vibe Apps (Preview)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
VITE_API_URL=https://api.staging.your-domain.com
VITE_API_VERSION=v1
VITE_ENABLE_CRASH_REPORTING=false

// Development
VITE_APP_NAME=Vibe Apps (Dev)
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
VITE_API_URL=https://api.dev.your-domain.com
VITE_API_VERSION=v1
VITE_ENABLE_CRASH_REPORTING=false
```

Environment variables are managed in `src/config/environment.ts` with type safety.

### Branch Deployments

We use the following branching strategy:

- `main` - Production branch
  - Automatically deploys to production URL
  - Requires pull request review
  - Contains stable, tested code

- `dev/*` - Development branches
  - Gets preview deployments
  - Use for major development work
  - Example: `dev/new-authentication`

- `feature/*` - Feature branches
  - Gets preview deployments
  - Use for individual features
  - Example: `feature/user-profile`

### Deployment Process

1. **Feature Development**
   ```bash
   # Create new feature branch
   git checkout -b feature/new-feature
   
   # Make changes and commit
   git add .
   git commit -m "Add new feature"
   
   # Push to GitHub
   git push origin feature/new-feature
   ```
   - Vercel automatically creates a preview deployment
   - Preview URL will be available in GitHub PR

2. **Pull Request**
   - Create PR to `main`
   - Review preview deployment
   - Get code review
   - Merge when approved

3. **Production Deployment**
   - Merging to `main` triggers production deployment
   - Vercel automatically builds and deploys
   - Production URL updates with new changes

### Vercel Project Settings

Optimal settings for this Vite project:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "nodeVersion": "18.x"
}
```

### Monitoring & Logs

- View deployment logs: Project > Deployments > Select deployment
- Monitor performance: Project > Analytics
- Check build times: Project > Deployments > Build logs

### Rollback Process

If issues are found in production:
1. Go to Vercel Dashboard > Deployments
2. Find the last working deployment
3. Click "..." > "Promote to Production"

### Custom Domains

To add custom domains:
1. Go to Project Settings > Domains
2. Add your domain
3. Configure DNS settings as provided by Vercel
4. Wait for SSL certificate provisioning (automatic)

### Domain Configuration

#### Primary Domain Setup

1. Add domain in Vercel:
   - Go to Project Settings > Domains
   - Add your domain (e.g., `vibe-apps.com`)
   - Note the provided DNS records

2. Configure DNS at your registrar:
   ```
   # A Record
   Type: A
   Name: @
   Value: 76.76.21.21 (Vercel's IP)
   TTL: Auto/3600

   # WWW Subdomain
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   TTL: Auto/3600
   ```

#### Additional Subdomains

For staging/development environments:

```
# Staging Subdomain
Type: CNAME
Name: staging
Value: cname.vercel-dns.com

# Development Subdomain
Type: CNAME
Name: dev
Value: cname.vercel-dns.com
```

#### SSL/HTTPS

Vercel automatically provisions SSL certificates. Wait for:
1. DNS propagation (usually 0-48 hours)
2. SSL certificate issuance (usually immediate)
3. Certificate propagation (usually 0-24 hours)

## Local Preview

Test production build locally before deploying:

```bash
# Build for production
npm run build

# Preview production build
npm run preview
``` 