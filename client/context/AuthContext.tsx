// File: /context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserRole } from '@/types';
import { auth } from '@/firebaseConfig';
import { signInAnonymously, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (role: UserRole, additionalData?: any) => Promise<void>;
  loginWithCredentials: (username: string, password: string, role?: UserRole, additionalData?: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = '@construction_erp_user';

const roleNames: Record<UserRole, string> = {
  admin: 'Administrator',
  engineer: 'Engineer',
  supervisor: 'Supervisor',
  client: 'Client',
  vendor: 'Vendor',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedUser = JSON.parse(stored);
        setUser(parsedUser);
        console.log('[AuthContext] Loaded user from storage:', parsedUser);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveUser = async (userData: User | null) => {
    try {
      if (userData) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to save user:', error);
    }
  };

  const login = async (role: UserRole, additionalData?: any) => {
    console.log('[AuthContext] Login called:', { role, additionalData });
    
    let newUser: User;
    
    if (role === 'client' && additionalData) {
      // Create client user with specific data
      newUser = {
        role,
        id: additionalData.clientId || `client_${Date.now()}`,
        name: additionalData.clientName || 'Client',
        clientId: additionalData.clientId,
        clientName: additionalData.clientName,
        projectName: additionalData.projectName,
        username: additionalData.username,
        email: additionalData.email,
        phone: additionalData.phone,
        ...additionalData,
      };
    } else if (role === 'engineer' && additionalData) {
      // Create engineer user with specific data
      newUser = {
        role,
        id: additionalData.engineerId || `engineer_${Date.now()}`,
        name: additionalData.engineerName || 'Engineer',
        engineerId: additionalData.engineerId,
        engineerName: additionalData.engineerName,
        ...additionalData,
      };
    } else {
      // Create generic user for other roles
      newUser = {
        role,
        name: roleNames[role],
        ...additionalData,
      };
    }
    
    // Ensure we don't store password in user object
    delete newUser.password;
    
    console.log('[AuthContext] Saving user:', newUser);
    await saveUser(newUser);
    setUser(newUser);
    
    // Ensure Firebase auth session for Firestore rules (request.auth != null)
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
        console.log('[AuthContext] Firebase anonymous sign-in successful');
      }
    } catch (e) {
      console.warn('[AuthContext] Firebase anonymous sign-in failed:', e);
    }
  };

  // Default development credentials for quick login (username -> { password, role })
  const defaultCredentials: Record<string, { password: string; role: UserRole }> = {
    admin: { password: 'admin123', role: 'admin' },
    engineer: { password: 'engineer123', role: 'engineer' },
    client: { password: 'client123', role: 'client' },
    vendor: { password: 'vendor123', role: 'vendor' },
    supervisor: { password: 'supervisor123', role: 'supervisor' },
  };

 const loginWithCredentials = async (
  username: string,
  password: string,
  role?: UserRole,
  additionalData?: any
) => {
  console.log('[AuthContext] loginWithCredentials called:', {
    username,
    role,
    hasAdditionalData: !!additionalData,
  });

  // ✅ ADMIN – DIRECT LOGIN, NO PASSWORD VERIFICATION NEEDED
  if (role === 'admin') {
    await login('admin', {
      name: 'Administrator',
      username,
      ...additionalData,
    });
    return;
  }

  // ✅ SITE ENGINEER – DIRECT LOGIN, NO PASSWORD VERIFICATION NEEDED
  if (role === 'site-engineer') {
    await login('site-engineer', {
      name: 'Site Engineer',
      username,
      ...additionalData,
    });
    return;
  }

  // For other roles (client, engineer, vendor), verify credentials
  // First check if role is provided and matches default credentials
  if (role && defaultCredentials[username]) {
    const defaultCred = defaultCredentials[username];
    if (defaultCred.password === password && defaultCred.role === role) {
      await login(role, {
        name: roleNames[role],
        username,
        ...additionalData,
      });
      return;
    }
  }

  // If username exists in default credentials, verify password
  if (defaultCredentials[username]) {
    const defaultCred = defaultCredentials[username];
    if (defaultCred.password === password) {
      const loginRole = role || defaultCred.role;
      await login(loginRole, {
        name: roleNames[loginRole],
        username,
        ...additionalData,
      });
      return;
    } else {
      throw new Error('Invalid password');
    }
  }

  // If additionalData is provided (from LoginScreen client/engineer lookup)
  // This means the credentials were already verified in LoginScreen
  if (additionalData) {
    await login(role!, {
      username,
      ...additionalData,
    });
    return;
  }

  // If we get here, credentials are invalid
  throw new Error('Invalid username or password');
};


  const logout = async () => {
    console.log('[AuthContext] Logging out');
    await saveUser(null);
    setUser(null);
    try {
      await signOut(auth);
      console.log('[AuthContext] Firebase sign-out successful');
    } catch (e) {
      console.warn('[AuthContext] Firebase sign-out failed:', e);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    console.log('[AuthContext] Updating user:', updates);
    
    if (!user) {
      throw new Error('No user logged in');
    }
    
    const updatedUser = { ...user, ...updates };
    
    // Ensure we don't store password
    delete updatedUser.password;
    
    await saveUser(updatedUser);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      loginWithCredentials, 
      logout,
      updateUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Optional: Helper hooks for specific roles
export function useClientAuth() {
  const { user, ...rest } = useAuth();
  
  if (user?.role !== 'client') {
    throw new Error('useClientAuth can only be used by clients');
  }
  
  return {
    client: user,
    clientId: user.clientId!,
    clientName: user.clientName!,
    projectName: user.projectName,
    ...rest,
  };
}

export function useEngineerAuth() {
  const { user, ...rest } = useAuth();
  
  if (user?.role !== 'engineer') {
    throw new Error('useEngineerAuth can only be used by engineers');
  }
  
  return {
    engineer: user,
    engineerId: user.engineerId!,
    engineerName: user.engineerName!,
    ...rest,
  };
}

// Optional: Custom hook for checking permissions
export function usePermissions() {
  const { user } = useAuth();
  
  const canViewAllProjects = ['admin', 'engineer', 'supervisor'].includes(user?.role || '');
  const canEditProjects = ['admin', 'engineer'].includes(user?.role || '');
  const canManageUsers = user?.role === 'admin';
  const canViewFinancials = ['admin', 'engineer', 'client'].includes(user?.role || '');
  const canManagePayments = ['admin', 'engineer'].includes(user?.role || '');
  
  const isClient = user?.role === 'client';
  const isAdmin = user?.role === 'admin';
  const isEngineer = user?.role === 'engineer';
  const isVendor = user?.role === 'vendor';
  const isSupervisor = user?.role === 'supervisor';
  
  return {
    canViewAllProjects,
    canEditProjects,
    canManageUsers,
    canViewFinancials,
    canManagePayments,
    isClient,
    isAdmin,
    isEngineer,
    isVendor,
    isSupervisor,
    hasRole: (role: UserRole | UserRole[]) => {
      if (Array.isArray(role)) {
        return role.includes(user?.role as UserRole);
      }
      return user?.role === role;
    },
    hasPermission: (permission: string) => {
      // Define permission matrix
      const permissions: Record<UserRole, string[]> = {
        admin: ['all'],
        engineer: ['view_all', 'edit_projects', 'manage_payments', 'view_financials'],
        supervisor: ['view_all', 'view_financials'],
        client: ['view_own', 'view_financials'],
        vendor: ['view_own'],
      };
      
      if (user?.role === 'admin') return true;
      return permissions[user?.role as UserRole]?.includes(permission) || false;
    },
  };
}