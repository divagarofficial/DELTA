'use client';

import React, { useEffect } from 'react';
import { DeltaLogoWithText } from '@/components/brand/DeltaLogo';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled Delta application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none">
      <DeltaLogoWithText height={44} className="mb-4" />
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mb-6">
        An unexpected error occurred while loading this view. You can reload the workspace safely.
      </p>
      <button
        onClick={() => reset()}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-delta-600 text-white text-xs font-bold hover:bg-delta-700 shadow-sm transition-transform active:scale-95"
      >
        <RotateCcw className="w-4 h-4" />
        Retry Application
      </button>
    </div>
  );
}
