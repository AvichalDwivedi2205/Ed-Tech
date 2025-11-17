'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FolderKanban,
  BookOpen,
  MessageSquare,
  Plus,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user } = useUser();
  const pathname = usePathname();

  const navItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  ];

  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-xl font-bold">OpenT</h1>
        <p className="text-sm text-gray-400 mt-1">AI Learning Platform</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-gray-800 text-white"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <UserButton />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.firstName || user?.emailAddresses[0]?.emailAddress}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

