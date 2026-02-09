/**
 * Tooltip Component
 * Simple tooltip using CSS and title attribute fallback
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, side = 'bottom', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            'absolute z-50 px-2 py-1 text-xs text-popover-foreground bg-popover border border-border rounded-md shadow-md whitespace-normal max-w-xs',
            side === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            side === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            side === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            side === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2'
          )}
          role="tooltip"
        >
          {content}
          <div
            className={cn(
              'absolute w-0 h-0 border-4 border-transparent',
              side === 'top' && 'top-full left-1/2 -translate-x-1/2 border-t-popover',
              side === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 border-b-popover',
              side === 'left' && 'left-full top-1/2 -translate-y-1/2 border-l-popover',
              side === 'right' && 'right-full top-1/2 -translate-y-1/2 border-r-popover'
            )}
          />
        </div>
      )}
    </div>
  );
}
