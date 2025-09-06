/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfidenceIndicator } from '../ConfidenceIndicator';

describe('ConfidenceIndicator', () => {
  const mockProps = {
    confidence: 0.75,
    size: 'md' as const,
    showLabel: true,
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<ConfidenceIndicator confidence={0.5} />);
    
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('renders with custom size and label', () => {
    render(<ConfidenceIndicator {...mockProps} />);
    
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveClass('h-2');
  });

  it('displays correct color based on confidence level', () => {
    const { rerender } = render(<ConfidenceIndicator confidence={0.9} />);
    
    expect(screen.getByRole('progressbar')).toHaveClass('bg-green-500');
    
    rerender(<ConfidenceIndicator confidence={0.7} />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-yellow-500');
    
    rerender(<ConfidenceIndicator confidence={0.4} />);
    expect(screen.getByRole('progressbar')).toHaveClass('bg-red-500');
  });

  it('hides label when showLabel is false', () => {
    render(<ConfidenceIndicator confidence={0.5} showLabel={false} />);
    
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ConfidenceIndicator confidence={0.5} className="custom-class" />);
    
    const container = screen.getByRole('progressbar').parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('renders with small size', () => {
    render(<ConfidenceIndicator confidence={0.5} size="sm" />);
    
    expect(screen.getByRole('progressbar')).toHaveClass('h-1');
  });

  it('renders with large size', () => {
    render(<ConfidenceIndicator confidence={0.5} size="lg" />);
    
    expect(screen.getByRole('progressbar')).toHaveClass('h-4');
  });

  it('handles confidence boundary values', () => {
    const { rerender } = render(<ConfidenceIndicator confidence={0} />);
    
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveClass('bg-red-500');
    
    rerender(<ConfidenceIndicator confidence={1} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveClass('bg-green-500');
  });

  it('clips confidence values to valid range', () => {
    const { rerender } = render(<ConfidenceIndicator confidence={1.5} />);
    
    expect(screen.getByText('100%')).toBeInTheDocument();
    
    rerender(<ConfidenceIndicator confidence={-0.5} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});