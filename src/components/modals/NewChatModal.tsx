'use client';

import React, { useState } from 'react';
import { X, Search, Users, MessageSquare, Check, Sparkles } from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { DEMO_PROFILES } from '@/data/mockData';
import { getInitials } from '@/lib/utils';
import { Profile } from '@/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const { createConversation } = useMessaging();
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'direct' | 'group'>('direct');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  if (!isOpen) return null;

  // Filter other profiles (excluding current user)
  const candidateUsers = DEMO_PROFILES.filter((p) => p.id !== currentUser?.id);
  const filteredUsers = candidateUsers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.phone_number || '').includes(q)
    );
  });

  const handleStartDirect = (user: Profile) => {
    createConversation(user.id);
    onClose();
  };

  const handleToggleMember = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateGroup = () => {
    if (!groupTitle.trim() || selectedUserIds.length === 0) return;
    createConversation(selectedUserIds[0], groupTitle.trim(), true);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('direct')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'direct'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Direct Message
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'group'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              New Group
            </button>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 1: Direct Message */}
        {activeTab === 'direct' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-3 border-b border-border">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or @username..."
                  className="w-full bg-muted text-foreground placeholder:text-muted-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-delta-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 py-1">
                Registered Contacts
              </p>
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleStartDirect(user)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted cursor-pointer transition-colors"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-xs shrink-0">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      getInitials(user.display_name)
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-foreground truncate">
                      {user.display_name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      @{user.username} • {user.status_message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: New Group */}
        {activeTab === 'group' && (
          <div className="flex-1 flex flex-col min-h-0 p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="e.g. Bangalore Hackathon Team"
                className="w-full bg-muted text-foreground text-xs px-3 py-2 rounded-xl border border-transparent focus:border-border focus:bg-background focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Add Participants ({selectedUserIds.length} selected)
              </label>
              <div className="max-h-48 overflow-y-auto divide-y divide-border/40 border border-border rounded-xl p-1 bg-surface-subtle/40 dark:bg-surface-dark/40">
                {candidateUsers.map((user) => {
                  const isChecked = selectedUserIds.includes(user.id);
                  return (
                    <div
                      key={user.id}
                      onClick={() => handleToggleMember(user.id)}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center font-bold text-[10px] shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            getInitials(user.display_name)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs text-foreground truncate">
                            {user.display_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                          isChecked
                            ? 'bg-delta-600 border-delta-600 text-white'
                            : 'border-muted-foreground/40'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={!groupTitle.trim() || selectedUserIds.length === 0}
                className="px-4 py-2 text-xs font-bold bg-delta-600 text-white hover:bg-delta-700 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
              >
                Create Group
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
