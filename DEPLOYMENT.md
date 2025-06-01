# Deployment Guide for vibe-apps

## Vercel Deployment

### Production Deployment Configuration

The application is configured to only deploy to production when changes are pushed to the `production` branch.

1. Go to [Vercel](https://vercel.com)
2. Import your repository
3. In Project Settings > Git:
   - Set Production Branch to: `production`
   - Disable auto-deployment for other branches
4. Click "Save"

### Branch Strategy

- `production` - Production branch
  - Only branch that deploys to production URL
  - Requires pull request review
  - Contains stable, tested code

- `main` - Development branch
  - Main development branch
  - No automatic deployments
  - Used for feature integration

- `feature/*` - Feature branches
  - Created from `main`
  - No automatic deployments
  - Merge to `main` first, then to `production`

### Deployment Process

1. **Feature Development**
   ```bash
   # Create new feature branch from main
   git checkout main
   git checkout -b feature/new-feature
   
   # Make changes and commit
   git add .
   git commit -m "Add new feature"
   
   # Push to GitHub
   git push origin feature/new-feature
   ```

2. **Integration to Main**
   - Create PR from `feature/new-feature` to `main`
   - Get code review
   - Merge when approved

3. **Production Deployment**
   ```bash
   # After feature is tested in main
   git checkout production
   git merge main
   git push origin production
   ```
   - Vercel automatically deploys to production
   - Production URL updates with new changes

### Vercel Project Configuration

Vercel automatically detects and configures optimal settings for Vite projects. However, you can customize these settings if needed:

1. Go to your project's Settings in the Vercel dashboard
2. Under "Build & Development Settings":
   - Framework Preset: Vite
   - Build Command: `npm run build` (or your custom build command)
   - Output Directory: `dist` (default for Vite)
   - Install Command: `npm install` (or your package manager's install command)

For most Vite projects, the automatic configuration will work without any changes. If you need to override these settings, use the Vercel dashboard rather than manual JSON configuration.

### Custom Domains

To add custom domains:
1. Go to Project Settings > Domains
2. Add your domain
3. Configure DNS settings as provided by Vercel
4. Wait for SSL certificate provisioning (automatic)

## Local Preview

Test production build locally before deploying:

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Local CLI Deployment

You can deploy directly from your local machine using the Vercel CLI:

### Setup

1. Install Vercel CLI locally:
   ```bash
   npm install -D vercel
   ```

2. Login and link your project:
   ```bash
   # Login to Vercel
   npx vercel login

   # Link your project
   npx vercel link

   # Pull environment variables
   npx vercel env pull .env.local
   ```

### Deployment Commands

1. **Local Development**
   ```bash
   # Start local development server with Vercel features
   npx vercel dev
   ```

2. **Preview Deployment**
   ```bash
   # Deploy to preview environment
   npx vercel

   # Deploy to specific environment (if you have custom environments)
   npx vercel deploy --target=environment-name
   ```

3. **Production Deployment**
   ```bash
   # Deploy to production
   npx vercel --prod
   ```

Each preview deployment will get a unique URL for testing. Production deployments will update your production domain if the deployment is successful. 