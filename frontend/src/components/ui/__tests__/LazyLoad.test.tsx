/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LazyLoad, LazyComponent } from '../LazyLoad';

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: jest.fn(() => [{ isIntersecting: true }, jest.fn()]),
}));

describe('LazyLoad', () => {
  const mockProps = {
    children: <div data-testid="lazy-content">Lazy Content</div>,
    placeholder: <div data-testid="placeholder">Loading...</div>,
    rootMargin: '50px',
    threshold: 0.1,
    triggerOnce: true,
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<LazyLoad>Content</LazyLoad>);
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders placeholder initially', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue([{ isIntersecting: false }, jest.fn()]);
    
    render(<LazyLoad {...mockProps} />);
    
    expect(screen.getByTestId('placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('lazy-content')).not.toBeInTheDocument();
  });

  it('renders content when in view', () => {
    render(<LazyLoad {...mockProps} />);
    
    expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    expect(screen.queryByTestId('placeholder')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<LazyLoad {...mockProps} className="custom-class" />);
    
    const container = screen.getByTestId('lazy-content').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('handles missing placeholder', () => {
    render(<LazyLoad children={mockProps.children} />);
    
    expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
  });

  it('triggers only once when triggerOnce is true', () => {
    const { useInView } = require('react-intersection-observer');
    const mockInView = jest.fn();
    useInView.mockReturnValue([{ isIntersecting: true }, mockInView]);
    
    render(<LazyLoad {...mockProps} />);
    
    expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    expect(mockInView).toHaveBeenCalled();
  });

  it('handles multiple view changes when triggerOnce is false', () => {
    const { useInView } = require('react-intersection-observer');
    const mockInView = jest.fn();
    
    useInView.mockReturnValueOnce([{ isIntersecting: false }, mockInView])
      .mockReturnValueOnce([{ isIntersecting: true }, mockInView])
      .mockReturnValueOnce([{ isIntersecting: false }, mockInView]);
    
    const { rerender } = render(<LazyLoad {...mockProps} triggerOnce={false} />);
    
    expect(screen.queryByTestId('lazy-content')).not.toBeInTheDocument();
    
    rerender(<LazyLoad {...mockProps} triggerOnce={false} />);
    expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
    
    rerender(<LazyLoad {...mockProps} triggerOnce={false} />);
    expect(screen.queryByTestId('lazy-content')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LazyLoad {...mockProps} />);
    
    const container = screen.getByTestId('lazy-content').closest('div');
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Lazy loaded content');
  });
});

describe('LazyComponent', () => {
  const MockComponent = jest.fn(() => <div data-testid="mock-component">Mock Component</div>);
  
  const mockProps = {
    component: MockComponent,
    placeholder: <div data-testid="component-placeholder">Component Loading...</div>,
    loadingComponent: <div data-testid="loading-component">Loading Component...</div>,
    errorComponent: <div data-testid="error-component">Error Loading Component</div>,
    rootMargin: '50px',
    threshold: 0.1,
    triggerOnce: true,
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    MockComponent.mockClear();
  });

  it('renders with default props', () => {
    render(<LazyComponent component={MockComponent} />);
    
    expect(screen.getByTestId('mock-component')).toBeInTheDocument();
  });

  it('renders placeholder initially', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue([{ isIntersecting: false }, jest.fn()]);
    
    render(<LazyComponent {...mockProps} />);
    
    expect(screen.getByTestId('component-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-component')).not.toBeInTheDocument();
  });

  it('renders loading component when loading', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue([{ isIntersecting: true }, jest.fn()]);
    
    // Simulate async component loading
    const SlowComponent = jest.fn(() => {
      throw new Promise(() => {}); // Never resolves
    });
    
    render(<LazyComponent {...mockProps} component={SlowComponent} />);
    
    expect(screen.getByTestId('loading-component')).toBeInTheDocument();
  });

  it('renders error component when component fails to load', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue([{ isIntersecting: true }, jest.fn()]);
    
    const ErrorComponent = jest.fn(() => {
      throw new Error('Component failed to load');
    });
    
    render(<LazyComponent {...mockProps} component={ErrorComponent} />);
    
    expect(screen.getByTestId('error-component')).toBeInTheDocument();
  });

  it('renders component successfully when in view', () => {
    render(<LazyComponent {...mockProps} />);
    
    expect(screen.getByTestId('mock-component')).toBeInTheDocument();
    expect(MockComponent).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<LazyComponent {...mockProps} className="custom-class" />);
    
    const container = screen.getByTestId('mock-component').closest('div');
    expect(container).toHaveClass('custom-class');
  });

  it('handles missing loading component', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue([{ isIntersecting: true }, jest.fn()]);
    
    const propsWithoutLoading = { ...mockProps };
    delete propsWithoutLoading.loadingComponent;
    
    render(<LazyComponent {...propsWithoutLoading} />);
    
    expect(screen.getByTestId('mock-component')).toBeInTheDocument();
  });

  it('handles missing error component', () => {
    const { useInView } = require('react-intersection-observer');
    useInView.mockReturnValue([{ isIntersecting: true }, jest.fn()]);
    
    const ErrorComponent = jest.fn(() => {
      throw new Error('Component failed to load');
    });
    
    const propsWithoutError = { ...mockProps };
    delete propsWithoutError.errorComponent;
    
    render(<LazyComponent {...propsWithoutError} component={ErrorComponent} />);
    
    // Should fall back to placeholder or default error handling
    expect(screen.getByTestId('component-placeholder')).toBeInTheDocument();
  });

  it('handles missing placeholder', () => {
    const propsWithoutPlaceholder = { ...mockProps };
    delete propsWithoutPlaceholder.placeholder;
    
    render(<LazyComponent {...propsWithoutPlaceholder} />);
    
    expect(screen.getByTestId('mock-component')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<LazyComponent {...mockProps} />);
    
    const container = screen.getByTestId('mock-component').closest('div');
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Lazy loaded component');
  });

  it('passes intersection observer options correctly', () => {
    const { useInView } = require('react-intersection-observer');
    const mockInView = jest.fn();
    
    useInView.mockReturnValue([{ isIntersecting: false }, mockInView]);
    
    render(<LazyComponent {...mockProps} rootMargin="100px" threshold={0.5} />);
    
    expect(useInView).toHaveBeenCalledWith({
      rootMargin: '100px',
      threshold: 0.5,
      triggerOnce: true,
    });
  });

  it('handles component unmounting gracefully', () => {
    const { unmount } = render(<LazyComponent {...mockProps} />);
    
    expect(screen.getByTestId('mock-component')).toBeInTheDocument();
    
    unmount();
    
    expect(screen.queryByTestId('mock-component')).not.toBeInTheDocument();
  });
});