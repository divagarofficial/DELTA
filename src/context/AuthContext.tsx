'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '@/types';
import { DEMO_PROFILES } from '@/data/mockData';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType {
  currentUser: Profile | null;
  isLoading: boolean;
  isConfigured: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error?: string }>;
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
      const found = DEMO_PROFILES.find((p) => p.id === storedUserId) || DEMO_PROFILES[0];
      setCurrentUser(found);
      setIsDemoMode(true);
      setIsLoading(false);
    }

    initAuth();
  }, [isConfigured]);

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    setIsLoading(true);
    if (isConfigured) {
      const supabase = createClient();
      if (supabase && password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }
        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
          if (profile) setCurrentUser(profile);
          setIsDemoMode(false);
          setIsLoading(false);
          return {};
        }
      }
    }

    // Demo Mode sign-in by username or email
    const match = DEMO_PROFILES.find(
      (p) => p.username.toLowerCase() === email.toLowerCase().replace('@', '') ||
             email.toLowerCase().includes(p.username.toLowerCase())
    ) || DEMO_PROFILES[0];

    setCurrentUser(match);
    if (typeof window !== 'undefined') {
      localStorage.setItem('delta_demo_user_id', match.id);
    }
    setIsDemoMode(true);
    setIsLoading(false);
    return {};
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ): Promise<{ error?: string }> => {
    setIsLoading(true);
    if (isConfigured) {
      const supabase = createClient();
      if (supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: displayName },
          },
        });
        if (error) {
          setIsLoading(false);
          return { error: error.message };
        }
        if (data.user) {
          const newProfile: Profile = {
            id: data.user.id,
            username,
            display_name: displayName,
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

    // Demo Mode Sign up: create custom local profile
    const newDemoProfile: Profile = {
      id: `user-${Date.now()}`,
      username: username.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      display_name: displayName,
      avatar_url: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
      phone_number: '+91 99999 88888',
      biography: 'New Delta Explorer',
      status_message: 'Hello Delta! Everything connects.',
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
