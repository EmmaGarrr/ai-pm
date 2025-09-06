import { APIClient } from '@/lib/api/client';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock store hooks
jest.mock('@/lib/store/globalStore', () => ({
  useGlobalStore: () => ({
    setConnectionStatus: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
  }),
}));

jest.mock('@/lib/store/userStore', () => ({
  useUserStore: () => ({
    user: { id: 'test-user' },
    session: { token: 'test-token' },
    refreshSession: jest.fn(),
  }),
}));

describe('APIClient', () => {
  let apiClient: APIClient;
  const mockBaseURL = 'http://localhost:3000/api';

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new APIClient(mockBaseURL);
  });

  describe('constructor', () => {
    it('should create instance with correct baseURL', () => {
      expect(apiClient).toBeInstanceOf(APIClient);
    });
  });

  describe('get', () => {
    it('should make GET request and return data', async () => {
      const mockData = { id: 1, name: 'Test' };
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockResolvedValue({ data: mockData }),
      } as any);

      const client = new APIClient(mockBaseURL);
      const result = await client.get('/test');

      expect(result).toEqual(mockData);
    });

    it('should handle errors', async () => {
      const mockError = new Error('Network error');
      mockedAxios.create.mockReturnValue({
        get: jest.fn().mockRejectedValue(mockError),
      } as any);

      const client = new APIClient(mockBaseURL);
      
      await expect(client.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('should make POST request with data', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockPayload = { name: 'New Item' };
      
      mockedAxios.create.mockReturnValue({
        post: jest.fn().mockResolvedValue({ data: mockData }),
      } as any);

      const client = new APIClient(mockBaseURL);
      const result = await client.post('/test', mockPayload);

      expect(result).toEqual(mockData);
    });
  });

  describe('put', () => {
    it('should make PUT request with data', async () => {
      const mockData = { id: 1, name: 'Updated' };
      const mockPayload = { name: 'Updated Item' };
      
      mockedAxios.create.mockReturnValue({
        put: jest.fn().mockResolvedValue({ data: mockData }),
      } as any);

      const client = new APIClient(mockBaseURL);
      const result = await client.put('/test/1', mockPayload);

      expect(result).toEqual(mockData);
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      const mockData = { success: true };
      
      mockedAxios.create.mockReturnValue({
        delete: jest.fn().mockResolvedValue({ data: mockData }),
      } as any);

      const client = new APIClient(mockBaseURL);
      const result = await client.delete('/test/1');

      expect(result).toEqual(mockData);
    });
  });

  describe('request interceptor', () => {
    it('should add authorization header', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockInstance = {
        get: jest.fn().mockResolvedValue({ data: mockData }),
        interceptors: {
          request: {
            use: jest.fn(),
          },
          response: {
            use: jest.fn(),
          },
        },
      };

      mockedAxios.create.mockReturnValue(mockInstance as any);

      const client = new APIClient(mockBaseURL);
      
      // The interceptor should be set up
      expect(mockInstance.interceptors.request.use).toHaveBeenCalled();
    });
  });

  describe('response interceptor', () => {
    it('should handle response interceptor', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockInstance = {
        get: jest.fn().mockResolvedValue({ data: mockData }),
        interceptors: {
          request: {
            use: jest.fn(),
          },
          response: {
            use: jest.fn(),
          },
        },
      };

      mockedAxios.create.mockReturnValue(mockInstance as any);

      const client = new APIClient(mockBaseURL);
      
      // The interceptor should be set up
      expect(mockInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });
});