"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Calendar } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export function WorkspaceCard({ id, name, description, createdAt }: WorkspaceCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.01 }}
    >
      <Card className="group h-full overflow-hidden border-slate-200/80 bg-white/80 backdrop-blur-sm transition-all hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 dark:border-slate-700/80 dark:bg-slate-800/80 dark:hover:border-blue-600">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/25 transition-transform group-hover:scale-105">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                {name}
              </CardTitle>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        {description && (
          <CardContent className="pt-0 pb-3">
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {description}
            </p>
          </CardContent>
        )}
        <CardContent className="pt-0">
          <Link href={`/workspace/${id}`}>
            <Button 
              variant="outline" 
              className="w-full group/btn border-slate-200 bg-slate-50/50 transition-all hover:border-blue-400 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-500 dark:hover:bg-blue-900/20"
            >
              <span>Open Workspace</span>
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

