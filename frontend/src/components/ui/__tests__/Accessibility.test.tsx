/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  ScreenReaderAnnouncement,
  ScreenReaderOnly,
  announceToScreenReader,
  KeyboardNavigation,
  FocusTrap,
  useFocusManagement,
  SkipToContent,
  useAriaLive,
  useKeyboardNavigation,
  AccessibleTooltip,
  ModalBackdrop,
  injectScreenReaderStyles,
} from '../Accessibility';

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('ScreenReaderAnnouncement', () => {
  const mockProps = {
    message: 'Test announcement',
    politeness: 'polite' as const,
    timeout: 5000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<ScreenReaderAnnouncement message="Test message" />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Test message')).toHaveAttribute('aria-atomic', 'true');
  });

  it('renders with custom politeness', () => {
    render(<ScreenReaderAnnouncement message="Test message" politeness="assertive" />);
    
    expect(screen.getByText('Test message')).toHaveAttribute('aria-live', 'assertive');
  });

  it('removes announcement after timeout', () => {
    render(<ScreenReaderAnnouncement {...mockProps} />);
    
    expect(screen.getByText(mockProps.message)).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(screen.queryByText(mockProps.message)).not.toBeInTheDocument();
  });

  it('has proper screen reader only styling', () => {
    render(<ScreenReaderAnnouncement message="Test message" />);
    
    const announcement = screen.getByText('Test message');
    expect(announcement).toHaveClass('sr-only');
  });

  it('handles multiple announcements', () => {
    const { rerender } = render(<ScreenReaderAnnouncement message="First message" />);
    
    expect(screen.getByText('First message')).toBeInTheDocument();
    
    rerender(<ScreenReaderAnnouncement message="Second message" />);
    
    expect(screen.getByText('Second message')).toBeInTheDocument();
  });
});

describe('ScreenReaderOnly', () => {
  it('renders children with screen reader only class', () => {
    render(
      <ScreenReaderOnly>
        <span>Hidden content</span>
      </ScreenReaderOnly>
    );
    
    expect(screen.getByText('Hidden content')).toBeInTheDocument();
    expect(screen.getByText('Hidden content')).toHaveClass('sr-only');
  });

  it('renders with custom element type', () => {
    render(
      <ScreenReaderOnly as="div">
        Hidden content
      </ScreenReaderOnly>
    );
    
    const content = screen.getByText('Hidden content');
    expect(content.tagName).toBe('DIV');
  });

  it('has proper accessibility attributes', () => {
    render(
      <ScreenReaderOnly>
        <span>Hidden content</span>
      </ScreenReaderOnly>
    );
    
    const content = screen.getByText('Hidden content');
    expect(content).toBeInTheDocument();
  });
});

describe('announceToScreenReader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('creates announcement element', () => {
    announceToScreenReader('Test announcement');
    
    const announcement = document.querySelector('[aria-live]');
    expect(announcement).toBeInTheDocument();
    expect(announcement).toHaveTextContent('Test announcement');
    expect(announcement).toHaveClass('sr-only');
  });

  it('uses custom politeness level', () => {
    announceToScreenReader('Test announcement', 'assertive');
    
    const announcement = document.querySelector('[aria-live="assertive"]');
    expect(announcement).toBeInTheDocument();
  });

  it('removes announcement after timeout', () => {
    announceToScreenReader('Test announcement');
    
    const announcement = document.querySelector('[aria-live]');
    expect(announcement).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(document.querySelector('[aria-live]')).not.toBeInTheDocument();
  });

  it('handles document undefined gracefully', () => {
    const originalDocument = global.document;
    global.document = undefined as any;
    
    expect(() => announceToScreenReader('Test announcement')).not.toThrow();
    
    global.document = originalDocument;
  });
});

