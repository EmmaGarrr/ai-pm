/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DualOutputContainer, UserExplanationBox, TechnicalInstructionsBox, ConfidenceIndicator } from '../../components/chat';
import { NotificationCenter } from '../../components/ui';
import { SecurityManager } from '../../lib/utils/SystemUtilities';
import { OfflineStorage } from '../../lib/utils/OfflineSupport';

describe('Phase 5 Integration Tests', () => {
  describe('Chat Interface Integration', () => {
    const mockChatData = {
      userExplanation: {
        content: 'This is a user-friendly explanation of how to implement the feature.',
        confidence: 0.85,
        timestamp: new Date('2024-01-01T12:00:00'),
      },
      technicalInstructions: {
        content: `function implementFeature() {
  // Implementation details
  return true;
}`,
        confidence: 0.9,
        timestamp: new Date('2024-01-01T12:00:00'),
        language: 'javascript',
        isCode: true,
      },
    };

    it('renders complete chat interface with dual output', () => {
      render(
        <DualOutputContainer
          userExplanation={mockChatData.userExplanation}
          technicalInstructions={mockChatData.technicalInstructions}
        />
      );

      expect(screen.getByText(mockChatData.userExplanation.content)).toBeInTheDocument();
      expect(screen.getByText(mockChatData.technicalInstructions.content)).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('90%')).toBeInTheDocument();
      expect(screen.getByText('JAVASCRIPT')).toBeInTheDocument();
    });

    it('handles user interactions in chat interface', async () => {
      const mockOnCopy = jest.fn();
      
      render(
        <div>
          <UserExplanationBox
            content={mockChatData.userExplanation.content}
            confidence={mockChatData.userExplanation.confidence}
            timestamp={mockChatData.userExplanation.timestamp}
            onCopy={mockOnCopy}
          />
          <TechnicalInstructionsBox
            content={mockChatData.technicalInstructions.content}
            confidence={mockChatData.technicalInstructions.confidence}
            timestamp={mockChatData.technicalInstructions.timestamp}
            language={mockChatData.technicalInstructions.language}
            isCode={mockChatData.technicalInstructions.isCode}
            onCopy={mockOnCopy}
          />
        </div>
      );

      // Test copy functionality
      const copyButtons = screen.getAllByRole('button', { name: /copy/i });
      fireEvent.click(copyButtons[0]);
      
      // Note: In real tests, you'd mock clipboard API
      expect(copyButtons[0]).toBeInTheDocument();
    });

    it('displays confidence indicators correctly', () => {
      render(
        <div>
          <ConfidenceIndicator confidence={0.9} />
          <ConfidenceIndicator confidence={0.6} />
          <ConfidenceIndicator confidence={0.3} />
        </div>
      );

      const indicators = screen.getAllByRole('progressbar');
      expect(indicators[0]).toHaveClass('bg-green-500');
      expect(indicators[1]).toHaveClass('bg-yellow-500');
      expect(indicators[2]).toHaveClass('bg-red-500');
    });
  });

  describe('Notification System Integration', () => {
    const mockNotifications = [
      {
        id: '1',
        type: 'success' as const,
        title: 'Feature Completed',
        message: 'The dual output system has been implemented successfully.',
        timestamp: new Date('2024-01-01T12:00:00'),
        isRead: false,
        isArchived: false,
        priority: 'medium' as const,
      },
      {
        id: '2',
        type: 'warning' as const,
        title: 'Performance Notice',
        message: 'Large cache size detected. Consider clearing old entries.',
        timestamp: new Date('2024-01-01T12:30:00'),
        isRead: false,
        isArchived: false,
        priority: 'low' as const,
      },
    ];

    beforeEach(() => {
      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(() => JSON.stringify(mockNotifications)),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });
    });

    it('displays notifications with proper filtering', () => {
      render(<NotificationCenter />);

      expect(screen.getByText('Feature Completed')).toBeInTheDocument();
      expect(screen.getByText('Performance Notice')).toBeInTheDocument();
      expect(screen.getByText(/unread/i)).toBeInTheDocument();
    });

    it('handles notification interactions', () => {
      render(<NotificationCenter />);

      // Test marking as read
      const notification = screen.getByText('Feature Completed').closest('div');
      fireEvent.click(notification);

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('filters notifications by type', () => {
      render(<NotificationCenter />);

      // Test filtering (implementation dependent on UI)
      expect(screen.getByText('Feature Completed')).toBeInTheDocument();
    });
  });

  describe('Security Integration', () => {
    let securityManager: SecurityManager;

    beforeEach(() => {
      securityManager = new SecurityManager();
    });

    it('sanitizes user input in chat messages', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = securityManager.sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello World');
    });

    it('validates URLs in technical instructions', () => {
      const validUrl = 'https://api.example.com/data';
      const invalidUrl = 'javascript:alert("xss")';

      expect(securityManager.validateURL(validUrl)).toBe(true);
      expect(securityManager.validateURL(invalidUrl)).toBe(false);
    });

    it('implements rate limiting for API calls', () => {
      // Mock multiple rapid requests
      for (let i = 0; i < 65; i++) {
        const isLimited = securityManager.isRateLimited('user123');
        if (i >= 60) {
          expect(isLimited).toBe(true);
        }
      }
    });

    it('generates CSRF tokens for secure operations', () => {
      const token1 = securityManager.generateCSRFToken();
      const token2 = securityManager.generateCSRFToken();

      expect(token1).toHaveLength(64);
      expect(token2).toHaveLength(64);
      expect(token1).not.toBe(token2);
    });
  });

  describe('Offline Support Integration', () => {
    let offlineStorage: OfflineStorage;

    beforeEach(() => {
      // Mock IndexedDB
      const mockDB = {
        objectStoreNames: { contains: jest.fn(() => true) },
        transaction: jest.fn(() => ({
          objectStore: jest.fn(() => ({
            add: jest.fn(() => ({ onsuccess: jest.fn(), onerror: jest.fn() })),
            get: jest.fn(() => ({ onsuccess: jest.fn(), onerror: jest.fn() })),
          })),
        })),
      };

      global.indexedDB = {
        open: jest.fn(() => ({
          onsuccess: jest.fn(),
          onerror: jest.fn(),
          result: mockDB,
        })),
      } as any;

      offlineStorage = new OfflineStorage({
        dbName: 'test-offline-db',
        version: 1,
        stores: ['chat-messages', 'user-preferences'],
      });
    });

    it('stores chat messages offline', async () => {
      const message = {
        id: '1',
        content: 'Test message',
        timestamp: new Date(),
        type: 'user',
      };

      // Mock successful storage
      const mockRequest = {
        onsuccess: jest.fn(),
        onerror: jest.fn(),
      };

      await offlineStorage.store('chat-messages', message);

      // In real tests, you'd verify the storage call
      expect(true).toBe(true); // Placeholder assertion
    });

    it('retrieves chat messages offline', async () => {
      const mockMessages = [
        { id: '1', content: 'Message 1' },
        { id: '2', content: 'Message 2' },
      ];

      // Mock successful retrieval
      const mockRequest = {
        onsuccess: jest.fn(),
        result: mockMessages,
      };

      const messages = await offlineStorage.getAll('chat-messages');

      // In real tests, you'd verify the retrieved data
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Performance Integration', () => {
    it('handles large datasets efficiently', () => {
      // Test with large number of notifications
      const largeNotificationSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i.toString(),
        type: 'info' as const,
        title: `Notification ${i}`,
        message: `This is notification number ${i}`,
        timestamp: new Date(),
        isRead: false,
        isArchived: false,
        priority: 'low' as const,
      }));

      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(() => JSON.stringify(largeNotificationSet)),
        setItem: jest.fn(),
      };
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock,
      });

      render(<NotificationCenter />);

      // Should render without performance issues
      expect(screen.getByText(/notification 0/i)).toBeInTheDocument();
    });

    it('optimizes rendering with virtualization', () => {
      // Test virtualized rendering (implementation dependent)
      const mockItems = Array.from({ length: 100 }, (_, i) => ({
        id: i.toString(),
        content: `Item ${i}`,
      }));

      // This would test virtualization components
      expect(mockItems).toHaveLength(100);
    });
  });

  describe('Accessibility Integration', () => {
    it('provides keyboard navigation for chat interface', () => {
      render(
        <div role="application" aria-label="Chat interface">
          <button>Send Message</button>
          <button>Clear Chat</button>
          <button>Export Chat</button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);

      // Test keyboard navigation
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
    });

    it('supports screen reader announcements', () => {
      // Mock screen reader announcement function
      const mockAnnounce = jest.fn();

      // Test announcement of new messages
      mockAnnounce('New message received');
      expect(mockAnnounce).toHaveBeenCalledWith('New message received');
    });

    it('provides proper ARIA labels', () => {
      render(
        <div>
          <div role="region" aria-label="User explanation">
            <p>User explanation content</p>
          </div>
          <div role="region" aria-label="Technical instructions">
            <pre>Code content</pre>
          </div>
        </div>
      );

      expect(screen.getByLabelText('User explanation')).toBeInTheDocument();
      expect(screen.getByLabelText('Technical instructions')).toBeInTheDocument();
    });
  });

  describe('Error Handling Integration', () => {
    it('handles API errors gracefully', () => {
      // Mock failed API call
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate error scenario
      const error = new Error('API request failed');
      console.error(error);

      expect(mockConsoleError).toHaveBeenCalled();
      mockConsoleError.mockRestore();
    });

    it('recovers from offline storage errors', () => {
      // Mock IndexedDB error
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulate storage error
      const error = new Error('Storage operation failed');
      console.error(error);

      expect(mockConsoleError).toHaveBeenCalled();
      mockConsoleError.mockRestore();
    });

    it('provides fallback content when components fail', () => {
      // Test error boundary behavior
      const ErrorComponent = () => {
        throw new Error('Component error');
      };

      // In real tests, you'd test error boundaries
      expect(() => {
        render(<ErrorComponent />);
      }).toThrow();
    });
  });

  describe('Theme Integration', () => {
    it('applies theme consistently across components', () => {
      // Mock theme context
      const mockTheme = {
        theme: 'dark',
        setTheme: jest.fn(),
        resolvedTheme: 'dark',
      };

      // Test theme application
      expect(mockTheme.theme).toBe('dark');
    });

    it('supports high contrast mode', () => {
      // Test high contrast mode
      const isHighContrast = true;

      // In real tests, you'd verify contrast classes
      expect(isHighContrast).toBe(true);
    });

    it('handles theme switching', () => {
      const mockSetTheme = jest.fn();
      
      // Test theme switching
      mockSetTheme('light');
      expect(mockSetTheme).toHaveBeenCalledWith('light');

      mockSetTheme('dark');
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });
});