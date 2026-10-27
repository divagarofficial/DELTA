'use client';

import React, { useState, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface VoiceNotePlayerProps {
  durationSeconds?: number;
}

export function VoiceNotePlayer({ durationSeconds = 18 }: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.05;
        });
      }, 500);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  // Pseudo waveform bar heights
  const bars = [35, 60, 45, 80, 100, 75, 40, 90, 65, 30, 85, 95, 70, 50, 60, 40, 85, 35, 75, 55, 30, 45, 65, 80];

  return (
    <div className="flex items-center gap-3 py-1.5 px-2 min-w-[220px] sm:min-w-[260px] select-none">
      {/* Play/Pause Button */}
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-delta-600 text-white hover:bg-delta-700 transition-transform active:scale-95 shadow-sm shrink-0"
        aria-label={isPlaying ? 'Pause audio note' : 'Play audio note'}
      >
        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
      </button>

      {/* Waveform Visualization */}
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-center gap-[3px] h-8">
          {bars.map((height, i) => {
            const barFraction = i / bars.length;
            const isPlayed = barFraction <= progress;
            return (
              <span
                key={i}
                style={{ height: `${height}%` }}
                className={`w-1 rounded-full transition-colors duration-200 ${
                  isPlayed ? 'bg-delta-600' : 'bg-muted-foreground/30'
                }`}
              />
            );
          })}
        </div>
        <div className="flex justify-between items-center text-[10px] text-muted-foreground font-mono">
          <span>{formatDuration(progress * durationSeconds)}</span>
          <span>{formatDuration(durationSeconds)}</span>
        </div>
      </div>
    </div>
  );
}
