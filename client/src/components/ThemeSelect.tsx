import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Option = {
  value: string;
  label: string;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
};

const ThemeSelect: React.FC<Props> = ({
  value,
  onChange,
  options,
  disabled = false,
  className,
  placeholder = 'Select',
}) => {
  const [open, setOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedIndex = useMemo(
    () => options.findIndex((o) => o.value === value),
    [options, value]
  );
  const selectedLabel = selectedIndex >= 0 ? options[selectedIndex].label : '';

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      // Close if click outside container (portal click handling is separate or bubbling, 
      // but since portal is in body, we need to check if click is inside container or portal)
      // Actually, since portal is elsewhere, containerRef won't contain portal elements.
      // We rely on the button click to toggle.
      // If we click outside the container, we should close.
      // But if we click inside the portal, we shouldn't close immediately?
      // Wait, portal elements are outside.
      // Let's rely on standard logic: if click target is not in container and not in portal, close.
      // Since portal is hard to ref here without more state, let's just say if click is NOT in container, close.
      // But clicking an option in portal triggers onClick which closes it.
      // So checking !containerRef.current.contains(e.target) is mostly fine, 
      // EXCEPT if we click the scrollbar of the portal list?
      // A simple way is to stopPropagation on the list.
      if (!containerRef.current.contains(e.target as Node)) {
        // We also need to check if the click was on the portal content.
        // We can add a class or ID to portal content to check.
        const target = e.target as HTMLElement;
        if (!target.closest('.ifa-select-portal')) {
           setOpen(false);
        }
      }
    };
    const handleScroll = (e: Event) => {
       // Fix: Don't close if scrolling inside the portal list itself
       const target = e.target as HTMLElement;
       if (target && target.classList && target.classList.contains('ifa-select-portal')) {
          return;
       }
       setOpen(false);
    };
    const handleResize = () => setOpen(false); // Close on resize to avoid position drift

    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHoverIndex((i) => {
          const next = i < options.length - 1 ? i + 1 : 0;
          return next;
        });
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHoverIndex((i) => {
          const next = i > 0 ? i - 1 : options.length - 1;
          return next;
        });
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const idx = hoverIndex >= 0 ? hoverIndex : selectedIndex;
        const opt = options[idx];
        if (opt && !opt.disabled) {
          onChange(opt.value);
          setOpen(false);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, hoverIndex, selectedIndex, options, onChange]);

  useEffect(() => {
    setHoverIndex(selectedIndex);
  }, [selectedIndex]);

  return (
    <div
      ref={containerRef}
      className={`ifa-select ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className || ''}`}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) setOpen((o) => !o);
        }}
        className="ifa-select-trigger bg-ifa-dark/50 hover:bg-white/10 outline-none rounded px-2 py-1 w-full text-left font-bold italic text-white border border-gray-800 transition-all"
      >
        <span>{selectedLabel || placeholder}</span>
        <span className="ifa-select-caret" aria-hidden="true">▾</span>
      </button>
      {open && createPortal(
        <ul
          role="listbox"
          className="ifa-select-list ifa-select-portal"
          style={{
            position: 'absolute',
            top: coords.top,
            left: coords.left,
            width: coords.width,
            zIndex: 9999
          }}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHover = hoverIndex === idx;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={[
                  'ifa-select-option',
                  isSelected ? 'selected' : '',
                  isHover ? 'hover' : '',
                  opt.disabled ? 'disabled' : '',
                ].join(' ')}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(-1)}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent closing immediately from document listener
                  if (!opt.disabled) {
                    onChange(opt.value);
                    setOpen(false);
                  }
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>,
        document.body
      )}
    </div>
  );
};

export default ThemeSelect;

