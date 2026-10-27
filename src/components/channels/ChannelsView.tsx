'use client';

import React from 'react';
import { Radio, Check, Plus, Search, ShieldCheck } from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';

export function ChannelsView() {
  const { channels, setActiveConversationId, setActiveTab } = useMessaging();

  return (
    <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 border-r border-border bg-card flex flex-col h-full select-none">
      <div className="p-3.5 border-b border-border flex items-center justify-between">
        <h1 className="font-bold text-xl text-foreground tracking-tight">Channels</h1>
      </div>

      <div className="p-3 flex-1 overflow-y-auto space-y-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase px-1 tracking-wider">
          Official & Verified Feeds
        </p>

        {channels.map((chan) => (
          <div
            key={chan.id}
            onClick={() => {
              setActiveConversationId('conv-channel-official');
              setActiveTab('chats');
            }}
            className="flex items-start gap-3 p-2.5 rounded-xl border border-border/70 hover:bg-muted cursor-pointer transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-delta-100 dark:bg-delta-950 flex items-center justify-center text-delta-600 font-bold shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs text-foreground truncate">{chan.title}</span>
                {chan.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-delta-600 shrink-0" />
                )}
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                {chan.description}
              </p>
              <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/50 text-[10px] text-muted-foreground">
                <span>@{chan.handle}</span>
                <span className="font-semibold text-delta-600">{chan.subscribers_count} subscribers</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
