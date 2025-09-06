import { apiClient } from './client';
import { useUserStore, useGlobalStore } from '../store';
import { 
  User, 
  LoginCredentials, 
  RegisterRequest, 
  AuthResponse,
  Permission 
} from '../types';

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterUserData {
  email: string;
  password: string;
  name: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    notifications?: {
      email?: boolean;
      push?: boolean;
      desktop?: boolean;
      sound?: boolean;
    };
    language?: string;
    timezone?: string;
    dateFormat?: string;
  };
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  preferences?: Partial<User['preferences']>;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface TwoFactorRequest {
  code: string;
  rememberDevice?: boolean;
}

export interface SessionInfo {
  id: string;
  userId: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  isActive: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface AuthStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  loginAttemptsToday: number;
  failedAttemptsToday: number;
}

class AuthService {
  // Authentication
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response;
  }

  async register(userData: RegisterUserData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', userData);
    return response;
  }

  async logout(): Promise<void> {
    await apiClient.post<void>('/auth/logout');
  }

  async refreshAccessToken(): Promise<{ token: string; refreshToken: string; expiresAt: Date }> {
    const response = await apiClient.post<{ token: string; refreshToken: string; expiresAt: Date }>('/auth/refresh');
    return response;
  }

  // User management
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  }

  async updateUser(updates: UpdateUserRequest): Promise<User> {
    return apiClient.put<User>('/auth/me', updates);
  }

  async updateProfilePicture(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    return apiClient.post<{ avatarUrl: string }>('/auth/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async deleteProfilePicture(): Promise<void> {
    return apiClient.delete<void>('/auth/me/avatar');
  }

  // Password management
  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await apiClient.post<void>('/auth/change-password', data);
  }

  async requestPasswordReset(data: ResetPasswordRequest): Promise<void> {
    await apiClient.post<void>('/auth/reset-password-request', data);
  }

  async resetPassword(data: ConfirmResetPasswordRequest): Promise<void> {
    await apiClient.post<void>('/auth/reset-password', data);
  }

  // Email verification
  async resendVerificationEmail(): Promise<void> {
    await apiClient.post<void>('/auth/resend-verification');
  }

  async verifyEmail(data: VerifyEmailRequest): Promise<void> {
    await apiClient.post<void>('/auth/verify-email', data);
  }

  // Two-factor authentication
  async enable2FA(): Promise<{ qrCode: string; secret: string; backupCodes: string[] }> {
    return apiClient.post<{ qrCode: string; secret: string; backupCodes: string[] }>('/auth/2fa/enable');
  }

  async disable2FA(data: TwoFactorRequest): Promise<void> {
    await apiClient.post<void>('/auth/2fa/disable', data);
  }

  async verify2FA(data: TwoFactorRequest): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/2fa/verify', data);
  }

  // Session management
  async getSessions(): Promise<SessionInfo[]> {
    return apiClient.get<SessionInfo[]>('/auth/sessions');
  }

  async revokeSession(sessionId: string): Promise<void> {
    await apiClient.delete<void>(`/auth/sessions/${sessionId}`);
  }

  async revokeAllOtherSessions(): Promise<void> {
    await apiClient.delete<void>('/auth/sessions/others');
  }

  // Permissions and roles
  async getPermissions(): Promise<Permission[]> {
    return apiClient.get<Permission[]>('/auth/permissions');
  }

  async hasPermission(permission: Permission): Promise<boolean> {
    const response = await apiClient.post<{ hasPermission: boolean }>('/auth/check-permission', { permission });
    return response.hasPermission;
  }

  async getRoles(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    permissions: Permission[];
  }>> {
    return apiClient.get<Array<{
      id: string;
      name: string;
      description: string;
      permissions: Permission[];
    }>>('/auth/roles');
  }

  // Admin functions
  async getUsers(filters?: {
    search?: string;
    role?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const params = new URLSearchParams({
      ...(filters?.search && { search: filters.search }),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive.toString() }),
      page: (filters?.page || 1).toString(),
      limit: (filters?.limit || 20).toString(),
    });

    return apiClient.get<{
      users: User[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/auth/users?${params}`);
  }

  async createUser(userData: RegisterUserData & { role?: string }): Promise<User> {
    return apiClient.post<User>('/auth/users', userData);
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    return apiClient.put<User>(`/auth/users/${userId}/role`, { role });
  }

  async deactivateUser(userId: string): Promise<void> {
    await apiClient.post<void>(`/auth/users/${userId}/deactivate`);
  }

  async activateUser(userId: string): Promise<void> {
    await apiClient.post<void>(`/auth/users/${userId}/activate`);
  }

  async deleteUser(userId: string): Promise<void> {
    await apiClient.delete<void>(`/auth/users/${userId}`);
  }

  // Analytics
  async getAuthStats(): Promise<AuthStats> {
    return apiClient.get<AuthStats>('/auth/stats');
  }

  async getUserActivity(userId: string, days = 30): Promise<Array<{
    date: string;
    logins: number;
    actions: number;
  }>> {
    return apiClient.get<Array<{
      date: string;
      logins: number;
      actions: number;
    }>>(`/auth/users/${userId}/activity?days=${days}`);
  }

  // React hook for authentication
  static useAuth() {
    const userStore = useUserStore();
    const globalStore = useGlobalStore();

    const login = async (credentials: LoginRequest) => {
      globalStore.setLoading(true);
      try {
        await userStore.login(credentials);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Login failed'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const register = async (userData: RegisterUserData) => {
      globalStore.setLoading(true);
      try {
        await userStore.register(userData);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Registration failed'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const logout = async () => {
      globalStore.setLoading(true);
      try {
        await userStore.logout();
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Logout failed'));
      } finally {
        globalStore.setLoading(false);
      }
    };

    const updateProfile = async (updates: UpdateUserRequest) => {
      globalStore.setLoading(true);
      try {
        await userStore.updateProfile(updates);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Profile update failed'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const changePassword = async (data: ChangePasswordRequest) => {
      globalStore.setLoading(true);
      try {
        await this.changePassword(data);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Password change failed'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const refreshSession = async () => {
      try {
        await userStore.refreshSession();
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Session refresh failed'));
        throw error;
      }
    };

    return {
      // State
      user: userStore.user,
      session: userStore.session,
      isAuthenticated: userStore.isAuthenticated,
      isLoading: userStore.isLoading,
      error: userStore.error,
      
      // Actions
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      refreshSession,
      clearSession: userStore.clearSession,
      updateUserPreferences: userStore.updateUserPreferences,
    };
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export convenience methods
export const {
  login: loginAPI,
  register: registerAPI,
  logout: logoutAPI,
  refreshAccessToken,
  getCurrentUser,
  updateUser,
  updateProfilePicture,
  deleteProfilePicture,
  changePassword: changePasswordAPI,
  requestPasswordReset,
  resetPassword,
  resendVerificationEmail,
  verifyEmail,
  enable2FA,
  disable2FA,
  verify2FA,
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  getPermissions,
  hasPermission,
  getRoles,
  getUsers,
  createUser,
  updateUserRole,
  deactivateUser,
  activateUser,
  deleteUser,
  getAuthStats,
  getUserActivity,
} = authService;

// Export hook
export const useAuth = AuthService.useAuth;