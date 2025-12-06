// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'; // Added useRef
import { createClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

// ✅ Uses import.meta.env.VITE_* (Vite standard). Consider renaming PUBLISHABLE_KEY to ANON_KEY for Supabase convention.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true); // NEW: Track if we've done the first load

  // Load and subscribe to the auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    }).catch((error) => { // NEW: Handle errors (e.g., network failure)
      console.error('Failed to get initial session:', error);
    }).finally(() => { // NEW: Always resolve loading after attempt
      setLoading(false);
      isInitialLoad.current = false;
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // UPDATED: Only set loading false on initial loads (avoids flicker)
      if (isInitialLoad.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        signUp,
        signIn,
        signOut,
        isAdmin,
        loading
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};