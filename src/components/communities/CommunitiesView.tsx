'use client';

import React from 'react';
import { Users, ChevronRight, Hash } from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';

export function CommunitiesView() {
  const { communities, setActiveConversationId, setActiveTab } = useMessaging();

  return (
    <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 border-r border-border bg-card flex flex-col h-full select-none">
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-xl text-foreground tracking-tight">Communities</h1>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-4">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase px-1 tracking-wider">
          Your Communities
        </p>

        {communities.map((comm) => (
          <div
            key={comm.id}
            className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs"
          >
            <div className="p-3.5 border-b border-border bg-surface-subtle/50 dark:bg-surface-dark/50 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted shrink-0">
                <img src={comm.avatar_url || ''} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-xs text-foreground truncate">{comm.name}</h3>
                <p className="text-[11px] text-muted-foreground truncate">{comm.members_count} members</p>
              </div>
            </div>

            <div className="p-2 divide-y divide-border/40 text-xs">
              <div
                onClick={() => {
                  setActiveConversationId('conv-group-core');
                  setActiveTab('chats');
                }}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-delta-600" />
                  <span className="font-medium text-foreground">Delta Core Engineering</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
