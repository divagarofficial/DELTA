'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile } from '@/types';
import { DEMO_PROFILES } from '@/data/mockData';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/utils';

export interface SignUpParams {
  phoneNumber: string;
  username: string;
  displayName: string;
  password?: string;
  email?: string;
}

export interface AuthContextType {
  currentUser: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  signIn: (identifier: string, password?: string) => Promise<{ error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  switchDemoUser: (userId: string) => void;
  availableDemoUsers: Profile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to retrieve custom registered profiles from localStorage
function getStoredProfiles(): Profile[] {
  if (typeof window === 'undefined') return [];
  const profiles: Profile[] = [];
  try {
    const rawIds = localStorage.getItem('delta_registered_users');
    const ids: string[] = rawIds ? JSON.parse(rawIds) : [];
    for (const id of ids) {
      const raw = localStorage.getItem(`delta_custom_profile_${id}`);
      if (raw) {
        profiles.push(JSON.parse(raw));
      }
    }
    // Also discover any legacy delta_custom_profile_* keys
    const customKeys = Object.keys(localStorage).filter((k) => k.startsWith('delta_custom_profile_'));
    for (const k of customKeys) {
      const id = k.replace('delta_custom_profile_', '');
      if (!ids.includes(id)) {
        try {
          const item = JSON.parse(localStorage.getItem(k) || '');
          if (item && item.id && !profiles.some((p) => p.id === item.id)) {
            profiles.push(item);
          }
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('Error reading stored custom profiles:', e);
  }
  return profiles;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();
  const [isDemoMode, setIsDemoMode] = useState(!isConfigured);
  const [customProfiles, setCustomProfiles] = useState<Profile[]>([]);

  // Synchronize stored custom profiles
  const refreshCustomProfiles = useCallback(() => {
    const stored = getStoredProfiles();
    setCustomProfiles(stored);
  }, []);

  useEffect(() => {
    async function initAuth() {
      refreshCustomProfiles();

      if (isConfigured) {
        const supabase = createClient();
        if (supabase) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (profile) {
                setCurrentUser(profile);
                setIsDemoMode(false);
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            console.error('Supabase session initialization error:', e);
          }
        }
      }

      // Check localStorage for persisted demo/local user session
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('delta_demo_user_id') : null;

      // If user explicitly signed out, respect their sign out
      if (storedUserId === 'signed_out') {
        setCurrentUser(null);
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }

      let found = DEMO_PROFILES.find((p) => p.id === storedUserId);

      // Check custom registered profiles from localStorage
      if (!found && storedUserId && typeof window !== 'undefined') {
        const customStored = localStorage.getItem(`delta_custom_profile_${storedUserId}`);
        if (customStored) {
          try {
            found = JSON.parse(customStored);
          } catch (e) {
            console.error('Error parsing stored profile', e);
          }
        }
      }

      if (found) {
        setCurrentUser(found);
      } else if (storedUserId === null) {
        // First-time visit: initialize with Aarav Mehta for instant demonstration
        setCurrentUser(DEMO_PROFILES[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('delta_demo_user_id', DEMO_PROFILES[0].id);
        }
      } else {
        setCurrentUser(null);
      }

      setIsDemoMode(true);
      setIsLoading(false);
    }

    initAuth();
  }, [isConfigured, refreshCustomProfiles]);

  // Combined list of demo profiles and newly registered accounts
  const availableDemoUsers = [
    ...DEMO_PROFILES,
    ...customProfiles.filter((cp) => !DEMO_PROFILES.some((dp) => dp.id === cp.id)),
  ];

  // Sign In using Mobile Number OR Username
  const signIn = async (identifier: string, password?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    const trimmed = identifier.trim();

    if (!trimmed) {
      setIsLoading(false);
      return { error: 'Please enter your mobile number or username.' };
    }

    const cleanedDigits = trimmed.replace(/\D/g, '');
    const isPhoneQuery = cleanedDigits.length >= 10;
    const cleanUsername = trimmed.toLowerCase().replace('@', '').trim();

    if (isConfigured) {
      const supabase = createClient();
      if (supabase && password) {
        try {
          // Look up user by phone or username
          let query = supabase.from('profiles').select('id, username, phone_number');
          if (isPhoneQuery) {
            query = query.ilike('phone_number', `%${cleanedDigits.slice(-10)}%`);
          } else {
            query = query.eq('username', cleanUsername);
          }
          const { data: matchedProfile, error: searchError } = await query.maybeSingle();

          if (searchError || !matchedProfile) {
            setIsLoading(false);
            return { error: 'No Delta account found with this mobile number or username.' };
          }

          // Production email-backed auth mapping
          const { data, error } = await supabase.auth.signInWithPassword({
            email: `${matchedProfile.username}@delta.app`,
            password,
          });

          if (error) {
            setIsLoading(false);
            return { error: error.message };
          }
          if (data.user) {
            const { data: fullProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
            if (fullProfile) setCurrentUser(fullProfile);
            setIsDemoMode(false);
            setIsLoading(false);
            return {};
          }
        } catch (err: any) {
          setIsLoading(false);
          return { error: err.message || 'Authentication failed.' };
        }
      }
    }

    // Local / Demo Mode verification
    const allProfiles = [
      ...DEMO_PROFILES,
      ...getStoredProfiles(),
    ];

    const match = allProfiles.find((p) => {
      // 1. Phone match
      if (isPhoneQuery && p.phone_number) {
        const profileDigits = p.phone_number.replace(/\D/g, '');
        if (profileDigits.endsWith(cleanedDigits.slice(-10))) {
          return true;
        }
      }
      // 2. Username match
      if (p.username.toLowerCase() === cleanUsername) {
        return true;
      }
      return false;
    });

    if (!match) {
      setIsLoading(false);
      return {
        error: isPhoneQuery
          ? `No Delta account found registered with mobile number "${trimmed}".`
          : `No Delta account found with username "@${cleanUsername}".`,
      };
    }

    // Password validation for custom accounts
    if (typeof window !== 'undefined') {
      const storedPwd = localStorage.getItem(`delta_user_pwd_${match.id}`);
      if (storedPwd) {
        if (!password || password !== storedPwd) {
          setIsLoading(false);
          return { error: 'Incorrect password. Please verify your credentials and try again.' };
        }
      }
    }

    setCurrentUser(match);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_demo_user_id', match.id);
    }
    setIsDemoMode(true);
    setIsLoading(false);
    return {};
  };

  // Sign Up with MANDATORY Mobile Number as Key Identity
  const signUp = async (params: SignUpParams): Promise<{ error?: string }> => {
    setIsLoading(true);
    const { phoneNumber, username, displayName, password } = params;

    // 1. Mandatory Mobile Number Validation
    if (!phoneNumber || !phoneNumber.trim()) {
      setIsLoading(false);
      return { error: 'Mobile number is mandatory. Mobile number is the key identity for Delta.' };
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      setIsLoading(false);
      return { error: 'Please enter a valid 10-digit mobile number.' };
    }

    // 2. Mandatory Username Validation
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '').trim();
    if (!cleanUsername) {
      setIsLoading(false);
      return { error: 'Username is mandatory.' };
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 25) {
      setIsLoading(false);
      return { error: 'Username must be between 3 and 25 characters.' };
    }

    // 3. Mandatory Display Name Validation
    if (!displayName || !displayName.trim()) {
      setIsLoading(false);
      return { error: 'Display name is mandatory.' };
    }

    // 4. Mandatory Password Validation
    if (!password || password.length < 6) {
      setIsLoading(false);
      return { error: 'Password is mandatory and must be at least 6 characters.' };
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const cleanedDigits = normalizedPhone.replace(/\D/g, '').slice(-10);

    // Duplicate check across all demo and custom registered profiles
    const allProfiles = [
      ...DEMO_PROFILES,
      ...getStoredProfiles(),
    ];

    const phoneExists = allProfiles.some((p) =>
      p.phone_number?.replace(/\D/g, '').endsWith(cleanedDigits)
    );
    if (phoneExists) {
      setIsLoading(false);
      return { error: `A Delta account with mobile number "${normalizedPhone}" already exists. Please sign in.` };
    }

    const usernameExists = allProfiles.some((p) => p.username.toLowerCase() === cleanUsername);
    if (usernameExists) {
      setIsLoading(false);
      return { error: `The username "@${cleanUsername}" is already taken. Please choose another.` };
    }

    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        const dummyEmail = `${cleanUsername}_${cleanedDigits}@delta.app`;
        const { data, error } = await supabase.auth.signUp({
          email: dummyEmail,
          password: password || 'DeltaPass123!',
          options: {
            data: {
              username: cleanUsername,
              display_name: displayName.trim(),
              phone_number: normalizedPhone,
            },
          },
        });
        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            username: cleanUsername,
            display_name: displayName.trim(),
            phone_number: normalizedPhone,
            avatar_url: '/delta_logo_without_text.png',
            presence_status: 'online',
          };
          setCurrentUser(newProfile);
          setIsDemoMode(false);
          setIsLoading(false);
          return {};
        }
      }
    }

    // Create persistent new local profile with mandatory mobile number
    const newUserId = `user-reg-${Date.now()}`;
    const newDemoProfile: Profile = {
      id: newUserId,
      username: cleanUsername,
      display_name: displayName.trim(),
      phone_number: normalizedPhone,
      avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      biography: 'Delta Member • Everything connects.',
      status_message: 'Hey there! I am using Delta.',
      presence_status: 'online',
      last_seen_at: new Date().toISOString(),
      privacy_last_seen: 'everyone',
      privacy_read_receipts: true,
      privacy_profile_photo: 'everyone',
    };

    if (typeof window !== 'undefined') {
      // 1. Store profile object
      localStorage.setItem(`delta_custom_profile_${newUserId}`, JSON.stringify(newDemoProfile));
      // 2. Store password for authentication
      localStorage.setItem(`delta_user_pwd_${newUserId}`, password);
      // 3. Register ID into registry list
      const existingIds: string[] = JSON.parse(localStorage.getItem('delta_registered_users') || '[]');
      if (!existingIds.includes(newUserId)) {
        existingIds.push(newUserId);
        localStorage.setItem('delta_registered_users', JSON.stringify(existingIds));
      }
      // 4. Set current session ID
      localStorage.setItem('delta_demo_user_id', newUserId);
    }

    refreshCustomProfiles();
    setCurrentUser(newDemoProfile);
    setIsDemoMode(true);
    setIsLoading(false);
    return {};
  };

  const signOut = async () => {
    setIsLoading(true);
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_demo_user_id', 'signed_out');
    }
    setCurrentUser(null);
    setIsLoading(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates, updated_at: new Date().toISOString() };
    setCurrentUser(updated);

    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        await supabase.from('profiles').update(updates).eq('id', currentUser.id);
      }
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(`delta_custom_profile_${currentUser.id}`, JSON.stringify(updated));
      refreshCustomProfiles();
    }
  };

  const switchDemoUser = (userId: string) => {
    const all = [...DEMO_PROFILES, ...customProfiles];
    const target = all.find((p) => p.id === userId);
    if (target) {
      setCurrentUser(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('delta_demo_user_id', target.id);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isConfigured,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        updateProfile,
        switchDemoUser,
        availableDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
