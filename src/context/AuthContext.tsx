'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Profile } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/utils';
import { hashPassword } from '@/lib/security';

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
  isDemoMode: false;
  signIn: (identifier: string, password?: string) => Promise<{ error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  switchAccount: (userId: string) => void;
  switchDemoUser: (userId: string) => void;
  registeredUsers: Profile[];
  availableDemoUsers: Profile[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to retrieve registered profiles from local storage
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
    console.error('Error reading registered profiles:', e);
  }
  return profiles;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isConfigured = isSupabaseConfigured();

  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [customProfiles, setCustomProfiles] = useState<Profile[]>([]);

  // Synchronize stored registered profiles
  const refreshCustomProfiles = useCallback(() => {
    const stored = getStoredProfiles();
    setCustomProfiles(stored);
    return stored;
  }, []);

  useEffect(() => {
    async function initAuth() {
      const stored = getStoredProfiles();
      setCustomProfiles(stored);

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
                setIsLoading(false);
                return;
              }
            }
          } catch (e) {
            console.warn('Supabase session initialization note:', e);
          }
        }
      }

      // Check localStorage for persisted user session
      const storedUserId = typeof window !== 'undefined'
        ? (localStorage.getItem('delta_session_user_id') || localStorage.getItem('delta_demo_user_id'))
        : null;

      // If user explicitly signed out, respect their sign out
      if (storedUserId === 'signed_out') {
        setCurrentUser(null);
        setIsLoading(false);
        return;
      }

      // Discover user from registered profiles
      let found: Profile | undefined = stored.find((p) => p.id === storedUserId);

      // Check registered profiles directly from localStorage
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
      } else {
        setCurrentUser(null);
      }

      setIsLoading(false);
    }

    initAuth();
  }, [isConfigured]);

  // Registered accounts
  const registeredUsers = customProfiles;
  const availableDemoUsers = customProfiles;

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
          // Look up user by phone or username in Supabase
          let query = supabase.from('profiles').select('id, username, phone_number');
          if (isPhoneQuery) {
            query = query.ilike('phone_number', `%${cleanedDigits.slice(-10)}%`);
          } else {
            query = query.eq('username', cleanUsername);
          }
          const { data: matchedProfile, error: searchError } = await query.maybeSingle();

          if (!searchError && matchedProfile) {
            // Production email-backed auth mapping
            const { data, error } = await supabase.auth.signInWithPassword({
              email: `${matchedProfile.username}@delta.app`,
              password,
            });

            if (!error && data.user) {
              const { data: fullProfile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();
              if (fullProfile) setCurrentUser(fullProfile);
              setIsLoading(false);
              return {};
            }
          }
        } catch (err: any) {
          console.warn('Supabase authentication check bypassed, checking registered profiles:', err);
        }
      }
    }

    // Local / Registered Profiles verification
    const allProfiles = getStoredProfiles();

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

    // Password validation for custom accounts with SHA-256 verification
    if (typeof window !== 'undefined') {
      const storedPwd = localStorage.getItem(`delta_user_pwd_${match.id}`);
      if (storedPwd) {
        const hashedAttempt = await hashPassword(password || '');
        if (password !== storedPwd && hashedAttempt !== storedPwd) {
          setIsLoading(false);
          return { error: 'Incorrect password. Please verify your credentials and try again.' };
        }
      }
    }

    setCurrentUser(match);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_session_user_id', match.id);
      localStorage.removeItem('delta_demo_user_id');
    }
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

    // Duplicate check across registered profiles
    const allProfiles = getStoredProfiles();

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
        try {
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
          if (!error && data?.user) {
            const newProfile: Profile = {
              id: data.user.id,
              username: cleanUsername,
              display_name: displayName.trim(),
              phone_number: normalizedPhone,
              avatar_url: '/delta_logo_without_text.png',
              presence_status: 'online',
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem(`delta_custom_profile_${data.user.id}`, JSON.stringify(newProfile));
              localStorage.setItem('delta_session_user_id', data.user.id);
              localStorage.removeItem('delta_demo_user_id');
            }
            refreshCustomProfiles();
            setCurrentUser(newProfile);
            setIsLoading(false);
            return {};
          }
        } catch (supabaseErr) {
          console.warn('Supabase sign up warning, proceeding with local profile creation:', supabaseErr);
        }
      }
    }

    // Create persistent new local profile with mandatory mobile number
    const newUserId = `user-reg-${Date.now()}`;
    const newProfile: Profile = {
      id: newUserId,
      username: cleanUsername,
      display_name: displayName.trim(),
      phone_number: normalizedPhone,
      avatar_url: '/delta_logo_without_text.png',
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
      localStorage.setItem(`delta_custom_profile_${newUserId}`, JSON.stringify(newProfile));
      // 2. Store cryptographically hashed password for secure authentication
      const secureHashed = await hashPassword(password);
      localStorage.setItem(`delta_user_pwd_${newUserId}`, secureHashed);
      // 3. Register ID into registry list
      const existingIds: string[] = JSON.parse(localStorage.getItem('delta_registered_users') || '[]');
      if (!existingIds.includes(newUserId)) {
        existingIds.push(newUserId);
        localStorage.setItem('delta_registered_users', JSON.stringify(existingIds));
      }
      // 4. Set current session ID
      localStorage.setItem('delta_session_user_id', newUserId);
      localStorage.removeItem('delta_demo_user_id');
    }

    refreshCustomProfiles();
    setCurrentUser(newProfile);
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
      localStorage.setItem('delta_session_user_id', 'signed_out');
      localStorage.removeItem('delta_demo_user_id');
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

  const switchAccount = (userId: string) => {
    const target = customProfiles.find((p) => p.id === userId);
    if (target) {
      setCurrentUser(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('delta_session_user_id', target.id);
        localStorage.removeItem('delta_demo_user_id');
      }
    }
  };

  const switchDemoUser = switchAccount;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isConfigured,
        isDemoMode: false,
        signIn,
        signUp,
        signOut,
        updateProfile,
        switchAccount,
        switchDemoUser,
        registeredUsers,
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
