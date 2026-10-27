'use client';

import React, { useState } from 'react';
import { X, Image as ImageIcon, Type, Sparkles } from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';

interface NewStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewStatusModal({ isOpen, onClose }: NewStatusModalProps) {
  const { createStatus } = useMessaging();
  const [content, setContent] = useState('');
  const [selectedBg, setSelectedBg] = useState('#7C3AED');

  if (!isOpen) return null;

  const bgColors = ['#7C3AED', '#6D28D9', '#4C1D95', '#0F172A', '#059669', '#DC2626'];

  const handleSubmit = () => {
    if (!content.trim()) return;
    createStatus(content.trim(), undefined, 'text', selectedBg);
    setContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-bold text-sm text-foreground">Create Delta Status</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div
            style={{ backgroundColor: selectedBg }}
            className="w-full h-48 rounded-2xl p-4 flex items-center justify-center text-center transition-colors shadow-inner"
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening? (Disappears in 24 hours)"
              className="w-full bg-transparent text-white font-bold text-base placeholder:text-white/60 resize-none text-center focus:outline-none"
              rows={3}
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Select Background
            </label>
            <div className="flex items-center gap-2">
              {bgColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedBg(color)}
                  style={{ backgroundColor: color }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    selectedBg === color ? 'border-foreground scale-110' : 'border-transparent'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted rounded-xl"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className="px-4 py-1.5 text-xs font-bold bg-delta-600 text-white rounded-xl hover:bg-delta-700 disabled:opacity-50 shadow-sm"
            >
              Share Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
