'use client';

import { ClerkProvider as ClerkProviderBase } from '@clerk/nextjs';
import { ReactNode } from 'react';

interface ClerkProviderWrapperProps {
  children: ReactNode;
}

export function ClerkProviderWrapper({ children }: ClerkProviderWrapperProps) {
  return (
    <ClerkProviderBase
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ''}
    >
      {children}
    </ClerkProviderBase>
  );
}




