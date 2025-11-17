import { ConvexReactClient } from 'convex/react';

// Initialize Convex client with the deployment URL from environment variables
export const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL || ''
);
