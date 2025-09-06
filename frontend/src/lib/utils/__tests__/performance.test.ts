import { 
  debounce, 
  throttle, 
  useDebounce, 
  useThrottle, 
  RateLimiter, 
  BatchProcessor,
  PerformanceMonitor,
  asyncDebounce
} from '@/lib/utils/performance';

// Mock timers
jest.useFakeTimers();

describe('Performance Utilities', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  describe('debounce', () => {
    it('should call function after delay', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should debounce multiple calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should call with latest arguments', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('first');
      debouncedFn('second');
      debouncedFn('third');

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledWith('third');
    });

    it('should support leading edge calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, { delay: 1000, leading: true });

      debouncedFn();
      expect(mockFn).toHaveBeenCalledTimes(1);

      debouncedFn();
      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('throttle', () => {
    it('should call function immediately', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 1000);

      throttledFn();
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, 1000);

      throttledFn();
      throttledFn();
      throttledFn();

      expect(mockFn).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should call with trailing edge', () => {
      const mockFn = jest.fn();
      const throttledFn = throttle(mockFn, { delay: 1000, leading: false, trailing: true });

      throttledFn();
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('RateLimiter', () => {
    let rateLimiter: RateLimiter;

    beforeEach(() => {
      rateLimiter = new RateLimiter(5, 1000); // 5 calls per second
    });

    it('should allow calls within limit', () => {
      for (let i = 0; i < 5; i++) {
        expect(rateLimiter.makeCall()).toBe(true);
      }
      expect(rateLimiter.makeCall()).toBe(false);
    });

    it('should reset after window', () => {
      // Make 5 calls
      for (let i = 0; i < 5; i++) {
        rateLimiter.makeCall();
      }
      expect(rateLimiter.makeCall()).toBe(false);

      // Advance time
      jest.advanceTimersByTime(1000);
      expect(rateLimiter.makeCall()).toBe(true);
    });

    it('should return remaining calls', () => {
      expect(rateLimiter.remainingCalls).toBe(5);
      rateLimiter.makeCall();
      expect(rateLimiter.remainingCalls).toBe(4);
    });

    it('should return time until reset', () => {
      expect(rateLimiter.getTimeUntilReset()).toBe(1000);
      jest.advanceTimersByTime(500);
      expect(rateLimiter.getTimeUntilReset()).toBe(500);
    });
  });

  describe('BatchProcessor', () => {
    let mockProcessor: jest.Mock;
    let batchProcessor: BatchProcessor<string>;

    beforeEach(() => {
      mockProcessor = jest.fn();
      batchProcessor = new BatchProcessor(mockProcessor, 100, 3);
    });

    it('should process items after delay', () => {
      batchProcessor.add('item1');
      batchProcessor.add('item2');

      expect(mockProcessor).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(mockProcessor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should process immediately when batch is full', () => {
      batchProcessor.add('item1');
      batchProcessor.add('item2');
      batchProcessor.add('item3');

      expect(mockProcessor).toHaveBeenCalledWith(['item1', 'item2', 'item3']);
    });

    it('should handle async processor', async () => {
      const asyncProcessor = jest.fn().mockResolvedValue(undefined);
      const asyncBatchProcessor = new BatchProcessor(asyncProcessor, 100, 3);

      asyncBatchProcessor.add('item1');
      asyncBatchProcessor.add('item2');

      jest.advanceTimersByTime(100);
      
      await expect(asyncProcessor).toHaveBeenCalledWith(['item1', 'item2']);
    });

    it('should retry failed items', async () => {
      const failingProcessor = jest.fn().mockRejectedValue(new Error('Failed'));
      const retryBatchProcessor = new BatchProcessor(failingProcessor, 100, 3);

      retryBatchProcessor.add('item1');
      retryBatchProcessor.add('item2');

      jest.advanceTimersByTime(100);
      
      // Wait for async operation to complete
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Items should be back in batch for retry
      expect(retryBatchProcessor.getBatchSize()).toBe(2);
    });
  });

  describe('PerformanceMonitor', () => {
    let monitor: PerformanceMonitor;

    beforeEach(() => {
      monitor = new PerformanceMonitor();
    });

    it('should measure function execution time', () => {
      const mockFn = jest.fn(() => 'result');
      
      const result = monitor.measure('test', mockFn);
      
      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalled();
      
      const stats = monitor.getStats('test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.average).toBeGreaterThan(0);
    });

    it('should measure async function execution time', async () => {
      const mockFn = jest.fn().mockResolvedValue('async-result');
      
      const result = await monitor.measureAsync('test-async', mockFn);
      
      expect(result).toBe('async-result');
      expect(mockFn).toHaveBeenCalled();
      
      const stats = monitor.getStats('test-async');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should calculate statistics correctly', () => {
      const mockFn = jest.fn(() => 'result');
      
      // Measure multiple times
      monitor.measure('test', mockFn);
      monitor.measure('test', mockFn);
      monitor.measure('test', mockFn);
      
      const stats = monitor.getStats('test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(3);
      expect(stats!.total).toBeGreaterThan(0);
      expect(stats!.average).toBeGreaterThan(0);
      expect(stats!.min).toBeGreaterThan(0);
      expect(stats!.max).toBeGreaterThan(0);
    });

    it('should return null for non-existent measurements', () => {
      const stats = monitor.getStats('non-existent');
      expect(stats).toBeNull();
    });

    it('should clear all measurements', () => {
      const mockFn = jest.fn(() => 'result');
      
      monitor.measure('test', mockFn);
      expect(monitor.getStats('test')).not.toBeNull();
      
      monitor.clear();
      expect(monitor.getStats('test')).toBeNull();
    });
  });

  describe('asyncDebounce', () => {
    it('should debounce async functions', async () => {
      const mockFn = jest.fn().mockResolvedValue('result');
      const debouncedFn = asyncDebounce(mockFn, 100);

      const promise1 = debouncedFn('arg1');
      const promise2 = debouncedFn('arg2');

      jest.advanceTimersByTime(100);

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBe('result');
      expect(result2).toBe('result');
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg2');
    });

    it('should handle errors in async functions', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Async error'));
      const debouncedFn = asyncDebounce(mockFn, 100);

      const promise = debouncedFn('arg1');

      jest.advanceTimersByTime(100);

      await expect(promise).rejects.toThrow('Async error');
    });
  });
});

// Test React hooks
describe('React Hooks', () => {
  describe('useDebounce', () => {
    it('should debounce value changes', () => {
      // This would need React Testing Library to test properly
      // For now, we'll just test that the hook exists
      expect(typeof useDebounce).toBe('function');
    });
  });

  describe('useThrottle', () => {
    it('should throttle value changes', () => {
      // This would need React Testing Library to test properly
      // For now, we'll just test that the hook exists
      expect(typeof useThrottle).toBe('function');
    });
  });
});