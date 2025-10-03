export interface LoginRequest { email: string; password: string; remember?: boolean; }
export interface TokenResponse { token: string; refreshToken: string; user: User; }
export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  isVerified: boolean;
}
