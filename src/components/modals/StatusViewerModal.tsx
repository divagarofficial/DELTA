'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Eye, Shield } from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { formatConversationTime, getInitials } from '@/lib/utils';
import { DeltaStatus } from '@/types';

interface StatusViewerModalProps {
  status: DeltaStatus | null;
  onClose: () => void;
}

export function StatusViewerModal({ status, onClose }: StatusViewerModalProps) {
  const { viewStatus } = useMessaging();
  const { currentUser } = useAuth();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!status) return;
    viewStatus(status.id);

    // Auto advance progress bar over 6 seconds
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 120);

    return () => clearInterval(interval);
  }, [status]);

  if (!status) return null;

  const isOwn = status.user_id === currentUser?.id;
  const user = status.user || currentUser;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div
        style={{
          backgroundColor: status.media_type === 'text' ? status.background_color || '#4F46E5' : '#0F172A',
        }}
        className="w-full max-w-sm aspect-[9/16] rounded-3xl shadow-2xl relative overflow-hidden flex flex-col justify-between text-white border border-white/10"
      >
        {/* Progress Bar Top */}
        <div className="p-3 pt-4 w-full z-20">
          <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              style={{ width: `${progress}%` }}
              className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
            />
          </div>

          {/* User info Header */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-white/20 flex items-center justify-center font-bold text-xs ring-2 ring-white/50">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(user?.display_name || 'U')
                )}
              </div>
              <div>
                <p className="font-bold text-xs leading-none drop-shadow-sm">
                  {user?.display_name}
                </p>
                <p className="text-[10px] text-white/80 mt-0.5 leading-none">
                  {formatConversationTime(status.created_at)}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Story Content Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10 relative">
          {status.media_type === 'image' && status.media_url ? (
            <div className="absolute inset-0">
              <img
                src={status.media_url}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
            </div>
          ) : (
            <p className="font-bold text-lg sm:text-xl leading-relaxed max-w-xs drop-shadow-md">
              {status.content}
            </p>
          )}

          {/* Caption if image */}
          {status.caption && status.media_type === 'image' && (
            <div className="absolute bottom-6 left-4 right-4 z-20">
              <p className="text-xs bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl text-white/90">
                {status.caption}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Receipt Bar */}
        <div className="p-4 z-20 flex items-center justify-between text-xs text-white/80 border-t border-white/10 bg-black/30 backdrop-blur-xs">
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>{status.views_count || 1} views</span>
          </div>
          <span className="text-[10px] uppercase font-semibold tracking-wider text-white/60">
            Expires in 24h
          </span>
        </div>
      </div>
    </div>
  );
}
