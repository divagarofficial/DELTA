import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { MessagingProvider } from '@/context/MessagingContext';

export const metadata: Metadata = {
  title: 'Delta — Everything connects',
  description: 'Fast, secure, and modern messaging platform for individuals, teams, and communities.',
  manifest: '/manifest.json',
  icons: {
    icon: '/delta-logo.svg',
    shortcut: '/delta-logo.svg',
    apple: '/delta-logo.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-delta-500/20 selection:text-delta-600">
        <AuthProvider>
          <MessagingProvider>
            {children}
          </MessagingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
