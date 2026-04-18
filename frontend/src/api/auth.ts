import client from './client';
import { User } from '@/store/authStore';

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface AcceptInviteRequest {
  token: string;
  full_name: string;
  phone: string;
}

export interface AcceptInviteResponse {
  access_token?: string;
  user?: User;
  status: 'approved' | 'pending';
  message: string;
}

export const authAPI = {
  requestCode: (phone: string): Promise<{ message: string }> => 
    client.post('/auth/request-code', { phone }).then((res) => res.data),

  verifyCode: (phone: string, code: string): Promise<AuthResponse> =>
    client.post('/auth/verify-code', { phone, code }).then((res) => res.data),

  acceptInvite: (data: AcceptInviteRequest): Promise<AcceptInviteResponse> =>
    client.post('/auth/accept-invite', data).then((res) => res.data),

  me: (): Promise<User> => 
    client.get('/auth/me').then((res) => res.data),
};
