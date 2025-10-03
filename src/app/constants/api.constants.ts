export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    me: `${API_BASE_URL}/auth/me`,
    logout: `${API_BASE_URL}/auth/logout`,
    refresh: `${API_BASE_URL}/auth/refresh`,
    forgotPassword: `${API_BASE_URL}/auth/password/forgot`,
  },
  admin: {
    metrics: `${API_BASE_URL}/admin/metrics`,
    salesReport: `${API_BASE_URL}/admin/reports/sales`,
  },
} as const;
