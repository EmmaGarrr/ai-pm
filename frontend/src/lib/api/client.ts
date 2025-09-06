// Using native fetch API instead of axios for React 19 compatibility
// TODO: Revert to axios when React 19 support is stable
import { useUserStore, useGlobalStore } from '../store';

interface APIError {
  message: string;
  code: string;
  details?: any;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

class APIClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Try to get token from user store first, then localStorage
    const userStore = useUserStore.getState();
    const token = userStore.session.token || localStorage.getItem('auth_token');
    
    return token;
  }

  private async refreshAuthToken(): Promise<string> {
    if (this.isRefreshing) {
      // Wait for token refresh to complete
      return new Promise((resolve) => {
        this.refreshSubscribers.push(resolve);
      });
    }

    this.isRefreshing = true;

    try {
      const userStore = useUserStore.getState();
      await userStore.refreshSession();
      
      const newToken = userStore.session.token;
      if (!newToken) {
        throw new Error('Token refresh failed');
      }

      // Notify all subscribers
      this.refreshSubscribers.forEach(callback => callback(newToken));
      this.refreshSubscribers = [];

      return newToken;
    } finally {
      this.isRefreshing = false;
    }
  }

  private handleAPIError(error: any): void {
    const globalStore = useGlobalStore.getState();
    
    if (error.status) {
      // Server responded with error status
      const { status } = error;
      
      switch (status) {
        case 401:
          this.handleAuthError();
          break;
        case 403:
          globalStore.setError(new Error('Access denied'));
          break;
        case 404:
          globalStore.setError(new Error('Resource not found'));
          break;
        case 429:
          globalStore.setError(new Error('Too many requests'));
          break;
        case 500:
          globalStore.setError(new Error('Server error'));
          break;
        default:
          globalStore.setError(new Error(error.message || 'Unknown error'));
      }
    } else if (error.message === 'Failed to fetch') {
      // Request was made but no response received
      globalStore.setError(new Error('Network error'));
    } else {
      // Something happened in setting up the request
      globalStore.setError(new Error('Request configuration error'));
    }
  }

  private handleAuthError(): void {
    const userStore = useUserStore.getState();
    userStore.clearSession();
    
    // Redirect to login page if not already there
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }

  private async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...fetchOptions } = options;
    
    // Build URL with query parameters
    let fullUrl = `${this.baseURL}${url}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      if (searchParams.toString()) {
        fullUrl += `?${searchParams.toString()}`;
      }
    }

    // Set up headers
    const headers = new Headers(fetchOptions.headers);
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Add authorization header
    const token = this.getAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
    };

    try {
      const response = await fetch(fullUrl, config);

      // Handle 401 and token refresh
      if (response.status === 401) {
        try {
          const newToken = await this.refreshAuthToken();
          headers.set('Authorization', `Bearer ${newToken}`);
          const retryResponse = await fetch(fullUrl, { ...config, headers });
          return await this.handleResponse<T>(retryResponse);
        } catch (refreshError) {
          this.handleAuthError();
          throw refreshError;
        }
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      this.handleAPIError(error);
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `HTTP ${response.status}`);
      Object.assign(error, { status: response.status, ...errorData });
      throw error;
    }

    // Handle empty responses (like 204 No Content)
    if (response.status === 204) {
      return null as T;
    }

    return await response.json();
  }

  // HTTP methods with TypeScript support
  async get<T>(url: string, config?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }

  async post<T>(url: string, data?: any, config?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(url: string, data?: any, config?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(url: string, data?: any, config?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(url: string, config?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...config, method: 'DELETE' });
  }

  // Upload method for file uploads
  async upload<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('POST', `${this.baseURL}${url}`, true);
      
      // Add authorization header
      const token = this.getAuthToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (onProgress && event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          onProgress(progress);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (error) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };

      xhr.send(formData);
    });
  }

  // Download method for file downloads
  async download(url: string, filename?: string): Promise<void> {
    const response = await fetch(`${this.baseURL}${url}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.getAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Set base URL
  setBaseURL(url: string): void {
    this.baseURL = url;
  }

  // Cancel requests
  createCancelToken(): AbortController {
    return new AbortController();
  }
}

// Export singleton instance
export const apiClient = new APIClient();

// Export convenience methods for direct usage
export const { get, post, put, patch, delete: deleteRequest, upload, download } = apiClient;

// Export types
export type { APIError };

// React hook for API calls
export function useAPI() {
  return {
    get: apiClient.get.bind(apiClient),
    post: apiClient.post.bind(apiClient),
    put: apiClient.put.bind(apiClient),
    patch: apiClient.patch.bind(apiClient),
    delete: apiClient.delete.bind(apiClient),
    upload: apiClient.upload.bind(apiClient),
    download: apiClient.download.bind(apiClient),
    healthCheck: apiClient.healthCheck.bind(apiClient),
  };
}