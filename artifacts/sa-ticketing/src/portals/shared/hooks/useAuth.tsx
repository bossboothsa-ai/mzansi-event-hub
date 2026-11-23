import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../api';
import type { SessionAccount, UserRole, OrganiserDashboardData } from '../types';

interface AuthContextValue {
  account: SessionAccount | null;
  loading: boolean;
  isAuthorized: boolean;
  dashboardData: OrganiserDashboardData | null;
  login: (email: string, password: string, expectedRole: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, expectedRole: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children, expectedRole }: { children: ReactNode; expectedRole: UserRole }) {
  const [account, setAccount] = useState<SessionAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [dashboardData, setDashboardData] = useState<OrganiserDashboardData | null>(null);

  const refresh = async () => {
    try {
      const data = await api.me();
      if (data.role !== expectedRole) {
        setAccount(null);
        setIsAuthorized(false);
        setDashboardData(null);
        return;
      }
      setAccount(data);
      setIsAuthorized(true);
      if (expectedRole === 'organiser') {
        try {
          const dashData = await api.getOrganiserDashboard();
          setDashboardData(dashData);
        } catch {
          setDashboardData(null);
        }
      }
    } catch {
      setAccount(null);
      setIsAuthorized(false);
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [expectedRole]);

  const login = async (email: string, password: string, expectedRole: UserRole) => {
    let data: SessionAccount;
    switch (expectedRole) {
      case 'customer':
        data = await api.customerLogin(email, password);
        break;
      case 'organiser':
        data = await api.organizerLogin(email, password);
        break;
      case 'admin':
        data = await api.adminLogin(email, password);
        break;
    }
    if (data.role !== expectedRole) {
      await api.logout();
      throw new Error(`This account is not authorized for the ${expectedRole} portal`);
    }
    setAccount(data);
    setIsAuthorized(true);
    if (expectedRole === 'organiser') {
      try {
        const dashData = await api.getOrganiserDashboard();
        setDashboardData(dashData);
      } catch {
        setDashboardData(null);
      }
    }
  };

  const register = async (name: string, email: string, password: string, expectedRole: UserRole) => {
    let data: SessionAccount;
    if (expectedRole === 'customer') {
      data = await api.customerRegister(name, email, password);
    } else if (expectedRole === 'organiser') {
      data = await api.organizerRegister(name, email, password);
    } else {
      throw new Error('Admin registration not available');
    }
    if (data.role !== expectedRole) {
      await api.logout();
      throw new Error(`This account is not authorized for the ${expectedRole} portal`);
    }
    setAccount(data);
    setIsAuthorized(true);
    if (expectedRole === 'organiser') {
      try {
        const dashData = await api.getOrganiserDashboard();
        setDashboardData(dashData);
      } catch {
        setDashboardData(null);
      }
    }
  };

  const logout = async () => {
    await api.logout();
    setAccount(null);
    setIsAuthorized(false);
    setDashboardData(null);
  };

  return (
    <AuthContext.Provider value={{ account, loading, isAuthorized, dashboardData, login, register, logout, refresh }}>
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

export function useRequireAuth(expectedRole: UserRole) {
  const { account, loading, isAuthorized, login, register, logout, refresh } = useAuth();
  
  const isAuthorizedForRole = account?.role === expectedRole;
  
  return {
    account,
    loading,
    isAuthorized: isAuthorizedForRole,
    login: (email: string, password: string) => login(email, password, expectedRole),
    register: (name: string, email: string, password: string) => register(name, email, password, expectedRole),
    logout,
    refresh,
  };
}