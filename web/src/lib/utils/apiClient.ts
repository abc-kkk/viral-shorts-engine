import { toast } from '../toast';

interface RequestConfig extends RequestInit {
  data?: any;
  params?: Record<string, string | number | boolean>;
  hideErrorToast?: boolean;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

async function request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<T> {
  const { data, params, hideErrorToast, ...customConfig } = config;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  const headers: HeadersInit = {
    ...customConfig.headers,
  };

  if (data) {
    headers['Content-Type'] = 'application/json';
    customConfig.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers,
    });

    // Check if it's JSON
    const contentType = response.headers.get('content-type');
    let responseData = null;
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage = responseData?.error || responseData?.message || response.statusText || '请求失败';
      throw new ApiError(response.status, errorMessage, responseData);
    }

    // Some custom APIs return { success: false, error: '...' } with 200 OK
    if (responseData && typeof responseData === 'object' && responseData.success === false && responseData.error) {
       throw new ApiError(200, responseData.error, responseData);
    }

    return responseData;
  } catch (err: any) {
    if (!hideErrorToast) {
      toast.error(err.message || '网络请求出错');
    }
    throw err;
  }
}

export const apiClient = {
  get: <T = any>(endpoint: string, config?: RequestConfig) => request<T>(endpoint, { ...config, method: 'GET' }),
  post: <T = any>(endpoint: string, data?: any, config?: RequestConfig) => request<T>(endpoint, { ...config, method: 'POST', data }),
  patch: <T = any>(endpoint: string, data?: any, config?: RequestConfig) => request<T>(endpoint, { ...config, method: 'PATCH', data }),
  delete: <T = any>(endpoint: string, config?: RequestConfig) => request<T>(endpoint, { ...config, method: 'DELETE' }),
};
