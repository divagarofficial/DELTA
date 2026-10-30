'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause, Sparkles, Copy, Check, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { transcribeAudioVoiceNote } from '@/lib/ai/deltaAiEngine';

interface VoiceNotePlayerProps {
  durationSeconds?: number;
  isOwn?: boolean;
  senderName?: string;
  initialTranscript?: string;
}

export function VoiceNotePlayer({
  durationSeconds = 18,
  isOwn = false,
  senderName = 'Friend',
  initialTranscript,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);

  // Whisper AI Transcription State
  const [showTranscript, setShowTranscript] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptData, setTranscriptData] = useState<{
    transcript: string;
    summary: string;
    translation: string;
  } | null>(initialTranscript ? {
    transcript: initialTranscript,
    summary: 'Voice note message',
    translation: initialTranscript,
  } : null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [copied, setCopied] = useState(false);

  // Playback timer taking speed into account
  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;
    if (isPlaying) {
      const stepInterval = 400 / playbackSpeed;
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 0;
          }
          return Math.min(1, prev + 0.04);
        });
      }, stepInterval);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, playbackSpeed]);

  const toggleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (playbackSpeed === 1) setPlaybackSpeed(1.5);
    else if (playbackSpeed === 1.5) setPlaybackSpeed(2);
    else setPlaybackSpeed(1);
  };

  const handleBarClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newProgress = Math.max(0.05, (index + 1) / bars.length);
    setProgress(newProgress);
    if (!isPlaying) setIsPlaying(true);
  };

  const handleToggleTranscript = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!transcriptData && !isTranscribing) {
      setIsTranscribing(true);
      setShowTranscript(true);
      try {
        const data = await transcribeAudioVoiceNote(durationSeconds, senderName);
        setTranscriptData(data);
      } catch (err) {
        console.error('Transcription failed:', err);
      } finally {
        setIsTranscribing(false);
      }
    } else {
      setShowTranscript(!showTranscript);
    }
  };

  const handleCopyTranscript = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = showTranslation ? transcriptData?.translation : transcriptData?.transcript;
    if (text) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Modern balanced waveform visualization
  const bars = [25, 45, 65, 40, 85, 100, 70, 50, 90, 60, 35, 80, 95, 75, 45, 60, 35, 80, 55, 30, 50, 70, 85, 40];

  return (
    <div className="flex flex-col gap-1.5 py-1 px-1 min-w-[240px] sm:min-w-[280px] max-w-[340px] select-none">
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 shadow-sm shrink-0 ${
            isOwn
              ? 'bg-white text-delta-700 hover:bg-white/90 shadow-white/20'
              : 'bg-gradient-to-tr from-delta-600 to-violet-600 text-white hover:opacity-95 shadow-delta-500/25'
          }`}
          aria-label={isPlaying ? 'Pause audio note' : 'Play audio note'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current stroke-[2.5]" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5 stroke-[2.5]" />
          )}
        </button>

        {/* Waveform Visualization & Time Controls */}
        <div className="flex-1 flex flex-col gap-1.5 min-w-0">
          <div
            className="flex items-center gap-[3px] h-8 cursor-pointer group/bars"
            title="Click to seek audio"
          >
            {bars.map((height, i) => {
              const barFraction = i / bars.length;
              const isPlayed = barFraction <= progress;
              return (
                <span
                  key={i}
                  onClick={(e) => handleBarClick(i, e)}
                  style={{
                    height: `${height}%`,
                    transform: isPlaying && isPlayed ? 'scaleY(1.08)' : 'scaleY(1)',
                  }}
                  className={`w-1 rounded-full transition-all duration-150 group-hover/bars:opacity-90 ${
                    isOwn
                      ? isPlayed
                        ? 'bg-white'
                        : 'bg-white/35 hover:bg-white/50'
                      : isPlayed
                      ? 'bg-delta-600 dark:bg-delta-400'
                      : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              );
            })}
          </div>

          <div
            className={`flex justify-between items-center text-[10px] font-mono tracking-tight ${
              isOwn ? 'text-white/80' : 'text-muted-foreground'
            }`}
          >
            <span>{formatDuration(progress * durationSeconds)}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSpeed}
                title="Toggle playback speed"
                className={`px-1.5 py-0.2 rounded-md font-bold text-[10px] transition-colors ${
                  isOwn
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-muted hover:bg-muted/80 text-foreground'
                }`}
              >
                {playbackSpeed}x
              </button>

              {/* AI Whisper Transcript Trigger */}
              <button
                onClick={handleToggleTranscript}
                title="Whisper AI: Transcribe voice note"
                className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-1 transition-all ${
                  isOwn
                    ? 'bg-white/20 hover:bg-white/30 text-white'
                    : 'bg-violet-100 dark:bg-violet-950/70 text-violet-700 dark:text-violet-300 hover:bg-violet-200 border border-violet-200 dark:border-violet-900/40'
                }`}
              >
                <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" />
                <span>AI Transcript</span>
                {showTranscript ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
              </button>

              <span>{formatDuration(durationSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Whisper AI Transcript Drawer */}
      {showTranscript && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`p-2.5 rounded-xl border text-xs animate-fade-in transition-all ${
            isOwn
              ? 'bg-white/10 border-white/20 text-white'
              : 'bg-card/90 border-violet-500/25 text-foreground shadow-xs'
          }`}
        >
          {isTranscribing ? (
            <div className="flex items-center gap-2 text-[11px] py-1">
              <span className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span>Whisper AI transcribing audio in real time...</span>
            </div>
          ) : transcriptData ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1">
                <span className="font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {showTranslation ? 'English Translation' : 'Whisper Audio Transcript'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className="hover:underline flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted/50"
                    title={showTranslation ? 'Show Original' : 'Translate to English'}
                  >
                    <Globe className="w-2.5 h-2.5" />
                    <span>{showTranslation ? 'Original' : 'Translate'}</span>
                  </button>
                  <button
                    onClick={handleCopyTranscript}
                    className="hover:underline flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-muted/50"
                    title="Copy transcript"
                  >
                    {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <p className="text-[11px] font-medium leading-relaxed italic">
                &ldquo;{showTranslation ? transcriptData.translation : transcriptData.transcript}&rdquo;
              </p>

              {transcriptData.summary && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 rounded-lg px-2 py-1 flex items-center gap-1">
                  <span>🎯 Takeaway:</span>
                  <span className="font-normal text-foreground">{transcriptData.summary}</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
