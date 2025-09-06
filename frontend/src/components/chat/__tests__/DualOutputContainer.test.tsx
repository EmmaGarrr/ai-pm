/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DualOutputContainer } from '../DualOutputContainer';

// Mock the child components
jest.mock('../UserExplanationBox', () => ({
  UserExplanationBox: jest.fn(({ content, confidence, timestamp, showCopyButton, className }) => (
    <div data-testid="user-explanation-box" className={className}>
      <div data-testid="user-content">{content}</div>
      <div data-testid="user-confidence">{confidence}</div>
      <div data-testid="user-timestamp">{timestamp?.toISOString()}</div>
      <div data-testid="user-show-copy">{showCopyButton.toString()}</div>
    </div>
  )),
}));

jest.mock('../TechnicalInstructionsBox', () => ({
  TechnicalInstructionsBox: jest.fn(({ content, confidence, timestamp, showCopyButton, className, language, isCode }) => (
    <div data-testid="technical-instructions-box" className={className}>
      <div data-testid="technical-content">{content}</div>
      <div data-testid="technical-confidence">{confidence}</div>
      <div data-testid="technical-timestamp">{timestamp?.toISOString()}</div>
      <div data-testid="technical-show-copy">{showCopyButton.toString()}</div>
      <div data-testid="technical-language">{language}</div>
      <div data-testid="technical-is-code">{isCode.toString()}</div>
    </div>
  )),
}));

