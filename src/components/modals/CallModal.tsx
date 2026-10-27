'use client';

import React, { useState, useEffect } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  Shield,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { formatDuration, getInitials } from '@/lib/utils';

export function CallModal() {
  const {
    activeCall,
    endCall,
    toggleMute,
    toggleVideo,
    isMuted,
    isVideoEnabled,
  } = useMessaging();
  const [callDuration, setCallDuration] = useState(0);

  // Timer for connected call
  useEffect(() => {
    let interval: any;
    if (activeCall?.status === 'connected') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [activeCall?.status]);

  if (!activeCall) return null;

  const partner = activeCall.receiver;
  const isVideo = activeCall.call_type === 'video';

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-surface-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden w-full max-w-lg flex flex-col relative aspect-[4/3] sm:aspect-[16/10]">
        {/* Top Header */}
        <div className="p-4 flex items-center justify-between text-white/80 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              {activeCall.status === 'ringing'
                ? 'Calling...'
                : `Connected • ${formatDuration(callDuration)}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs bg-white/10 px-2.5 py-1 rounded-full text-white/90">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>WebRTC P2P</span>
          </div>
        </div>

        {/* Center Calling Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center z-10">
          {isVideo && isVideoEnabled ? (
            <div className="relative w-full h-full rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center border border-white/10">
              {/* Simulated remote video stream */}
              <img
                src={partner?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&auto=format&fit=crop&q=80'}
                alt=""
                className="w-full h-full object-cover filter brightness-90"
              />
              {/* Picture-in-picture self camera */}
              <div className="absolute bottom-3 right-3 w-24 h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg bg-surface-dark">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80"
                  alt="You"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden ring-4 ring-delta-500/30 flex items-center justify-center bg-delta-900 text-white font-bold text-2xl shadow-xl">
                  {partner?.avatar_url ? (
                    <img
                      src={partner.avatar_url}
                      alt={partner.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    getInitials(partner?.display_name || 'U')
                  )}
                </div>
                {activeCall.status === 'ringing' && (
                  <div className="absolute inset-0 rounded-full border-2 border-delta-400 animate-ping opacity-40" />
                )}
              </div>
              <h3 className="font-bold text-lg sm:text-xl text-white">
                {partner?.display_name}
              </h3>
              <p className="text-xs text-white/60 mt-0.5">@{partner?.username}</p>
            </div>
          )}
        </div>

        {/* Bottom Call Controls */}
        <div className="p-5 bg-black/40 backdrop-blur-md flex items-center justify-center gap-4 z-10 border-t border-white/10">
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isMuted
                ? 'bg-red-500 text-white'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            aria-label="Mute"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Video Toggle Button */}
          <button
            onClick={toggleVideo}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              !isVideoEnabled
                ? 'bg-red-500 text-white'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
            title={isVideoEnabled ? 'Disable video' : 'Enable video'}
            aria-label="Toggle Video"
          >
            {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* End Call Button */}
          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90"
            title="End call"
            aria-label="End call"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
