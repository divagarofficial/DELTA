'use client';

import React from 'react';
import { Plus, CircleDot, Eye } from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { getInitials, formatConversationTime } from '@/lib/utils';
import { DeltaStatus } from '@/types';

interface StatusViewProps {
  onOpenNewStatus: () => void;
  onSelectStatus: (status: DeltaStatus) => void;
}

export function StatusView({ onOpenNewStatus, onSelectStatus }: StatusViewProps) {
  const { statuses } = useMessaging();
  const { currentUser } = useAuth();

  const myStatus = statuses.find((s) => s.user_id === currentUser?.id);
  const othersStatuses = statuses.filter((s) => s.user_id !== currentUser?.id);
  const unviewedStatuses = othersStatuses.filter((s) => !s.has_viewed);
  const viewedStatuses = othersStatuses.filter((s) => s.has_viewed);

  return (
    <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 border-r border-border bg-card flex flex-col h-full select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-xl text-foreground tracking-tight">Status</h1>
        <button
          onClick={onOpenNewStatus}
          className="w-9 h-9 rounded-xl flex items-center justify-center bg-delta-600 text-white hover:bg-delta-700 transition-colors shadow-sm"
          title="Add status update"
        >
          <Plus className="w-5 h-5 stroke-[2.2]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* My Status */}
        <div>
          <div
            onClick={() => (myStatus ? onSelectStatus(myStatus) : onOpenNewStatus())}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs ring-2 ring-delta-500">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  getInitials(currentUser?.display_name || 'U')
                )}
              </div>
              {!myStatus && (
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-delta-600 text-white flex items-center justify-center ring-2 ring-card">
                  <Plus className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-xs text-foreground">My Status</p>
              <p className="text-[11px] text-muted-foreground truncate">
                {myStatus ? formatConversationTime(myStatus.created_at) : 'Tap to add status update'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Updates */}
        {unviewedStatuses.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider">
              Recent Updates
            </p>
            <div className="space-y-1">
              {unviewedStatuses.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onSelectStatus(st)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs ring-2 ring-delta-600 shrink-0">
                    {st.user?.avatar_url ? (
                      <img src={st.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(st.user?.display_name || 'U')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {st.user?.display_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {formatConversationTime(st.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Viewed Updates */}
        {viewedStatuses.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 mb-1.5 tracking-wider">
              Viewed Updates
            </p>
            <div className="space-y-1 opacity-75">
              {viewedStatuses.map((st) => (
                <div
                  key={st.id}
                  onClick={() => onSelectStatus(st)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs ring-2 ring-muted-foreground/30 shrink-0">
                    {st.user?.avatar_url ? (
                      <img src={st.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(st.user?.display_name || 'U')
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {st.user?.display_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {formatConversationTime(st.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
