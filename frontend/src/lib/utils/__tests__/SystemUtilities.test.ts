/**
 * @jest-environment jsdom
 */

import { SecurityManager } from '../SystemUtilities';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock document
    Object.defineProperty(global, 'document', {
      value: {
        createElement: jest.fn(() => ({
          setAttribute: jest.fn(),
          appendChild: jest.fn(),
        })),
        head: {
          appendChild: jest.fn(),
        },
        addEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
      },
      writable: true,
    });
    
    securityManager = new SecurityManager();
  });

  describe('Input Sanitization', () => {
    it('sanitizes script tags', () => {
      const maliciousInput = '<script>alert("xss")</script>';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('</script>');
    });

    it('sanitizes javascript URLs', () => {
      const maliciousInput = 'javascript:alert("xss")';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('javascript:');
    });

    it('sanitizes iframe tags', () => {
      const maliciousInput = '<iframe src="malicious.com"></iframe>';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).not.toContain('</iframe>');
    });

    it('sanitizes on* event handlers', () => {
      const maliciousInput = '<div onclick="alert(\'xss\')">Click me</div>';
      const sanitized = securityManager.sanitizeInput(maliciousInput);
      expect(sanitized).not.toContain('onclick');
    });

    it('encodes HTML entities', () => {
      const input = '<div>&"\'/</div>';
      const sanitized = securityManager.sanitizeInput(input);
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&quot;');
      expect(sanitized).toContain('&#x27;');
      expect(sanitized).toContain('&#x2F;');
    });

    it('allows safe HTML content', () => {
      const safeInput = '<p>This is <strong>safe</strong> content.</p>';
      const sanitized = securityManager.sanitizeInput(safeInput);
      expect(sanitized).toContain('This is');
      expect(sanitized).toContain('safe');
      expect(sanitized).toContain('content');
    });

    it('handles empty input', () => {
      const sanitized = securityManager.sanitizeInput('');
      expect(sanitized).toBe('');
    });

    it('handles null/undefined input', () => {
      const sanitized1 = securityManager.sanitizeInput(null as any);
      const sanitized2 = securityManager.sanitizeInput(undefined as any);
      expect(sanitized1).toBe('');
      expect(sanitized2).toBe('');
    });
  });

  describe('HTML Sanitization', () => {
    it('removes script tags from HTML', () => {
      const maliciousHTML = '<div><script>alert("xss")</script><p>Content</p></div>';
      const sanitized = securityManager.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>Content</p>');
    });

    it('removes iframe tags from HTML', () => {
      const maliciousHTML = '<div><iframe src="evil.com"></iframe><p>Content</p></div>';
      const sanitized = securityManager.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).toContain('<p>Content</p>');
    });

    it('removes event handlers from HTML', () => {
      const maliciousHTML = '<div onclick="alert(\'xss\')" onmouseover="evil()">Content</div>';
      const sanitized = securityManager.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onmouseover');
      expect(sanitized).toContain('Content');
    });

    it('removes javascript URLs from HTML', () => {
      const maliciousHTML = '<a href="javascript:alert(\'xss\')">Link</a>';
      const sanitized = securityManager.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('javascript:');
    });

    it('removes data URLs with HTML content', () => {
      const maliciousHTML = '<object data="data:text/html,<script>alert(\'xss\')</script>"></object>';
      const sanitized = securityManager.sanitizeHTML(maliciousHTML);
      expect(sanitized).not.toContain('data:text/html');
    });

    it('preserves safe HTML attributes', () => {
      const safeHTML = '<div class="test" id="main" data-value="123">Content</div>';
      const sanitized = securityManager.sanitizeHTML(safeHTML);
      expect(sanitized).toContain('class="test"');
      expect(sanitized).toContain('id="main"');
      expect(sanitized).toContain('data-value="123"');
      expect(sanitized).toContain('Content');
    });
  });

  describe('Origin Validation', () => {
    it('allows valid origins', () => {
      securityManager.updateConfig({ allowedOrigins: ['https://example.com', 'https://app.example.com'] });
      
      expect(securityManager.validateOrigin('https://example.com')).toBe(true);
      expect(securityManager.validateOrigin('https://app.example.com')).toBe(true);
    });

    it('blocks invalid origins', () => {
      securityManager.updateConfig({ allowedOrigins: ['https://example.com'] });
      
      expect(securityManager.validateOrigin('https://malicious.com')).toBe(false);
      expect(securityManager.validateOrigin('https://evil.example.com')).toBe(false);
    });

    it('allows all origins with wildcard', () => {
      securityManager.updateConfig({ allowedOrigins: ['*'] });
      
      expect(securityManager.validateOrigin('https://any-domain.com')).toBe(true);
      expect(securityManager.validateOrigin('https://malicious.com')).toBe(true);
    });

    it('handles empty origin list', () => {
      securityManager.updateConfig({ allowedOrigins: [] });
      
      expect(securityManager.validateOrigin('https://example.com')).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Mock Date.now() for consistent testing
      jest.spyOn(Date, 'now').mockReturnValue(1000000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('allows requests under limit', () => {
      securityManager.updateConfig({ maxRequestsPerMinute: 5 });
      
      for (let i = 0; i < 5; i++) {
        expect(securityManager.isRateLimited('user123')).toBe(false);
      }
    });

    it('blocks requests over limit', () => {
      securityManager.updateConfig({ maxRequestsPerMinute: 3 });
      
      // First 3 requests should be allowed
      for (let i = 0; i < 3; i++) {
        expect(securityManager.isRateLimited('user123')).toBe(false);
      }
      
      // 4th request should be blocked
      expect(securityManager.isRateLimited('user123')).toBe(true);
    });

    it('resets rate limit after time window', () => {
      securityManager.updateConfig({ maxRequestsPerMinute: 2 });
      
      // First 2 requests
      expect(securityManager.isRateLimited('user123')).toBe(false);
      expect(securityManager.isRateLimited('user123')).toBe(false);
      
      // 3rd request should be blocked
      expect(securityManager.isRateLimited('user123')).toBe(true);
      
      // Advance time by 1 minute
      Date.now.mockReturnValue(1000000 + 60000);
      
      // Request should now be allowed
      expect(securityManager.isRateLimited('user123')).toBe(false);
    });

    it('handles different users independently', () => {
      securityManager.updateConfig({ maxRequestsPerMinute: 2 });
      
      // User 1 makes 2 requests
      expect(securityManager.isRateLimited('user1')).toBe(false);
      expect(securityManager.isRateLimited('user1')).toBe(false);
      expect(securityManager.isRateLimited('user1')).toBe(true);
      
      // User 2 should still be able to make requests
      expect(securityManager.isRateLimited('user2')).toBe(false);
      expect(securityManager.isRateLimited('user2')).toBe(false);
    });

    it('handles disabled rate limiting', () => {
      securityManager.updateConfig({ enableRateLimiting: false, maxRequestsPerMinute: 1 });
      
      // Should allow unlimited requests
      for (let i = 0; i < 10; i++) {
        expect(securityManager.isRateLimited('user123')).toBe(false);
      }
    });
  });

  describe('Email Validation', () => {
    it('validates correct email addresses', () => {
      expect(securityManager.validateEmail('user@example.com')).toBe(true);
      expect(securityManager.validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(securityManager.validateEmail('user_name@sub.domain.com')).toBe(true);
    });

    it('rejects invalid email addresses', () => {
      expect(securityManager.validateEmail('invalid-email')).toBe(false);
      expect(securityManager.validateEmail('@example.com')).toBe(false);
      expect(securityManager.validateEmail('user@')).toBe(false);
      expect(securityManager.validateEmail('user@domain')).toBe(false);
      expect(securityManager.validateEmail('user.domain.com')).toBe(false);
      expect(securityManager.validateEmail('')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('validates correct URLs', () => {
      expect(securityManager.validateURL('https://example.com')).toBe(true);
      expect(securityManager.validateURL('http://domain.com/path')).toBe(true);
      expect(securityManager.validateURL('https://sub.domain.com:8080/path?query=value')).toBe(true);
      expect(securityManager.validateURL('ftp://server.com')).toBe(true);
    });

    it('rejects invalid URLs', () => {
      expect(securityManager.validateURL('not-a-url')).toBe(false);
      expect(securityManager.validateURL('javascript:alert("xss")')).toBe(false);
      expect(securityManager.validateURL('')).toBe(false);
      expect(securityManager.validateURL('example.com')).toBe(false); // Missing protocol
    });
  });

  describe('CSRF Token Generation', () => {
    it('generates unique tokens', () => {
      const token1 = securityManager.generateCSRFToken();
      const token2 = securityManager.generateCSRFToken();
      
      expect(token1).toHaveLength(64); // 32 bytes * 2 hex characters
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });

    it('generates valid hex strings', () => {
      const token = securityManager.generateCSRFToken();
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
    });
  });

  describe('Configuration Updates', () => {
    it('updates configuration correctly', () => {
      const newConfig = {
        maxRequestsPerMinute: 100,
        allowedOrigins: ['https://new-domain.com'],
        enableXSSProtection: false,
      };
      
      securityManager.updateConfig(newConfig);
      
      // Test that the new configuration is applied
      expect(securityManager.isRateLimited('user123')).toBe(false); // Should allow many requests
    });

    it('merges configuration with existing settings', () => {
      const originalConfig = {
        enableCSP: true,
        enableXSSProtection: true,
        maxRequestsPerMinute: 60,
      };
      
      securityManager = new SecurityManager(originalConfig);
      
      const partialUpdate = {
        maxRequestsPerMinute: 120,
      };
      
      securityManager.updateConfig(partialUpdate);
      
      // Should keep original settings and update only specified ones
      expect(securityManager.isRateLimited('user123')).toBe(false);
    });
  });

  describe('Input Event Listener', () => {
    it('sets up input validation listeners', () => {
      const mockAddEventListener = jest.fn();
      global.document.addEventListener = mockAddEventListener;
      
      securityManager = new SecurityManager({ enableInputSanitization: true });
      
      expect(mockAddEventListener).toHaveBeenCalledWith('input', expect.any(Function));
    });

    it('does not set up listeners when disabled', () => {
      const mockAddEventListener = jest.fn();
      global.document.addEventListener = mockAddEventListener;
      
      securityManager = new SecurityManager({ enableInputSanitization: false });
      
      expect(mockAddEventListener).not.toHaveBeenCalledWith('input', expect.any(Function));
    });
  });
});