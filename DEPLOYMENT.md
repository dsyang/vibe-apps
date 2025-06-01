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

### Vercel Project Settings

Optimal settings for this Vite project:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "nodeVersion": "18.x",
  "git": {
    "productionBranch": "production",
    "deploymentEnabled": {
      "production": true,
      "main": false,
      "feature/*": false
    }
  }
}
```

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