# Deployment Guide

## Deploy to Vercel

### Prerequisites

- Vercel account (free at https://vercel.com)
- GitHub account with repository pushed
- Node.js 14+ installed locally

### Step 1: Push to GitHub

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Connect to Vercel

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select your GitHub repository
4. Vercel will auto-detect the configuration

### Step 3: Configuration

The `vercel.json` file is already configured:

```json
{
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "framework": "static"
}
```

This tells Vercel to:
- Run `npm run build` (minified production build)
- Serve files from `dist/` directory
- Treat as static site (no server)

### Step 4: Deploy

Click "Deploy" button. Vercel will:

1. Install dependencies (`npm install`)
2. Run build command (`npm run build`)
3. Deploy `dist/` folder to CDN
4. Provide you with a URL

### After Deployment

Your app will be available at:
- **Preview URL:** `https://your-project-name.vercel.app`
- **Production URL:** `https://your-custom-domain.com` (if configured)

## Verify Deployment

1. Visit your Vercel URL
2. Open DevTools (F12)
3. Check Network tab - should load bundled files from `/dist/`
4. Check Console for any errors

## Troubleshooting

### Error: No Output Directory named "public"

**Solution:** Already fixed! `vercel.json` specifies `dist` as output.

### Error: Build failed

Check build logs in Vercel dashboard. Common causes:
- Missing dependencies: Run `npm install` locally
- Import errors: Check relative paths
- Font paths: Should use relative URLs (already fixed in `typography.css`)

### Error: Service Worker not found

Ensure `dist/sw.js` exists after build:
```bash
npm run build
ls dist/sw.js
```

### App loads but looks broken

1. Check if bundled CSS is loading:
   - DevTools → Network tab
   - Should see `layx.bundle.css` and `chat-app.bundle.css`
2. Check console for 404 errors on resources
3. Verify fonts are loading from `/dist/assets/font/`

## Environment Variables

If you need environment variables:

1. In Vercel dashboard, go to Project Settings
2. Environment Variables section
3. Add your variables (e.g., API keys)
4. Redeploy

## Domain Configuration

To use a custom domain:

1. Go to Project Settings → Domains
2. Add your domain
3. Update DNS records (instructions provided by Vercel)
4. Wait for DNS propagation (up to 48 hours)

## Performance Optimization

Vercel automatically provides:
- ✅ CDN distribution globally
- ✅ Gzip compression
- ✅ Edge caching
- ✅ Automatic HTTPS

Your bundled files are already optimized:
- Production: 77.4 KB (minified)
- With gzip: ~25-30 KB
- Load time: <1 second globally

## Rollback

To rollback to a previous version:

1. In Vercel dashboard, go to Deployments
2. Find the deployment you want
3. Click "Promote to Production"

## Local Testing

Test production build locally before deploying:

```bash
npm run build
npx serve dist
```

Then visit `http://localhost:3000`

## CI/CD

Vercel automatically deploys on:
- Push to main branch
- Pull requests (preview deployment)
- Manual redeploy from dashboard

## Additional Resources

- [Vercel Docs](https://vercel.com/docs)
- [Static Site Configuration](https://vercel.com/docs/projects/project-configuration#framework-preset)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
