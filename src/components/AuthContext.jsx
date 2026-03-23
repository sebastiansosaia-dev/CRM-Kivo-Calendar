import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Independent Role Fetcher Lifecycle
  useEffect(() => {
    let active = true;

    const fetchRole = async (userId) => {
      // Start safety timer exactly when fetching begins
      const fetchTimeout = setTimeout(() => {
        if (active) setLoading(false);
      }, 4000);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
          
        if (error) throw error;
        if (active) setRole(data.role);
      } catch (err) {
        console.error('Role fetch error:', err);
      } finally {
        clearTimeout(fetchTimeout);
        if (active) setLoading(false);
      }
    };

    if (user) {
      fetchRole(user.id);
    } else {
      setRole(null);
    }

    return () => {
      active = false;
    };
  }, [user]);

  // 2. Dedicated Auth State Lifecycle
  useEffect(() => {
    const mountTimeout = setTimeout(() => {
      setLoading(false);
    }, 4000);

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      clearTimeout(mountTimeout); 

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        if (session?.user) {
          setUser(session.user);
        } else {
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(mountTimeout);
    };
  }, []);

  const logout = async () => {
    setUser(null);
    setRole(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
