import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="p-8">
      <Skeleton className="h-8 w-64 mb-6" />
      <div className="space-y-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

