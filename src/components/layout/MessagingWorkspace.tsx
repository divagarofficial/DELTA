'use client';

import React, { useState } from 'react';
import { NavigationRail } from './NavigationRail';
import { ConversationList } from './ConversationList';
import { ChatArea } from '@/components/chat/ChatArea';
import { ConversationDetails } from './ConversationDetails';
import { StatusView } from '@/components/status/StatusView';
import { ChannelsView } from '@/components/channels/ChannelsView';
import { CommunitiesView } from '@/components/communities/CommunitiesView';
import { CallModal } from '@/components/modals/CallModal';
import { NewChatModal } from '@/components/modals/NewChatModal';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { NewStatusModal } from '@/components/modals/NewStatusModal';
import { StatusViewerModal } from '@/components/modals/StatusViewerModal';
import { SatelliteRadarModal } from '@/components/modals/SatelliteRadarModal';
import { DeltaBusinessHub } from '@/components/business/DeltaBusinessHub';
import { useMessaging } from '@/context/MessagingContext';
import { DeltaStatus } from '@/types';

export function MessagingWorkspace() {
  const {
    activeTab,
    activeConversationId,
    setActiveConversationId,
    showSatelliteRadar,
    setShowSatelliteRadar,
  } = useMessaging();
  const [showSettings, setShowSettings] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showNewStatus, setShowNewStatus] = useState(false);
  const [viewingStatus, setViewingStatus] = useState<DeltaStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased select-none">
      {/* 1. Left Vertical Navigation Rail (Desktop) */}
      <NavigationRail onOpenSettings={() => setShowSettings(true)} />

      {/* Render Delta Business Suite or Standard Messaging View */}
      {activeTab === 'business' ? (
        <DeltaBusinessHub />
      ) : (
        <>
          {/* 2. Middle Panel: List depending on active tab */}
          <div
            className={`h-full ${
              activeConversationId ? 'hidden md:flex' : 'flex w-full md:w-auto'
            }`}
          >
            {activeTab === 'chats' && (
              <ConversationList onOpenNewChat={() => setShowNewChat(true)} />
            )}
            {activeTab === 'status' && (
              <StatusView
                onOpenNewStatus={() => setShowNewStatus(true)}
                onSelectStatus={(st) => setViewingStatus(st)}
              />
            )}
            {activeTab === 'channels' && <ChannelsView />}
            {activeTab === 'communities' && <CommunitiesView />}
          </div>

          {/* 3. Main Chat View & Details Drawer */}
          <div
            className={`flex-1 h-full flex ${
              !activeConversationId ? 'hidden md:flex' : 'flex'
            }`}
          >
            <ChatArea
              onBackMobile={() => setActiveConversationId(null)}
              onOpenDetails={() => setShowDetails(!showDetails)}
            />

            {showDetails && (
              <ConversationDetails onClose={() => setShowDetails(false)} />
            )}
          </div>
        </>
      )}

      {/* Global Modals */}
      <CallModal />
      <NewChatModal isOpen={showNewChat} onClose={() => setShowNewChat(false)} />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <NewStatusModal isOpen={showNewStatus} onClose={() => setShowNewStatus(false)} />
      <StatusViewerModal status={viewingStatus} onClose={() => setViewingStatus(null)} />
      <SatelliteRadarModal isOpen={showSatelliteRadar} onClose={() => setShowSatelliteRadar(false)} />
    </div>
  );
}
