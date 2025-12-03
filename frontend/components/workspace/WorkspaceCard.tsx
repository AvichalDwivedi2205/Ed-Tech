"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export function WorkspaceCard({ id, name, description, createdAt }: WorkspaceCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl">{name}</CardTitle>
                <CardDescription className="mt-1">
                  Created {formattedDate}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        {description && (
          <CardContent>
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {description}
            </p>
          </CardContent>
        )}
        <CardContent>
          <Link href={`/workspace/${id}`}>
            <Button variant="outline" className="w-full group">
              Open Workspace
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

