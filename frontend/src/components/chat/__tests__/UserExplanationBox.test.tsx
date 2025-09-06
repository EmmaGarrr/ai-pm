/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserExplanationBox } from '../UserExplanationBox';
import { format } from 'date-fns';

// Mock the date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-01 12:00'),
}));

describe('UserExplanationBox', () => {
  const mockProps = {
    content: 'This is a user-friendly explanation of the task.',
    confidence: 0.85,
    timestamp: new Date('2024-01-01T12:00:00'),
    className: 'test-class',
    showCopyButton: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('renders with default props', () => {
    render(<UserExplanationBox content="Test content" />);
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /copy/i })).toBeInTheDocument();
  });

  it('renders with all props', () => {
    render(<UserExplanationBox {...mockProps} />);
    
    expect(screen.getByText(mockProps.content)).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 12:00')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /copy/i })).toBeInTheDocument();
  });

  it('hides copy button when showCopyButton is false', () => {
    render(<UserExplanationBox content="Test content" showCopyButton={false} />);
    
    expect(screen.queryByRole('img', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<UserExplanationBox content="Test content" className="custom-class" />);
    
    const container = screen.getByText('Test content').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('copies content to clipboard when copy button is clicked', async () => {
    render(<UserExplanationBox {...mockProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockProps.content);
    });
  });

  it('shows confidence indicator with correct props', () => {
    render(<UserExplanationBox {...mockProps} />);
    
    const confidenceIndicator = screen.getByText('85%').closest('div');
    expect(confidenceIndicator).toBeInTheDocument();
  });

  it('handles missing timestamp gracefully', () => {
    render(<UserExplanationBox content="Test content" />);
    
    expect(screen.queryByText('2024-01-01 12:00')).not.toBeInTheDocument();
  });

  it('handles missing confidence gracefully', () => {
    render(<UserExplanationBox content="Test content" />);
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    render(<UserExplanationBox {...mockProps} />);
    
    expect(format).toHaveBeenCalledWith(mockProps.timestamp, 'MMM dd, yyyy HH:mm');
  });

  it('has proper accessibility attributes', () => {
    render(<UserExplanationBox {...mockProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toHaveAttribute('aria-label', 'Copy explanation');
  });

  it('renders with blue styling', () => {
    render(<UserExplanationBox {...mockProps} />);
    
    const container = screen.getByText(mockProps.content).closest('div');
    expect(container).toHaveClass('bg-blue-50');
    expect(container).toHaveClass('border-blue-200');
  });

  it('handles clipboard errors gracefully', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    
    render(<UserExplanationBox {...mockProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalled();
    });
    
    mockConsoleError.mockRestore();
  });
});