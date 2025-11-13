import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ClerkProvider } from '@clerk/nextjs'
import { ConvexProvider } from '@/components/providers/ConvexProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OpenT Agents - AI-Powered Learning',
  description: 'Generate learning roadmaps and educational content with AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ConvexProvider>
            {children}
            <Toaster />
          </ConvexProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}

