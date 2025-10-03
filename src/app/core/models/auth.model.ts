export interface LoginPayload {
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface LogoutResponse {
  success: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  avatarUrl?: string;
}
