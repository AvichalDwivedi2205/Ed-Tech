# Convex Authentication Issue - Root Cause & Solution

## The Problem

You're getting **401 Unauthorized** when calling Convex HTTP API from your FastAPI backend.

## Root Cause

**Convex Python SDK (`ConvexClient`) is designed for frontend use with Clerk authentication**, not for server-side calls with deploy keys.

For **server-side calls from FastAPI**, you need to use the **Convex HTTP API** directly with proper authentication.

## The Solution

You have two options:

### Option 1: Use HTTP API with Deploy Key (Recommended for Backend)

The Convex HTTP API requires the deploy key to be sent in a specific format. Based on Convex documentation, the authentication header should be:

```
Authorization: Convex <deploy_key>
```

NOT `Bearer <deploy_key>`

### Option 2: Use Clerk JWT Tokens (Better for Production)

For production, you should pass Clerk JWT tokens from the frontend to your FastAPI backend, then use those tokens to authenticate with Convex.

## What You Need to Do

### Step 1: Update `.env` file

Make sure your `.env` file has:
```bash
CONVEX_URL=https://quaint-vulture-736.convex.cloud
CONVEX_DEPLOY_KEY_ED_TECH=dev:quaint-vulture-736|eyJ2MiI6IjdlMmM5ZDUxYjRlNTQwYjA4MTE3YTFlNDMyMWNmNzQ0In0=
```

### Step 2: Fix Authentication Header Format

The HTTP API client needs to use `Convex` prefix instead of `Bearer`:

```python
headers["Authorization"] = f"Convex {self.deploy_key}"
```

### Step 3: Verify Deploy Key Format

Your deploy key should be in format: `dev:deployment-name|token`

## Current Status

- ✅ Code structure is correct
- ✅ Function names match
- ✅ HTTP API endpoint format is correct
- ❌ Authentication header format needs fixing

## Next Steps

1. Update the authentication header to use `Convex` prefix
2. Verify deploy key is in `.env` file
3. Test again

