import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { TenantAPI } from '../lib/api';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, mobile: string, name: string, shopName?: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  // OAuth helpers (optional to call)
  signInWithGoogle?: () => Promise<{ error: AuthError | null }>;
  signUpWithGoogle?: () => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, mobile: string, name: string, shopName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            mobile,
            name,
          },
        },
      });

      if (error) return { error };

      // Create tenant and admin profile
      if (data.user && data.session) {
        try {
          // Generate unique join code
          const generateJoinCode = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let code = '';
            for (let i = 0; i < 6; i++) {
              code += chars.charAt(Math.floor(Math.random() * Math.random() * chars.length));
            }
            return code;
          };

          const joinCode = generateJoinCode();
          const tenantName = shopName || name || 'My Shop';

          // Create tenant via backend API
          const tenant = await TenantAPI.create(tenantName, joinCode);

          // Create admin profile with tenant_id
          const { error: profileError } = await supabase
            .from('admin_profiles')
            .insert({
              user_id: data.user.id,
              mobile,
              name,
              shop_name: shopName || null,
              tenant_id: tenant.id,
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
            // Don't fail signup if profile creation fails - tenant is already created
          }
        } catch (tenantError) {
          console.error('Error creating tenant:', tenantError);
          // If tenant creation fails, still create admin profile without tenant_id
          const { error: profileError } = await supabase
            .from('admin_profiles')
            .insert({
              user_id: data.user.id,
              mobile,
              name,
              shop_name: shopName || null,
            });

          if (profileError) {
            console.error('Error creating profile:', profileError);
          }
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  // OAuth helpers: use Supabase signInWithOAuth.
  // These will redirect the browser to the provider's consent screen.
  const signInWithGoogle = async () => {
    try {
      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/shipment`, // after OAuth redirect
        },
      });
      // signInWithOAuth typically returns a url for redirect; supabase client handles redirect automatically.
      // We return any error object so callers can show messages if needed.
      return { error: (res as any).error ?? null };
    } catch (err) {
      return { error: err as AuthError };
    }
  };

  // signUpWithGoogle can be the same flow (OAuth sign-in / sign-up handled by provider)
  const signUpWithGoogle = async () => {
    try {
      const res = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/shipment`,
        },
      });
      return { error: (res as any).error ?? null };
    } catch (err) {
      return { error: err as AuthError };
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithGoogle,
    signUpWithGoogle,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
