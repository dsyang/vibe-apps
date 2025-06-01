# Deployment Guide for vibe-apps

## Vercel Deployment

### Quick Deploy

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Vercel will automatically detect it's a Vite app and configure the build settings
5. Click "Deploy"

### Branch Deployments

We use the following branching strategy:

- `main` - Production branch
  - Automatically deploys to production URL
  - Requires pull request review
  - Contains stable, tested code

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