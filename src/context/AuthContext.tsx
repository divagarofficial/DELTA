'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '@/types';
import { DEMO_PROFILES } from '@/data/mockData';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { normalizePhoneNumber, isValidPhoneNumber } from '@/lib/utils';

interface SignUpParams {
  phoneNumber: string;
  username: string;
  displayName: string;
  password?: string;
  email?: string;
}

interface AuthContextType {
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isConfigured = isSupabaseConfigured();
  const [isDemoMode, setIsDemoMode] = useState(!isConfigured);

  useEffect(() => {
    async function initAuth() {
      if (isConfigured) {
        const supabase = createClient();
        if (supabase) {
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
        }
      }

      // Check localStorage for persisted demo user
      const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('delta_demo_user_id') : null;
      let found = DEMO_PROFILES.find((p) => p.id === storedUserId);

      // Check custom registered demo profiles from localStorage
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

      setCurrentUser(found || DEMO_PROFILES[0]);
      setIsDemoMode(true);
      setIsLoading(false);
    }

    initAuth();
  }, [isConfigured]);

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
    const cleanUsername = trimmed.toLowerCase().replace('@', '');

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

          // In production with email-backed auth:
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

    // Demo Mode: match by mobile number digits or username
    // Also include any custom registered demo profiles stored locally
    let allProfiles = [...DEMO_PROFILES];
    if (typeof window !== 'undefined') {
      const customKeys = Object.keys(localStorage).filter((k) => k.startsWith('delta_custom_profile_'));
      for (const k of customKeys) {
        try {
          const item = JSON.parse(localStorage.getItem(k) || '');
          if (item && item.id) allProfiles.push(item);
        } catch (e) {}
      }
    }

    const match = allProfiles.find((p) => {
      // Check phone match
      if (isPhoneQuery && p.phone_number) {
        const profileDigits = p.phone_number.replace(/\D/g, '');
        if (profileDigits.endsWith(cleanedDigits.slice(-10))) {
          return true;
        }
      }
      // Check username match
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
    if (!username || !username.trim()) {
      setIsLoading(false);
      return { error: 'Username is mandatory.' };
    }

    // 3. Mandatory Display Name Validation
    if (!displayName || !displayName.trim()) {
      setIsLoading(false);
      return { error: 'Display name is mandatory.' };
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);
    const cleanedDigits = normalizedPhone.replace(/\D/g, '').slice(-10);
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, '');

    // Check duplicate phone number in local profiles
    const phoneExists = DEMO_PROFILES.some((p) =>
      p.phone_number?.replace(/\D/g, '').endsWith(cleanedDigits)
    );
    if (phoneExists) {
      setIsLoading(false);
      return { error: 'A Delta account with this mobile number already exists. Please sign in.' };
    }

    // Check duplicate username in local profiles
    const usernameExists = DEMO_PROFILES.some((p) => p.username.toLowerCase() === cleanUsername);
    if (usernameExists) {
      setIsLoading(false);
      return { error: `The username @${cleanUsername} is already taken. Please choose another.` };
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
            avatar_url: null,
            presence_status: 'online',
          };
          setCurrentUser(newProfile);
          setIsDemoMode(false);
          setIsLoading(false);
          return {};
        }
      }
    }

    // Demo Mode Sign up: create custom local profile with mandatory mobile number
    const newDemoProfile: Profile = {
      id: `user-${Date.now()}`,
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

    setCurrentUser(newDemoProfile);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_demo_user_id', newDemoProfile.id);
      localStorage.setItem(`delta_custom_profile_${newDemoProfile.id}`, JSON.stringify(newDemoProfile));
    }
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
    }
  };

  const switchDemoUser = (userId: string) => {
    const target = DEMO_PROFILES.find((p) => p.id === userId);
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
        availableDemoUsers: DEMO_PROFILES,
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
