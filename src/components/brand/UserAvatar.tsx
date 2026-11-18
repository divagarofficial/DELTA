'use client';

import React, { useState } from 'react';
import { getFirstLetter, getAvatarStyle } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showOnline?: boolean;
  isOnline?: boolean;
  isAi?: boolean;
  alt?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-14 h-14 text-lg',
  '2xl': 'w-20 h-20 text-2xl',
};

const dotSizeClasses = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
  '2xl': 'w-5 h-5',
};

export function UserAvatar({
  name = 'User',
  avatarUrl,
  size = 'md',
  className = '',
  showOnline = false,
  isOnline = false,
  isAi = false,
  alt,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const firstLetter = getFirstLetter(name);
  const avatarStyle = getAvatarStyle(name);

  const hasValidImage = Boolean(avatarUrl && !imgError && avatarUrl.trim().length > 0);

  return (
    <div className={`relative shrink-0 select-none ${sizeClasses[size]} ${className}`}>
      <div
        style={!hasValidImage ? avatarStyle : undefined}
        className={`w-full h-full rounded-full overflow-hidden flex items-center justify-center font-extrabold uppercase shadow-2xs transition-transform duration-150 ${
          hasValidImage ? 'bg-muted' : ''
        } ${isAi ? 'ring-2 ring-violet-500/50' : 'ring-1 ring-border/80'}`}
      >
        {hasValidImage ? (
          <img
            src={avatarUrl!}
            alt={alt || name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : isAi ? (
          <div className="w-full h-full bg-gradient-to-tr from-violet-600 via-fuchsia-600 to-amber-400 flex items-center justify-center text-white shadow-inner">
            <Sparkles className="w-1/2 h-1/2" />
          </div>
        ) : (
          <span className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)] tracking-wider">
            {firstLetter}
          </span>
        )}
      </div>

      {/* Online presence dot */}
      {showOnline && isOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dotSizeClasses[size]} bg-emerald-500 rounded-full ring-2 ring-card shadow-xs animate-pulse`}
          title="Online"
        />
      )}
    </div>
  );
}
