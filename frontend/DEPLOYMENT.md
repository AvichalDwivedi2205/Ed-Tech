# Vercel Deployment Guide

This guide will help you deploy the OpenT frontend to Vercel.

## Prerequisites

- A Vercel account (sign up at [vercel.com](https://vercel.com))
- Your Convex deployment URL (get it from [Convex Dashboard](https://dashboard.convex.dev))
- Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Quick Deployment Steps

### 1. Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. **Important:** Set the **Root Directory** to `frontend`
   - Click **"Edit"** next to Root Directory
   - Enter: `frontend`
   - Click **"Continue"**

### 2. Configure Environment Variables

1. In the project settings, go to **"Environment Variables"**
2. Add the following variable:
   - **Name:** `NEXT_PUBLIC_CONVEX_URL`
   - **Value:** Your Convex deployment URL (e.g., `https://your-deployment.convex.cloud`)
   - **Environment:** Production, Preview, and Development (select all)

### 3. Configure Build Settings

Vercel should auto-detect Next.js, but verify these settings:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (or `pnpm build` if using pnpm)
- **Output Directory:** `.next` (auto-detected)
- **Install Command:** `npm install` (or `pnpm install`)

### 4. Deploy

1. Click **"Deploy"**
2. Wait for the build to complete
3. Your app will be live at `https://your-project.vercel.app`

## Environment Variables

The frontend only requires **one environment variable**:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | `https://your-deployment.convex.cloud` |

## Troubleshooting

### Build Fails

- **Error:** "Cannot find module 'convex/_generated/api'"
  - **Solution:** Make sure the Root Directory is set to `frontend` in Vercel settings

- **Error:** "Missing NEXT_PUBLIC_CONVEX_URL"
  - **Solution:** Add the environment variable in Vercel project settings

### Runtime Errors

- **Convex connection fails:**
  - Verify `NEXT_PUBLIC_CONVEX_URL` is set correctly
  - Check that your Convex deployment is active
  - Ensure CORS is configured in Convex (should be automatic)

## Custom Domain

1. Go to your project settings → **Domains**
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

## Continuous Deployment

Vercel automatically deploys:
- **Production:** Every push to your main/master branch
- **Preview:** Every push to other branches (creates preview URLs)

## Notes

- The backend is already hosted on Convex, so no backend deployment is needed
- Only the frontend needs to be deployed to Vercel
- Environment variables are automatically injected at build time for `NEXT_PUBLIC_*` variables
