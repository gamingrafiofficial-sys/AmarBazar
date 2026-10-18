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
  const [role, setRoleState] = useState<UserRole>('customer');
  const [profile, setProfile] = useState<UserProfile>(SEED_DEMO_USERS['customer']);
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
        if (isAdminEmail) setRoleState('admin');
      } else {
        // Default to active demo profile for the selected role
        setProfile(SEED_DEMO_USERS[role] || SEED_DEMO_USERS['customer']);
      }
    });

    return () => unsubscribe();
  }, [role]);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    if (!currentUser) {
      setProfile(SEED_DEMO_USERS[newRole]);
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
      setRole('customer');
    } catch (err) {
      console.error('Logout error:', err);
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
