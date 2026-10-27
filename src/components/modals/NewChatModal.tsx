'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Search,
  Users,
  MessageSquare,
  Check,
  Smartphone,
  Upload,
  UserPlus,
  RefreshCw,
  Share2,
  ExternalLink,
  Phone,
  Sparkles,
} from 'lucide-react';
import { useMessaging } from '@/context/MessagingContext';
import { useAuth } from '@/context/AuthContext';
import { getInitials } from '@/lib/utils';
import { Profile, SyncedPhoneContact } from '@/types';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewChatModal({ isOpen, onClose }: NewChatModalProps) {
  const {
    createConversation,
    syncedContacts,
    syncDeviceContacts,
    importContactsFromFile,
    addContactByPhone,
    isContactsPickerSupported,
  } = useMessaging();
  const { currentUser, availableDemoUsers } = useAuth();

  const [activeTab, setActiveTab] = useState<'direct' | 'group' | 'contacts'>('contacts');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Phone Contact sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState('');
  const [showAddContactForm, setShowAddContactForm] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Filter other profiles (including registered users)
  const candidateUsers = availableDemoUsers.filter((p) => p.id !== currentUser?.id);
  const filteredUsers = candidateUsers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      (p.phone_number || '').includes(q)
    );
  });

  // Filtered phone contacts
  const filteredContacts = syncedContacts.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone_number.includes(q) ||
      (c.delta_profile?.username || '').toLowerCase().includes(q)
    );
  });

  const contactsOnDelta = filteredContacts.filter((c) => c.is_on_delta && c.delta_user_id !== currentUser?.id);
  const contactsToInvite = filteredContacts.filter((c) => !c.is_on_delta);

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

  // Sync phone contacts handler
  const handleSyncContacts = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('');
    try {
      const res = await syncDeviceContacts();
      if (res.success) {
        setSyncStatusMsg(`✓ Synced ${res.count} contacts from address book.`);
      } else {
        setSyncStatusMsg(res.error || 'Could not sync contacts.');
      }
    } catch (e: any) {
      setSyncStatusMsg(e.message || 'Error syncing contacts.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(''), 4000);
    }
  };

  // Import vCard/CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const type = file.name.endsWith('.csv') ? 'csv' : 'vcf';
    const res = await importContactsFromFile(text, type);
    setSyncStatusMsg(`✓ Imported ${res.count} contacts (${res.matched} on Delta).`);
    setTimeout(() => setSyncStatusMsg(''), 4000);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Add individual contact by phone
  const handleAddIndividualContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactPhone.trim()) return;

    const res = await addContactByPhone(newContactName || 'Friend', newContactPhone);
    if (res.matchedUser) {
      setSyncStatusMsg(`✓ Added! "${res.matchedUser.display_name}" is on Delta!`);
    } else {
      setSyncStatusMsg(`✓ Added "${newContactName || newContactPhone}" to phone contacts.`);
    }
    setNewContactName('');
    setNewContactPhone('');
    setShowAddContactForm(false);
    setTimeout(() => setSyncStatusMsg(''), 4000);
  };

  // Invite via Web Share API or sms: protocol
  const handleInviteContact = (contact: SyncedPhoneContact) => {
    const inviteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://delta.app';
    const shareText = `Hey ${contact.name}! I'm using Delta for fast, secure messaging. Connect with me here: ${inviteUrl}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'Join me on Delta',
        text: shareText,
        url: inviteUrl,
      }).catch(() => {});
    } else if (typeof window !== 'undefined') {
      window.open(`sms:${contact.phone_number}?body=${encodeURIComponent(shareText)}`, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-fade-in">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header with 3 Tabs */}
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-xl text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'contacts'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-delta-600" />
              Phone Contacts ({syncedContacts.length})
            </button>

            <button
              onClick={() => setActiveTab('direct')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
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
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab 2: Direct Message */}
        {activeTab === 'direct' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Info notice showing auto-sync is active */}
            <div className="bg-muted/40 border-b border-border px-4 py-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-delta-600 shrink-0" />
                <span>Phone contacts are automatically synchronized in background.</span>
              </div>
              <button
                onClick={() => setActiveTab('contacts')}
                className="font-bold text-delta-600 hover:underline shrink-0"
              >
                View Phone Contacts &rarr;
              </button>
            </div>

            <div className="p-3 border-b border-border">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, @username, or phone number..."
                  className="w-full bg-muted text-foreground placeholder:text-muted-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-delta-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 py-1">
                Registered Delta Users ({filteredUsers.length})
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
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-xs text-foreground truncate">
                        {user.display_name}
                      </p>
                      {user.phone_number && (
                        <span className="text-[10px] text-delta-600 font-mono font-medium">
                          {user.phone_number}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">
                      @{user.username} • {user.status_message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 1: Phone Contacts (Auto-Synced with Device Address Book) */}
        {activeTab === 'contacts' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Automatic Phone Sync Status & Quick Tools */}
            <div className="px-3.5 py-2.5 border-b border-border bg-delta-50/50 dark:bg-delta-950/30 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[11px] font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Auto-Synced with Phone</span>
                </div>
                <button
                  onClick={handleSyncContacts}
                  disabled={isSyncing}
                  title="Check for newly added phone contacts"
                  aria-label="Sync Phone Contacts"
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Import contacts from .vcf or .csv address book"
                  className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground text-xs font-semibold hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Import .vcf / .csv</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".vcf,.csv,text/vcard,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => setShowAddContactForm((prev) => !prev)}
                  className="px-2.5 py-1 rounded-lg bg-delta-600 text-white text-xs font-bold hover:bg-delta-700 transition-colors flex items-center gap-1 shadow-xs"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{showAddContactForm ? 'Close' : 'Add Number'}</span>
                </button>
              </div>
            </div>

            {/* Sync Feedback Alert */}
            {syncStatusMsg && (
              <div className="bg-delta-100 dark:bg-delta-950 border-b border-delta-200 dark:border-delta-800 px-4 py-2 text-xs font-semibold text-delta-800 dark:text-delta-200 animate-fade-in flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-delta-600 shrink-0" />
                <span>{syncStatusMsg}</span>
              </div>
            )}

            {/* Add Contact Inline Form */}
            {showAddContactForm && (
              <form onSubmit={handleAddIndividualContact} className="p-3 border-b border-border bg-muted/40 space-y-2 text-xs animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Contact Name (e.g. Ramesh)"
                    className="bg-card text-foreground px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-delta-500"
                  />
                  <input
                    type="tel"
                    required
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    placeholder="Mobile Number (+91 ...)"
                    className="bg-card text-foreground px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-delta-500 font-mono"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddContactForm(false)}
                    className="px-3 py-1 rounded-lg text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded-lg bg-delta-600 text-white font-bold hover:bg-delta-700"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            )}

            {/* Search Filter */}
            <div className="p-3 border-b border-border">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter synced contacts by name or phone..."
                  className="w-full bg-muted text-foreground placeholder:text-muted-foreground text-xs pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-delta-500"
                />
              </div>
            </div>

            {/* Contacts Lists */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
              {/* 1. Contacts on Delta */}
              <div>
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <p className="text-[11px] font-bold text-delta-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Contacts on Delta ({contactsOnDelta.length})
                  </p>
                  <span className="text-[10px] text-muted-foreground font-medium">Ready to chat</span>
                </div>

                <div className="space-y-1">
                  {contactsOnDelta.map((c) => {
                    const profile = c.delta_profile;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-border/50 bg-card hover:bg-muted/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-delta-100 dark:bg-delta-950 text-delta-700 dark:text-delta-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              getInitials(c.name)
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-xs text-foreground truncate">{c.name}</p>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-delta-100 text-delta-800 dark:bg-delta-950 dark:text-delta-300 shrink-0">
                                On Delta
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono truncate">
                              {c.phone_number} {profile ? `• @${profile.username}` : ''}
                            </p>
                          </div>
                        </div>

                        <button
                          data-testid={`message-contact-${c.delta_user_id}`}
                          aria-label={`Message ${c.name}`}
                          onClick={() => {
                            if (c.delta_user_id) {
                              createConversation(c.delta_user_id);
                              onClose();
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-delta-600 text-white text-xs font-bold hover:bg-delta-700 transition-colors shrink-0 ml-2 shadow-xs"
                        >
                          Message
                        </button>
                      </div>
                    );
                  })}
                  {contactsOnDelta.length === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2 py-1">
                      No matching contacts on Delta found for this filter.
                    </p>
                  )}
                </div>
              </div>

              {/* 2. Contacts to Invite */}
              <div>
                <div className="flex items-center justify-between px-2 py-1 mb-1 border-t border-border/40 pt-3">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Invite to Delta ({contactsToInvite.length})
                  </p>
                  <span className="text-[10px] text-muted-foreground font-medium">Not on Delta yet</span>
                </div>

                <div className="space-y-1">
                  {contactsToInvite.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-[11px] text-muted-foreground shrink-0">
                          {getInitials(c.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs text-foreground truncate">{c.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono truncate">{c.phone_number}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleInviteContact(c)}
                        className="px-3 py-1 rounded-lg border border-delta-300 dark:border-delta-800 text-delta-600 dark:text-delta-400 text-xs font-semibold hover:bg-delta-50 dark:hover:bg-delta-950 transition-colors shrink-0 ml-2 flex items-center gap-1"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Invite</span>
                      </button>
                    </div>
                  ))}
                  {contactsToInvite.length === 0 && (
                    <p className="text-xs text-muted-foreground italic px-2 py-1">
                      All synced contacts are registered on Delta!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: New Group */}
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
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {user.phone_number || `@${user.username}`}
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