describe('KeyboardNavigation', () => {
  const mockProps = {
    children: (
      <>
        <button data-testid="button1">Button 1</button>
        <button data-testid="button2">Button 2</button>
        <button data-testid="button3">Button 3</button>
      </>
    ),
    orientation: 'horizontal' as const,
    loop: true,
    onNavigate: jest.fn(),
    onSelect: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<KeyboardNavigation>Content</KeyboardNavigation>);
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('handles arrow right navigation', () => {
    render(<KeyboardNavigation {...mockProps} />);
    
    const container = screen.getByText('Button 1').closest('div');
    fireEvent.keyDown(container, { key: 'ArrowRight' });
    
    expect(mockProps.onNavigate).toHaveBeenCalledWith('next');
  });

  it('handles arrow left navigation', () => {
    render(<KeyboardNavigation {...mockProps} />);
    
    const container = screen.getByText('Button 1').closest('div');
    fireEvent.keyDown(container, { key: 'ArrowLeft' });
    
    expect(mockProps.onNavigate).toHaveBeenCalledWith('previous');
  });

  it('handles arrow down navigation in vertical orientation', () => {
    render(<KeyboardNavigation {...mockProps} orientation="vertical" />);
    
    const container = screen.getByText('Button 1').closest('div');
    fireEvent.keyDown(container, { key: 'ArrowDown' });
    
    expect(mockProps.onNavigate).toHaveBeenCalledWith('next');
  });

  it('handles arrow up navigation in vertical orientation', () => {
    render(<KeyboardNavigation {...mockProps} orientation="vertical" />);
    
    const container = screen.getByText('Button 1').closest('div');
    fireEvent.keyDown(container, { key: 'ArrowUp' });
    
    expect(mockProps.onNavigate).toHaveBeenCalledWith('previous');
  });

  it('handles home and end keys', () => {
    render(<KeyboardNavigation {...mockProps} />);
    
    const container = screen.getByText('Button 1').closest('div');
    
    fireEvent.keyDown(container, { key: 'Home' });
    expect(mockProps.onNavigate).toHaveBeenCalledWith('first');
    
    fireEvent.keyDown(container, { key: 'End' });
    expect(mockProps.onNavigate).toHaveBeenCalledWith('last');
  });

  it('handles enter and space keys', () => {
    render(<KeyboardNavigation {...mockProps} />);
    
    const container = screen.getByText('Button 1').closest('div');
    
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(mockProps.onSelect).toHaveBeenCalled();
    
    fireEvent.keyDown(container, { key: ' ' });
    expect(mockProps.onSelect).toHaveBeenCalled();
  });

  it('handles escape key', () => {
    render(<KeyboardNavigation {...mockProps} />);
    
    const container = screen.getByText('Button 1').closest('div');
    fireEvent.keyDown(container, { key: 'Escape' });
    
    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<KeyboardNavigation {...mockProps} />);
    
    const container = screen.getByText('Button 1').closest('div');
    expect(container).toHaveAttribute('role', 'menu');
    expect(container).toHaveAttribute('tabIndex', '-1');
  });

  it('applies grid role for grid orientation', () => {
    render(<KeyboardNavigation {...mockProps} orientation="grid" />);
    
    const container = screen.getByText('Button 1').closest('div');
    expect(container).toHaveAttribute('role', 'grid');
  });
});

describe('useFocusManagement', () => {
  let TestComponent: React.FC;

  beforeEach(() => {
    jest.clearAllMocks();
    
    TestComponent = () => {
      const { saveFocus, restoreFocus, focusFirst, focusLast } = useFocusManagement();
      
      return (
        <div>
          <button data-testid="save-focus" onClick={saveFocus}>Save Focus</button>
          <button data-testid="restore-focus" onClick={restoreFocus}>Restore Focus</button>
          <button data-testid="focus-first" onClick={() => focusFirst('test-container')}>Focus First</button>
          <button data-testid="focus-last" onClick={() => focusLast('test-container')}>Focus Last</button>
          <div data-testid="test-container">
            <button data-testid="first-button">First</button>
            <button data-testid="last-button">Last</button>
          </div>
        </div>
      );
    };
  });

  it('saves and restores focus', () => {
    render(<TestComponent />);
    
    const firstButton = screen.getByTestId('first-button');
    firstButton.focus();
    
    const saveButton = screen.getByTestId('save-focus');
    fireEvent.click(saveButton);
    
    const restoreButton = screen.getByTestId('restore-focus');
    fireEvent.click(restoreButton);
    
    expect(firstButton).toHaveFocus();
  });

  it('focuses first element in container', () => {
    render(<TestComponent />);
    
    const focusFirstButton = screen.getByTestId('focus-first');
    fireEvent.click(focusFirstButton);
    
    expect(screen.getByTestId('first-button')).toHaveFocus();
  });

  it('focuses last element in container', () => {
    render(<TestComponent />);
    
    const focusLastButton = screen.getByTestId('focus-last');
    fireEvent.click(focusLastButton);
    
    expect(screen.getByTestId('last-button')).toHaveFocus();
  });
});

describe('useAriaLive', () => {
  let TestComponent: React.FC;

  beforeEach(() => {
    jest.clearAllMocks();
    
    TestComponent = () => {
      const { announce, assertive, polite, announcements } = useAriaLive();
      
      return (
        <div>
          <button data-testid="announce" onClick={() => announce('Test announcement')}>
            Announce
          </button>
          <button data-testid="assertive" onClick={() => assertive('Assertive message')}>
            Assertive
          </button>
          <button data-testid="polite" onClick={() => polite('Polite message')}>
            Polite
          </button>
          <div data-testid="announcements">
            {announcements.map(a => (
              <div key={a.id} data-testid={`announcement-${a.id}`}>
                {a.message}
              </div>
            ))}
          </div>
        </div>
      );
    };
  });

  it('makes announcements', () => {
    render(<TestComponent />);
    
    const announceButton = screen.getByTestId('announce');
    fireEvent.click(announceButton);
    
    expect(screen.getByText('Test announcement')).toBeInTheDocument();
  });

  it('makes assertive announcements', () => {
    render(<TestComponent />);
    
    const assertiveButton = screen.getByTestId('assertive');
    fireEvent.click(assertiveButton);
    
    expect(screen.getByText('Assertive message')).toBeInTheDocument();
  });

  it('makes polite announcements', () => {
    render(<TestComponent />);
    
    const politeButton = screen.getByTestId('polite');
    fireEvent.click(politeButton);
    
    expect(screen.getByText('Polite message')).toBeInTheDocument();
  });

  it('removes announcements after timeout', () => {
    render(<TestComponent />);
    
    const announceButton = screen.getByTestId('announce');
    fireEvent.click(announceButton);
    
    expect(screen.getByText('Test announcement')).toBeInTheDocument();
    
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    
    expect(screen.queryByText('Test announcement')).not.toBeInTheDocument();
  });
});

