import React, { useEffect, useMemo, useRef, useState } from 'react';

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

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false);
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
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
      {open && (
        <ul role="listbox" className="ifa-select-list">
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
                onClick={() => {
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
        </ul>
      )}
    </div>
  );
};

export default ThemeSelect;

