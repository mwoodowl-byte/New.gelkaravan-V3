import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: number;
  phone: string;
  full_name: string;
  role: 'client' | 'manager' | 'admin';
  is_active: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuth: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuth: false,
      login: (token, user) => set({ token, user, isAuth: true }),
      logout: () => set({ token: null, user: null, isAuth: false }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'gelkaravan-auth',
    }
  )
);
