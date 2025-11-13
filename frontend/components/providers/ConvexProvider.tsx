'use client';

import { ConvexProvider as ConvexProviderBase } from 'convex/react';
import { convex } from '@/lib/convex';
import { ReactNode } from 'react';

export function ConvexProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderBase client={convex}>
      {children}
    </ConvexProviderBase>
  );
}