describe('AccessibleTooltip', () => {
  const mockProps = {
    content: 'Tooltip content',
    children: <button data-testid="trigger-button">Trigger</button>,
    placement: 'top' as const,
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<AccessibleTooltip {...mockProps} />);
    
    expect(screen.getByTestId('trigger-button')).toBeInTheDocument();
    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<AccessibleTooltip {...mockProps} />);
    
    const triggerButton = screen.getByTestId('trigger-button');
    fireEvent.mouseEnter(triggerButton);
    
    expect(screen.getByText('Tooltip content')).toBeInTheDocument();
  });

  it('hides tooltip on mouse leave', () => {
    render(<AccessibleTooltip {...mockProps} />);
    
    const triggerButton = screen.getByTestId('trigger-button');
    fireEvent.mouseEnter(triggerButton);
    fireEvent.mouseLeave(triggerButton);
    
    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
  });

  it('shows tooltip on focus', () => {
    render(<AccessibleTooltip {...mockProps} />);
    
    const triggerButton = screen.getByTestId('trigger-button');
    fireEvent.focus(triggerButton);
    
    expect(screen.getByText('Tooltip content')).toBeInTheDocument();
  });

  it('hides tooltip on blur', () => {
    render(<AccessibleTooltip {...mockProps} />);
    
    const triggerButton = screen.getByTestId('trigger-button');
    fireEvent.focus(triggerButton);
    fireEvent.blur(triggerButton);
    
    expect(screen.queryByText('Tooltip content')).not.toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<AccessibleTooltip {...mockProps} />);
    
    const triggerButton = screen.getByTestId('trigger-button');
    fireEvent.mouseEnter(triggerButton);
    
    const tooltip = screen.getByText('Tooltip content');
    expect(tooltip).toHaveAttribute('role', 'tooltip');
  });

  it('applies custom className', () => {
    render(<AccessibleTooltip {...mockProps} className="custom-class" />);
    
    const triggerButton = screen.getByTestId('trigger-button');
    fireEvent.mouseEnter(triggerButton);
    
    const tooltip = screen.getByText('Tooltip content');
    expect(tooltip).toHaveClass('custom-class');
  });
});

describe('ModalBackdrop', () => {
  const mockProps = {
    onClick: jest.fn(),
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<ModalBackdrop {...mockProps} />);
    
    const backdrop = screen.getByRole('presentation');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('bg-black', 'bg-opacity-50');
  });

  it('handles click events', () => {
    render(<ModalBackdrop {...mockProps} />);
    
    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    
    expect(mockProps.onClick).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<ModalBackdrop {...mockProps} className="custom-class" />);
    
    const backdrop = screen.getByRole('presentation');
    expect(backdrop).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<ModalBackdrop {...mockProps} />);
    
    const backdrop = screen.getByRole('presentation');
    expect(backdrop).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SkipToContent', () => {
  const mockProps = {
    targetId: 'main-content',
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup DOM with target element
    document.body.innerHTML = `
      <div id="main-content">Main Content</div>
    `;
  });

  it('renders with default props', () => {
    render(<SkipToContent {...mockProps} />);
    
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('handles click events', () => {
    const mockFocus = jest.fn();
    const mockScrollIntoView = jest.fn();
    
    const targetElement = document.getElementById('main-content');
    if (targetElement) {
      targetElement.focus = mockFocus;
      targetElement.scrollIntoView = mockScrollIntoView;
    }
    
    render(<SkipToContent {...mockProps} />);
    
    const skipLink = screen.getByText('Skip to main content');
    fireEvent.click(skipLink);
    
    expect(mockFocus).toHaveBeenCalled();
    expect(mockScrollIntoView).toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<SkipToContent {...mockProps} className="custom-class" />);
    
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<SkipToContent {...mockProps} />);
    
    const skipLink = screen.getByText('Skip to main content');
    expect(skipLink).toHaveClass('sr-only');
  });
});

describe('injectScreenReaderStyles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.head.innerHTML = '';
  });

  it('injects screen reader styles', () => {
    injectScreenReaderStyles();
    
    const styleElement = document.getElementById('screen-reader-styles');
    expect(styleElement).toBeInTheDocument();
    expect(styleElement?.tagName).toBe('STYLE');
  });

  it('does not inject styles twice', () => {
    injectScreenReaderStyles();
    injectScreenReaderStyles();
    
    const styleElements = document.querySelectorAll('#screen-reader-styles');
    expect(styleElements).toHaveLength(1);
  });

  it('handles document undefined gracefully', () => {
    const originalDocument = global.document;
    global.document = undefined as any;
    
    expect(() => injectScreenReaderStyles()).not.toThrow();
    
    global.document = originalDocument;
  });
});