'use client';

import { useEffect, useRef, useState, useLayoutEffect } from 'react';

export interface ContextMenuOption {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  divider?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  options: ContextMenuOption[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, options, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Adjust position if menu would go off-screen (runs synchronously after DOM update)
  useLayoutEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      if (adjustedX !== x || adjustedY !== y) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPosition({ x: adjustedX, y: adjustedY });
      }
    }
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {options.map((option, index) => (
        <div key={index}>
          {option.divider && <div className="my-1 border-t border-gray-700" />}
          <button
            onClick={() => {
              option.onClick();
              onClose();
            }}
            className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
              option.variant === 'danger'
                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {option.icon && <span className="w-4 h-4 flex-shrink-0">{option.icon}</span>}
            <span className="flex-1">{option.label}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