describe('DualOutputContainer', () => {
  const mockProps = {
    userExplanation: {
      content: 'This is a user-friendly explanation of the task.',
      confidence: 0.85,
      timestamp: new Date('2024-01-01T12:00:00'),
    },
    technicalInstructions: {
      content: 'const example = "technical instructions";',
      confidence: 0.9,
      timestamp: new Date('2024-01-01T12:00:00'),
      language: 'javascript',
      isCode: true,
    },
    showCopyButtons: true,
    className: 'test-class',
    layout: 'vertical' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<DualOutputContainer />);
    
    expect(screen.getByTestId('user-explanation-box')).toBeInTheDocument();
    expect(screen.getByTestId('technical-instructions-box')).toBeInTheDocument();
  });

  it('renders with all props', () => {
    render(<DualOutputContainer {...mockProps} />);
    
    const userBox = screen.getByTestId('user-explanation-box');
    const technicalBox = screen.getByTestId('technical-instructions-box');
    
    expect(userBox).toBeInTheDocument();
    expect(technicalBox).toBeInTheDocument();
    expect(userBox).toHaveClass('test-class');
    expect(technicalBox).toHaveClass('test-class');
  });

  it('passes correct props to UserExplanationBox', () => {
    render(<DualOutputContainer {...mockProps} />);
    
    expect(screen.getByTestId('user-content')).toHaveTextContent(mockProps.userExplanation.content);
    expect(screen.getByTestId('user-confidence')).toHaveTextContent(mockProps.userExplanation.confidence.toString());
    expect(screen.getByTestId('user-timestamp')).toHaveTextContent(mockProps.userExplanation.timestamp?.toISOString());
    expect(screen.getByTestId('user-show-copy')).toHaveTextContent(mockProps.showCopyButtons.toString());
  });

  it('passes correct props to TechnicalInstructionsBox', () => {
    render(<DualOutputContainer {...mockProps} />);
    
    expect(screen.getByTestId('technical-content')).toHaveTextContent(mockProps.technicalInstructions.content);
    expect(screen.getByTestId('technical-confidence')).toHaveTextContent(mockProps.technicalInstructions.confidence.toString());
    expect(screen.getByTestId('technical-timestamp')).toHaveTextContent(mockProps.technicalInstructions.timestamp?.toISOString());
    expect(screen.getByTestId('technical-show-copy')).toHaveTextContent(mockProps.showCopyButtons.toString());
    expect(screen.getByTestId('technical-language')).toHaveTextContent(mockProps.technicalInstructions.language);
    expect(screen.getByTestId('technical-is-code')).toHaveTextContent(mockProps.technicalInstructions.isCode.toString());
  });

  it('applies custom className', () => {
    render(<DualOutputContainer {...mockProps} className="custom-class" />);
    
    const container = screen.getByTestId('user-explanation-box').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('renders with vertical layout', () => {
    render(<DualOutputContainer {...mockProps} layout="vertical" />);
    
    const container = screen.getByTestId('user-explanation-box').closest('div');
    expect(container).toHaveClass('flex-col');
  });

  it('renders with horizontal layout', () => {
    render(<DualOutputContainer {...mockProps} layout="horizontal" />);
    
    const container = screen.getByTestId('user-explanation-box').closest('div');
    expect(container).toHaveClass('flex-row');
  });

  it('hides copy buttons when showCopyButtons is false', () => {
    render(<DualOutputContainer {...mockProps} showCopyButtons={false} />);
    
    expect(screen.getByTestId('user-show-copy')).toHaveTextContent('false');
    expect(screen.getByTestId('technical-show-copy')).toHaveTextContent('false');
  });

  it('handles missing user explanation gracefully', () => {
    render(<DualOutputContainer technicalInstructions={mockProps.technicalInstructions} />);
    
    expect(screen.getByTestId('user-explanation-box')).toBeInTheDocument();
    expect(screen.getByTestId('technical-instructions-box')).toBeInTheDocument();
  });

  it('handles missing technical instructions gracefully', () => {
    render(<DualOutputContainer userExplanation={mockProps.userExplanation} />);
    
    expect(screen.getByTestId('user-explanation-box')).toBeInTheDocument();
    expect(screen.getByTestId('technical-instructions-box')).toBeInTheDocument();
  });

  it('handles missing timestamps gracefully', () => {
    const propsWithoutTimestamps = {
      userExplanation: {
        content: 'User explanation',
        confidence: 0.8,
      },
      technicalInstructions: {
        content: 'Technical instructions',
        confidence: 0.9,
        language: 'javascript',
        isCode: true,
      },
    };
    
    render(<DualOutputContainer {...propsWithoutTimestamps} />);
    
    expect(screen.getByTestId('user-explanation-box')).toBeInTheDocument();
    expect(screen.getByTestId('technical-instructions-box')).toBeInTheDocument();
  });

  it('handles missing confidence values gracefully', () => {
    const propsWithoutConfidence = {
      userExplanation: {
        content: 'User explanation',
        timestamp: new Date('2024-01-01T12:00:00'),
      },
      technicalInstructions: {
        content: 'Technical instructions',
        timestamp: new Date('2024-01-01T12:00:00'),
        language: 'javascript',
        isCode: true,
      },
    };
    
    render(<DualOutputContainer {...propsWithoutConfidence} />);
    
    expect(screen.getByTestId('user-explanation-box')).toBeInTheDocument();
    expect(screen.getByTestId('technical-instructions-box')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<DualOutputContainer {...mockProps} />);
    
    const container = screen.getByTestId('user-explanation-box').closest('div');
    expect(container).toHaveAttribute('role', 'article');
    expect(container).toHaveAttribute('aria-label', 'Dual output container');
  });

  it('renders with proper spacing between components', () => {
    render(<DualOutputContainer {...mockProps} />);
    
    const container = screen.getByTestId('user-explanation-box').closest('div');
    expect(container).toHaveClass('gap-4');
  });

  it('handles different language types', () => {
    const propsWithDifferentLanguage = {
      ...mockProps,
      technicalInstructions: {
        ...mockProps.technicalInstructions,
        language: 'python',
      },
    };
    
    render(<DualOutputContainer {...propsWithDifferentLanguage} />);
    
    expect(screen.getByTestId('technical-language')).toHaveTextContent('python');
  });

  it('handles non-code technical instructions', () => {
    const propsWithNonCode = {
      ...mockProps,
      technicalInstructions: {
        ...mockProps.technicalInstructions,
        isCode: false,
      },
    };
    
    render(<DualOutputContainer {...propsWithNonCode} />);
    
    expect(screen.getByTestId('technical-is-code')).toHaveTextContent('false');
  });
});