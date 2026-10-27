import Link from 'next/link';
import { DeltaLogoWithText } from '@/components/brand/DeltaLogo';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center select-none">
      <DeltaLogoWithText height={48} className="mb-4" />
      <h1 className="text-4xl font-extrabold text-foreground tracking-tight">404</h1>
      <p className="text-sm font-semibold text-muted-foreground mt-1 mb-6">
        This conversation or page could not be found.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-delta-600 text-white text-xs font-bold hover:bg-delta-700 shadow-sm transition-transform active:scale-95"
      >
        <ArrowLeft className="w-4 h-4" />
        Return to Delta
      </Link>
    </div>
  );
}
