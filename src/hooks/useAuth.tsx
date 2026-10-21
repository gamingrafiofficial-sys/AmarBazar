import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { SEED_DEMO_USERS } from '../data/seedData';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile;
  role: UserRole;
  setRole: (role: UserRole) => void;
  signInWithGoogle: () => Promise<void>;
  logOut: () => Promise<void>;
  isFirebaseLoading: boolean;
  isFirebaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole>(() => {
    try {
      const savedRole = localStorage.getItem('amar_auth_role');
      if (savedRole === 'admin' || savedRole === 'rider' || savedRole === 'customer' || savedRole === 'shopkeeper') {
        return savedRole;
      }
    } catch {}
    return 'customer';
  });
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const savedRole = (localStorage.getItem('amar_auth_role') as UserRole) || 'customer';
      return SEED_DEMO_USERS[savedRole] || SEED_DEMO_USERS['customer'];
    } catch {
      return SEED_DEMO_USERS['customer'];
    }
  });
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(true);
  const isFirebaseConfigured = true;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsFirebaseLoading(false);
      if (user) {
        // If user logged in via Google
        const isAdminEmail = user.email === 'gamingrafi.official@gmail.com';
        const assignedRole: UserRole = isAdminEmail ? 'admin' : role;
        
        setProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Marketplace User',
          role: assignedRole,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        if (isAdminEmail) {
          setRoleState('admin');
          try {
            localStorage.setItem('amar_auth_role', 'admin');
          } catch {}
        }
      } else {
        // Default to active profile for the selected persistent role
        setProfile(SEED_DEMO_USERS[role] || SEED_DEMO_USERS['customer']);
      }
    });

    return () => unsubscribe();
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    try {
      localStorage.setItem('amar_auth_role', newRole);
    } catch {}
    if (!currentUser) {
      setProfile(SEED_DEMO_USERS[newRole] || SEED_DEMO_USERS['customer']);
    } else {
      setProfile((prev) => ({
        ...prev,
        role: newRole,
        shopId: newRole === 'shopkeeper' ? 'shop-bismillah-store' : undefined,
      }));
    }
  };

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.warn('Google sign-in popup closed or restricted in frame, using role simulation:', err.message);
    }
  };

  const logOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      try {
        localStorage.removeItem('amar_auth_role');
        localStorage.removeItem('amar_active_customer');
        localStorage.removeItem('amar_active_rider');
      } catch {}
      setRoleState('customer');
      setProfile(SEED_DEMO_USERS['customer']);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role,
        setRole,
        signInWithGoogle,
        logOut,
        isFirebaseLoading,
        isFirebaseConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
