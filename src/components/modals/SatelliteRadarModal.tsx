'use client';

import React, { useState, useEffect } from 'react';
import {
  Satellite,
  Radio,
  WifiOff,
  ShieldCheck,
  CheckCircle2,
  X,
  Compass,
  ArrowUpRight,
  Globe2,
  Zap,
  Sparkles,
  Signal,
  RotateCcw,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { callAudio } from '@/lib/callAudio';

interface SatelliteRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SatelliteRadarModal({ isOpen, onClose }: SatelliteRadarModalProps) {
  const { isSatelliteMode, toggleSatelliteMode, satelliteTelemetry } = useMessaging();
  const [radarAngle, setRadarAngle] = useState(0);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  // Animate rotating radar sweep
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setRadarAngle((prev) => (prev + 3) % 360);
    }, 30);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestPing = () => {
    setIsPinging(true);
    setPingResult(null);
    callAudio.playSatelliteUplinkTone();

    setTimeout(() => {
      setIsPinging(false);
      setPingResult(`✓ Uplink Confirmed via ${satelliteTelemetry.satellite_id} (RTT: ${satelliteTelemetry.latency_ms}ms)`);
    }, 1200);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0a0e17] text-white border border-indigo-500/30 rounded-3xl shadow-2xl p-6 relative overflow-hidden flex flex-col items-center text-center"
      >
        {/* Subtle background starfield & glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Satellite className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                <span>Satellite Direct-to-Cell</span>
                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  3GPP NTN
                </span>
              </h3>
              <p className="text-[10px] text-white/60">Low Earth Orbit Direct Uplink Protocol</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Sky Radar Alignment Compass */}
        <div className="relative my-6 w-56 h-56 flex items-center justify-center">
          {/* Outer Compass Degree Ring */}
          <div className="absolute inset-0 rounded-full border border-indigo-500/30 flex items-center justify-center">
            <span className="absolute top-1 text-[10px] font-mono text-indigo-400 font-bold">N (0°)</span>
            <span className="absolute right-2 text-[10px] font-mono text-white/40">E (90°)</span>
            <span className="absolute bottom-1 text-[10px] font-mono text-white/40">S (180°)</span>
            <span className="absolute left-2 text-[10px] font-mono text-white/40">W (270°)</span>
          </div>

          {/* Inner concentric distance rings */}
          <div className="w-40 h-40 rounded-full border border-indigo-500/20 flex items-center justify-center" />
          <div className="w-24 h-24 rounded-full border border-indigo-500/30 flex items-center justify-center" />

          {/* Sweeping Radar Line */}
          <div
            style={{ transform: `rotate(${radarAngle}deg)` }}
            className="absolute inset-0 pointer-events-none flex items-center justify-center"
          >
            <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-indigo-500 to-cyan-400 origin-left self-center shadow-[0_0_12px_#38bdf8]" />
          </div>

          {/* Satellite Target Position Reticle */}
          <div
            style={{
              transform: `translate(${Math.cos((satelliteTelemetry.azimuth_deg * Math.PI) / 180) * 65}px, ${
                Math.sin((satelliteTelemetry.azimuth_deg * Math.PI) / 180) * 65
              }px)`,
            }}
            className="absolute z-20 flex flex-col items-center pointer-events-none transition-transform"
          >
            <div className="w-6 h-6 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center shadow-[0_0_15px_#10b981] animate-ping" />
            <div className="w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-emerald-300 absolute top-1.5 shadow-[0_0_10px_#10b981]" />
            <span className="text-[9px] font-mono text-emerald-300 font-bold mt-1 bg-black/60 px-1 rounded">
              {satelliteTelemetry.satellite_id}
            </span>
          </div>

          {/* Center Device Crosshair */}
          <div className="w-6 h-6 rounded-full bg-indigo-600/40 border border-indigo-400 flex items-center justify-center z-10 shadow-lg">
            <Radio className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
          </div>
        </div>

        {/* Alignment Status Banner */}
        <div className="w-full bg-indigo-950/50 border border-indigo-500/30 rounded-2xl p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-left">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white leading-tight">
                Direct Satellite Link: Active
              </p>
              <p className="text-[10px] text-white/70 leading-tight mt-0.5">
                Pointed at {satelliteTelemetry.satellite_id} • Elevation: {satelliteTelemetry.elevation_deg}°
              </p>
            </div>
          </div>

          {/* Toggle Satellite Mode Switch */}
          <button
            onClick={toggleSatelliteMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-sm ${
              isSatelliteMode
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-black shadow-emerald-500/20'
                : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            }`}
          >
            {isSatelliteMode ? 'Mode: ACTIVE' : 'Enable Satellite'}
          </button>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 w-full text-left text-xs mb-4">
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-semibold">Constellation</span>
            <span className="font-bold text-white text-xs mt-0.5 truncate">
              {satelliteTelemetry.constellation}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-semibold">Uplink Latency</span>
            <span className="font-bold text-cyan-400 font-mono text-xs mt-0.5">
              ~{satelliteTelemetry.latency_ms} ms (Orbital)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-semibold">Ground Internet</span>
            <span className="font-bold text-emerald-400 text-xs mt-0.5 flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Bypassed (Zero Towers)
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col">
            <span className="text-[10px] text-white/50 uppercase font-semibold">Payload Compression</span>
            <span className="font-bold text-violet-400 text-xs mt-0.5">
              3GPP Short-Burst Data
            </span>
          </div>
        </div>

        {/* Ping Test Button & Result */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={handleTestPing}
            disabled={isPinging}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Beaming uplink to satellite...' : 'Beam Test Ping to Orbit'}</span>
          </button>

          {pingResult && (
            <p className="text-[11px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 p-2 rounded-xl animate-fade-in font-bold">
              {pingResult}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
