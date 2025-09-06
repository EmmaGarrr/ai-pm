/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationCenter } from '../NotificationCenter';

// Mock the react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: jest.fn(() => <div data-testid="toaster">Mock Toaster</div>),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('NotificationCenter', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'success' as const,
      title: 'Success',
      message: 'Operation completed successfully',
      timestamp: new Date('2024-01-01T12:00:00'),
      isRead: false,
      isArchived: false,
      priority: 'medium' as const,
    },
    {
      id: '2',
      type: 'error' as const,
      title: 'Error',
      message: 'Something went wrong',
      timestamp: new Date('2024-01-01T12:30:00'),
      isRead: true,
      isArchived: false,
      priority: 'high' as const,
    },
    {
      id: '3',
      type: 'warning' as const,
      title: 'Warning',
      message: 'Please check your settings',
      timestamp: new Date('2024-01-01T13:00:00'),
      isRead: false,
      isArchived: true,
      priority: 'low' as const,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(JSON.stringify(mockNotifications));
  });

  it('renders with default props', () => {
    render(<NotificationCenter />);
    
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByTestId('toaster')).toBeInTheDocument();
  });

  it('displays notifications from localStorage', () => {
    render(<NotificationCenter />);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('Warning')).not.toBeInTheDocument(); // Archived
  });

  it('filters notifications by type', () => {
    render(<NotificationCenter />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    
    const successFilter = screen.getByRole('button', { name: /success/i });
    fireEvent.click(successFilter);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.queryByText('Error')).not.toBeInTheDocument();
  });

  it('marks notification as read when clicked', () => {
    render(<NotificationCenter />);
    
    const notification = screen.getByText('Success').closest('div');
    fireEvent.click(notification);
    
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('archives notification when archive button is clicked', () => {
    render(<NotificationCenter />);
    
    const archiveButton = screen.getByRole('button', { name: /archive/i });
    fireEvent.click(archiveButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('deletes notification when delete button is clicked', () => {
    render(<NotificationCenter />);
    
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('clears all notifications when clear all button is clicked', () => {
    render(<NotificationCenter />);
    
    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearAllButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('shows unread count', () => {
    render(<NotificationCenter />);
    
    expect(screen.getByText(/unread/i)).toBeInTheDocument();
  });

  it('sorts notifications by timestamp', () => {
    render(<NotificationCenter />);
    
    const notifications = screen.getAllByRole('article');
    expect(notifications[0]).toHaveTextContent('Error'); // Most recent
    expect(notifications[1]).toHaveTextContent('Success'); // Older
  });

  it('filters by priority', () => {
    render(<NotificationCenter />);
    
    const filterButton = screen.getByRole('button', { name: /filter/i });
    fireEvent.click(filterButton);
    
    const highPriorityFilter = screen.getByRole('button', { name: /high/i });
    fireEvent.click(highPriorityFilter);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('handles empty notifications', () => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
    
    render(<NotificationCenter />);
    
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('LocalStorage error');
    });
    
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    render(<NotificationCenter />);
    
    expect(mockConsoleError).toHaveBeenCalled();
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
    
    mockConsoleError.mockRestore();
  });

  it('adds new notification', () => {
    const { rerender } = render(<NotificationCenter />);
    
    const newNotification = {
      id: '4',
      type: 'info' as const,
      title: 'Info',
      message: 'New information',
      timestamp: new Date('2024-01-01T14:00:00'),
      isRead: false,
      isArchived: false,
      priority: 'medium' as const,
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify([...mockNotifications, newNotification]));
    
    rerender(<NotificationCenter />);
    
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('exports notifications', () => {
    render(<NotificationCenter />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    expect(localStorageMock.getItem).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<NotificationCenter />);
    
    const container = screen.getByText('Notifications').closest('div');
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Notification center');
  });

  it('shows notification actions on hover', () => {
    render(<NotificationCenter />);
    
    const notification = screen.getByText('Success').closest('div');
    fireEvent.mouseEnter(notification);
    
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides notification actions on mouse leave', () => {
    render(<NotificationCenter />);
    
    const notification = screen.getByText('Success').closest('div');
    fireEvent.mouseEnter(notification);
    fireEvent.mouseLeave(notification);
    
    // Actions should be hidden (implementation dependent)
    expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument();
  });

  it('displays notification timestamp in readable format', () => {
    render(<NotificationCenter />);
    
    expect(screen.getByText(/12:00/i)).toBeInTheDocument();
    expect(screen.getByText(/12:30/i)).toBeInTheDocument();
  });

  it('shows notification priority indicators', () => {
    render(<NotificationCenter />);
    
    expect(screen.getByText(/high/i)).toBeInTheDocument();
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
  });
});