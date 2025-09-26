import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Error getting initial session:', error);
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state change:', event, { hasUser: !!session?.user });
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
       options: {
         emailRedirectTo: undefined,
         data: {
           email_confirm: false
         }
       }
      });
      return { data, error };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Sign up failed',
          name: error.name || 'SignUpError'
        } 
      };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Sign in failed',
          name: error.name || 'SignInError'
        } 
      };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { 
        error: { 
          message: error.message || 'Sign out failed',
          name: error.name || 'SignOutError'
        } 
      };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email);
      return { data, error };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'Password reset failed',
          name: error.name || 'ResetPasswordError'
        } 
      };
    }
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };
}