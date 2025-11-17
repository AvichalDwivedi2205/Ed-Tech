'use client';

import { useUser } from '@clerk/nextjs';
import { redirect, usePathname } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { Skeleton } from '@/components/ui/skeleton';

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();
  const isChatPage = pathname?.includes('/chat');

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      redirect('/sign-in');
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  // Chat page doesn't need sidebar
  if (isChatPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Suspense fallback={<Skeleton className="h-screen" />}>
          {children}
        </Suspense>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<Skeleton className="h-screen" />}>
      <DashboardContent>{children}</DashboardContent>
    </Suspense>
  );
}




