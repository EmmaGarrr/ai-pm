/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TechnicalInstructionsBox } from '../TechnicalInstructionsBox';
import { format } from 'date-fns';

// Mock the date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-01 12:00'),
}));

describe('TechnicalInstructionsBox', () => {
  const mockProps = {
    content: 'const example = "technical instructions";',
    confidence: 0.9,
    timestamp: new Date('2024-01-01T12:00:00'),
    className: 'test-class',
    showCopyButton: true,
    language: 'javascript',
    isCode: true,
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
    render(<TechnicalInstructionsBox content="Test content" />);
    
    expect(screen.getByText('Test content')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /copy/i })).toBeInTheDocument();
  });

  it('renders with all props', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    expect(screen.getByText(mockProps.content)).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 12:00')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /copy/i })).toBeInTheDocument();
  });

  it('hides copy button when showCopyButton is false', () => {
    render(<TechnicalInstructionsBox content="Test content" showCopyButton={false} />);
    
    expect(screen.queryByRole('img', { name: /copy/i })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TechnicalInstructionsBox content="Test content" className="custom-class" />);
    
    const container = screen.getByText('Test content').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('copies content to clipboard when copy button is clicked', async () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockProps.content);
    });
  });

  it('shows confidence indicator with correct props', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    const confidenceIndicator = screen.getByText('90%').closest('div');
    expect(confidenceIndicator).toBeInTheDocument();
  });

  it('handles missing timestamp gracefully', () => {
    render(<TechnicalInstructionsBox content="Test content" />);
    
    expect(screen.queryByText('2024-01-01 12:00')).not.toBeInTheDocument();
  });

  it('handles missing confidence gracefully', () => {
    render(<TechnicalInstructionsBox content="Test content" />);
    
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('formats timestamp correctly', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    expect(format).toHaveBeenCalledWith(mockProps.timestamp, 'MMM dd, yyyy HH:mm');
  });

  it('has proper accessibility attributes', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    expect(copyButton).toHaveAttribute('aria-label', 'Copy instructions');
  });

  it('renders with green styling', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    const container = screen.getByText(mockProps.content).closest('div');
    expect(container).toHaveClass('bg-green-50');
    expect(container).toHaveClass('border-green-200');
  });

  it('handles clipboard errors gracefully', async () => {
    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    navigator.clipboard.writeText = jest.fn().mockRejectedValue(new Error('Clipboard error'));
    
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalled();
    });
    
    mockConsoleError.mockRestore();
  });

  it('renders code with syntax highlighting when isCode is true', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    const codeElement = screen.getByText(mockProps.content);
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName).toBe('CODE');
  });

  it('renders plain text when isCode is false', () => {
    render(<TechnicalInstructionsBox {...mockProps} isCode={false} />);
    
    const contentElement = screen.getByText(mockProps.content);
    expect(contentElement).toBeInTheDocument();
    expect(contentElement.tagName).not.toBe('CODE');
  });

  it('displays language badge when isCode is true', () => {
    render(<TechnicalInstructionsBox {...mockProps} />);
    
    expect(screen.getByText(mockProps.language?.toUpperCase() || 'CODE')).toBeInTheDocument();
  });

  it('hides language badge when isCode is false', () => {
    render(<TechnicalInstructionsBox {...mockProps} isCode={false} />);
    
    expect(screen.queryByText('JAVASCRIPT')).not.toBeInTheDocument();
  });

  it('handles different programming languages', () => {
    const { rerender } = render(<TechnicalInstructionsBox content="print('hello')" language="python" isCode={true} />);
    
    expect(screen.getByText('PYTHON')).toBeInTheDocument();
    
    rerender(<TechnicalInstructionsBox content="<div>test</div>" language="html" isCode={true} />);
    expect(screen.getByText('HTML')).toBeInTheDocument();
    
    rerender(<TechnicalInstructionsBox content="SELECT * FROM table" language="sql" isCode={true} />);
    expect(screen.getByText('SQL')).toBeInTheDocument();
  });

  it('handles empty language gracefully', () => {
    render(<TechnicalInstructionsBox content="test" language="" isCode={true} />);
    
    expect(screen.getByText('CODE')).toBeInTheDocument();
  });

  it('preserves whitespace and formatting in code', () => {
    const codeContent = `function test() {
  console.log('hello');
  return true;
}`;
    
    render(<TechnicalInstructionsBox content={codeContent} language="javascript" isCode={true} />);
    
    const codeElement = screen.getByText(/function test/);
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.textContent).toContain('console.log');
  });
});