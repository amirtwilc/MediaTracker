import { API_CONFIG, STORAGE_KEYS } from './config';
import { ApiError, NetworkError, TimeoutError } from './errors';
import { sleep } from './api.utils';

export abstract class BaseApiClient {
  protected tokenCache: string | null = null;
  private tokenTimestamp: number = 0;
  private readonly TOKEN_CACHE_DURATION = 5000; // 5 seconds

  /**
   * Gets authentication token with caching to reduce localStorage access
   */
  protected getToken(): string | null {
    const now = Date.now();
    
    // Return cached token if it's fresh
    if (this.tokenCache && (now - this.tokenTimestamp) < this.TOKEN_CACHE_DURATION) {
      return this.tokenCache;
    }

    // Refresh cache
    this.tokenCache = localStorage.getItem(STORAGE_KEYS.TOKEN);
    this.tokenTimestamp = now;
    
    return this.tokenCache;
  }

  /**
   * Sets the authentication token
   */
  public setToken(token: string | null): void {
    if (token) {
      localStorage.setItem(STORAGE_KEYS.TOKEN, token);
      this.tokenCache = token;
      this.tokenTimestamp = Date.now();
    } else {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      this.tokenCache = null;
      this.tokenTimestamp = 0;
    }
  }

  /**
   * Clears the authentication token
   */
  public clearToken(): void {
    this.setToken(null);
  }

  /**
   * Builds headers for requests
   */
  protected getHeaders(includeAuth = true, additionalHeaders?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (additionalHeaders && typeof additionalHeaders === 'object' && !Array.isArray(additionalHeaders)) {
      Object.assign(headers, additionalHeaders);
    }

    if (includeAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handles API errors with detailed information
   */
  protected async handleError(res: Response): Promise<never> {
    let errorData: any = null;
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;

    try {
      errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Response is not JSON, use default message
    }

    // Handle specific status codes
    if (res.status === 401) {
      this.clearToken();
      errorMessage = 'Unauthorized. Please login again.';
    } else if (res.status === 403) {
      errorMessage = 'Access forbidden. You do not have permission to perform this action.';
    } else if (res.status === 404) {
      errorMessage = errorData?.message || 'Resource not found.';
    } else if (res.status === 500) {
      errorMessage = 'Server error. Please try again later.';
    }

    throw new ApiError(errorMessage, res.status, errorData);
  }

  /**
   * Makes a fetch request with timeout, retry logic, and error handling
   */
  protected async request<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT)
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: options.headers,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        await this.handleError(res);
      }

      // Handle empty responses (204 No Content)
      if (res.status === 204) {
        return undefined as T;
      }

      return await res.json();
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error.name === 'AbortError') {
        throw new TimeoutError('Request timeout. Please check your connection and try again.');
      }

      // Handle network errors with retry
      if (error instanceof TypeError && retryCount < API_CONFIG.RETRY_ATTEMPTS) {
        await sleep(API_CONFIG.RETRY_DELAY * Math.pow(2, retryCount));
        return this.request<T>(url, options, retryCount + 1);
      }

      // Handle network errors
      if (error instanceof TypeError) {
        throw new NetworkError('Network error. Please check your connection.');
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Makes a GET request
   */
  protected async get<T>(
    endpoint: string,
    params?: Record<string, any>,
    includeAuth = true
  ): Promise<T> {
    const url = params 
      ? `${API_CONFIG.BASE_URL}${endpoint}?${new URLSearchParams(params).toString()}`
      : `${API_CONFIG.BASE_URL}${endpoint}`;

    return this.request<T>(url, {
      method: 'GET',
      headers: this.getHeaders(includeAuth),
    });
  }

  /**
   * Makes a POST request
   */
  protected async post<T>(
    endpoint: string,
    body?: any,
    includeAuth = true
  ): Promise<T> {
    return this.request<T>(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(includeAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Makes a PUT request
   */
  protected async put<T>(
    endpoint: string,
    body?: any,
    includeAuth = true
  ): Promise<T> {
    return this.request<T>(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(includeAuth),
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * Makes a DELETE request
   */
  protected async delete<T>(
    endpoint: string,
    includeAuth = true
  ): Promise<T> {
    return this.request<T>(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(includeAuth),
    });
  }

  /**
   * Uploads a file using FormData
   */
  protected async uploadFile<T>(
    endpoint: string,
    file: File,
    fieldName = 'file'
  ): Promise<T> {
    const formData = new FormData();
    formData.append(fieldName, file);

    const token = this.getToken();
    const headers: Record<string, string> = {};
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return this.request<T>(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }
}