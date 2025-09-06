import React, { useRef, useEffect, useCallback, useState } from 'react';

// Screen Reader utilities
export interface ScreenReaderAnnouncementProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  timeout?: number;
}

export const ScreenReaderAnnouncement: React.FC<ScreenReaderAnnouncementProps> = ({
  message,
  politeness = 'polite',
  timeout = 5000,
}) => {
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    message: string;
    politeness: 'polite' | 'assertive';
  }>>([]);

  useEffect(() => {
    const id = Date.now().toString();
    setAnnouncements(prev => [...prev, { id, message, politeness }]);

    const timer = setTimeout(() => {
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
    }, timeout);

    return () => clearTimeout(timer);
  }, [message, politeness, timeout]);

  return (
    <div className="sr-only">
      {announcements.map(announcement => (
        <div
          key={announcement.id}
          aria-live={announcement.politeness}
          aria-atomic="true"
        >
          {announcement.message}
        </div>
      ))}
    </div>
  );
};

// Screen Reader only content
export const ScreenReaderOnly: React.FC<{
  children: React.ReactNode;
  as?: React.ElementType;
}> = ({ children, as: Component = 'span' }) => {
  return (
    <Component className="sr-only">
      {children}
    </Component>
  );
};

// Announce to screen readers
export const announceToScreenReader = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
  if (typeof document === 'undefined') return;

  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', politeness);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 5000);
};

// Keyboard Navigation utilities
export interface KeyboardNavigationProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical' | 'grid';
  loop?: boolean;
  onNavigate?: (direction: 'next' | 'previous' | 'first' | 'last') => void;
  onSelect?: (element: HTMLElement) => void;
  onCancel?: () => void;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  orientation = 'horizontal',
  loop = true,
  onNavigate,
  onSelect,
  onCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[role="tab"]',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(selector));
  }, []);

  const focusElement = useCallback((element: HTMLElement) => {
    element.focus();
    onSelect?.(element);
  }, [onSelect]);

  const moveFocus = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    const elements = getFocusableElements();
    if (elements.length === 0) return;

    let newIndex = focusedIndex;

    switch (direction) {
      case 'next':
        newIndex = focusedIndex + 1;
        if (newIndex >= elements.length) {
          newIndex = loop ? 0 : elements.length - 1;
        }
        break;
      case 'previous':
        newIndex = focusedIndex - 1;
        if (newIndex < 0) {
          newIndex = loop ? elements.length - 1 : 0;
        }
        break;
      case 'first':
        newIndex = 0;
        break;
      case 'last':
        newIndex = elements.length - 1;
        break;
    }

    if (newIndex >= 0 && newIndex < elements.length && newIndex !== focusedIndex) {
      setFocusedIndex(newIndex);
      focusElement(elements[newIndex] as HTMLElement);
      onNavigate?.(direction);
    }
  }, [focusedIndex, getFocusableElements, loop, focusElement, onNavigate]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          moveFocus('next');
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          moveFocus('previous');
        }
        break;
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          moveFocus('next');
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          moveFocus('previous');
        }
        break;
      case 'Home':
        event.preventDefault();
        moveFocus('first');
        break;
      case 'End':
        event.preventDefault();
        moveFocus('last');
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        const focusedElement = document.activeElement;
        if (focusedElement instanceof HTMLElement) {
          focusElement(focusedElement);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onCancel?.();
        break;
    }
  }, [orientation, moveFocus, focusElement, onCancel]);

  useEffect(() => {
    const elements = getFocusableElements();
    const activeElement = document.activeElement;
    
    if (elements.includes(activeElement as HTMLElement)) {
      const index = elements.indexOf(activeElement as HTMLElement);
      setFocusedIndex(index);
    }
  }, [getFocusableElements]);

  return (
    <div
      ref={containerRef}
      role={orientation === 'grid' ? 'grid' : orientation === 'vertical' ? 'tree' : 'menu'}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

// Focus Management utilities
export interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  onDeactivate?: () => void;
  initialFocus?: string | HTMLElement;
  finalFocus?: string | HTMLElement;
  returnFocus?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active,
  onDeactivate,
  initialFocus,
  finalFocus,
  returnFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const selector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]',
      '[role="link"]',
    ].join(', ');

    return Array.from(containerRef.current.querySelectorAll(selector));
  }, []);

  const focusInitialElement = useCallback(() => {
    if (!initialFocus) {
      const elements = getFocusableElements();
      if (elements.length > 0) {
        (elements[0] as HTMLElement).focus();
      }
      return;
    }

    if (typeof initialFocus === 'string') {
      const element = document.querySelector(initialFocus) as HTMLElement;
      element?.focus();
    } else {
      initialFocus.focus();
    }
  }, [initialFocus, getFocusableElements]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!active) return;

    if (event.key === 'Tab') {
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const firstElement = elements[0] as HTMLElement;
      const lastElement = elements[elements.length - 1] as HTMLElement;
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        if (activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }

    if (event.key === 'Escape') {
      onDeactivate?.();
    }
  }, [active, getFocusableElements, onDeactivate]);

  useEffect(() => {
    if (!active) return;

    // Store previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus initial element
    focusInitialElement();

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Return focus to previous element
      if (returnFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }

      // Focus final element if specified
      if (finalFocus) {
        if (typeof finalFocus === 'string') {
          const element = document.querySelector(finalFocus) as HTMLElement;
          element?.focus();
        } else {
          finalFocus.focus();
        }
      }
    };
  }, [active, focusInitialElement, handleKeyDown, returnFocus, finalFocus]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
};

// Focus Management Hook
export const useFocusManagement = () => {
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    lastFocusedRef.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
    }
  }, []);

  const focusFirst = useCallback((container: HTMLElement | string) => {
    const element = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!element) return;

    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const firstFocusable = element.querySelector(focusableSelector) as HTMLElement;
    firstFocusable?.focus();
  }, []);

  const focusLast = useCallback((container: HTMLElement | string) => {
    const element = typeof container === 'string' 
      ? document.querySelector(container) 
      : container;
    
    if (!element) return;

    const focusableSelector = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    const focusableElements = Array.from(element.querySelectorAll(focusableSelector)) as HTMLElement[];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    lastFocusable?.focus();
  }, []);

  const isElementFocused = useCallback((element: HTMLElement | string) => {
    const el = typeof element === 'string' 
      ? document.querySelector(element) as HTMLElement
      : element;
    
    return el === document.activeElement;
  }, []);

  const focusElement = useCallback((element: HTMLElement | string) => {
    const el = typeof element === 'string' 
      ? document.querySelector(element) as HTMLElement
      : element;
    
    el?.focus();
  }, []);

  return {
    saveFocus,
    restoreFocus,
    focusFirst,
    focusLast,
    isElementFocused,
    focusElement,
  };
};

// Skip to main content link
export const SkipToContent: React.FC<{
  targetId: string;
  className?: string;
}> = ({ targetId, className }) => {
  const handleClick = useCallback(() => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }, [targetId]);

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4',
        'bg-white text-blue-600 px-4 py-2 rounded shadow-lg z-50',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        className
      )}
    >
      Skip to main content
    </a>
  );
};

// ARIA live region manager
export const useAriaLive = () => {
  const [announcements, setAnnouncements] = useState<Array<{
    id: string;
    message: string;
    politeness: 'polite' | 'assertive';
  }>>([]);

  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const id = Date.now().toString();
    setAnnouncements(prev => [...prev, { id, message, politeness }]);

    setTimeout(() => {
      setAnnouncements(prev => prev.filter(announcement => announcement.id !== id));
    }, 5000);
  }, []);

  const assertive = useCallback((message: string) => announce(message, 'assertive'), [announce]);
  const polite = useCallback((message: string) => announce(message, 'polite'), [announce]);

  return {
    announce,
    assertive,
    polite,
    announcements,
  };
};

// Keyboard navigation hook
export const useKeyboardNavigation = (
  onAction?: (action: string) => void,
  options: {
    preventDefault?: boolean;
    stopPropagation?: boolean;
  } = {}
) => {
  const { preventDefault = true, stopPropagation = false } = options;

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const actions: Record<string, string> = {
      'Enter': 'enter',
      ' ': 'space',
      'Escape': 'escape',
      'ArrowUp': 'arrow-up',
      'ArrowDown': 'arrow-down',
      'ArrowLeft': 'arrow-left',
      'ArrowRight': 'arrow-right',
      'Home': 'home',
      'End': 'end',
      'PageUp': 'page-up',
      'PageDown': 'page-down',
      'Tab': 'tab',
      'F1': 'help',
    };

    const action = actions[event.key];
    if (action) {
      if (preventDefault) {
        event.preventDefault();
      }
      if (stopPropagation) {
        event.stopPropagation();
      }
      onAction?.(action);
    }
  }, [preventDefault, stopPropagation, onAction]);

  return { handleKeyDown };
};

// Accessible modal backdrop
export const ModalBackdrop: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className }) => {
  return (
    <div
      className={cn(
        'fixed inset-0 bg-black bg-opacity-50 z-40',
        'cursor-pointer',
        className
      )}
      onClick={onClick}
      role="presentation"
      aria-hidden="true"
    />
  );
};

// Accessible tooltip
export const AccessibleTooltip: React.FC<{
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}> = ({ content, children, placement = 'top', className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
  }, []);

  const hideTooltip = useCallback(() => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={() => {
          setIsFocused(true);
          showTooltip();
        }}
        onBlur={() => {
          setIsFocused(false);
          hideTooltip();
        }}
      >
        {children}
      </div>
      
      {(isVisible || isFocused) && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg',
            'pointer-events-none whitespace-nowrap',
            {
              'bottom-full left-1/2 transform -translate-x-1/2 mb-2': placement === 'top',
              'top-full left-1/2 transform -translate-x-1/2 mt-2': placement === 'bottom',
              'right-full top-1/2 transform -translate-y-1/2 mr-2': placement === 'left',
              'left-full top-1/2 transform -translate-y-1/2 ml-2': placement === 'right',
            },
            className
          )}
        >
          {content}
          <div
            className={cn(
              'absolute w-2 h-2 bg-gray-900 transform rotate-45',
              {
                'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2': placement === 'top',
                'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2': placement === 'bottom',
                'right-0 top-1/2 -translate-y-1/2 translate-x-1/2': placement === 'left',
                'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2': placement === 'right',
              }
            )}
          />
        </div>
      )}
    </div>
  );
};

// Add screen reader only styles to global CSS
export const injectScreenReaderStyles = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'screen-reader-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }
    
    .focus\:not-sr-only:focus {
      position: static;
      width: auto;
      height: auto;
      padding: 0;
      margin: 0;
      overflow: visible;
      clip: auto;
      white-space: normal;
    }
  `;

  document.head.appendChild(style);
};

// Auto-inject styles on component import
if (typeof window !== 'undefined') {
  injectScreenReaderStyles();
}