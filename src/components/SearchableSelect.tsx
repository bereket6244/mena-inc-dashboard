import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, PlusCircle } from 'lucide-react';

interface SearchableSelectProps {
  id?: string;
  value: string;
  onChange: (e: any) => void;
  children: ReactNode;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
  disabled?: boolean;
  onCreateOption?: (searchTerm: string) => void;
  createOptionLabel?: string;
  createOptionBadge?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  children,
  id,
  className = "",
  inputClassName = "",
  placeholder = "Select...",
  disabled = false,
  onCreateOption,
  createOptionLabel = "Add item",
  createOptionBadge
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [activeIndex, setActiveIndex] = useState(0);
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  // Parse children into options array
  const options: { value: string; label: string; statusClass?: string; amountText?: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    
    if (child.type === 'option') {
      options.push({
        value: child.props.value || '',
        label: child.props.children?.toString() || '',
        statusClass: child.props['data-status'] || '',
        amountText: child.props['data-amount'] || ''
      });
    } else if (child.type === React.Fragment) {
       React.Children.forEach(child.props.children, (fragChild) => {
           if (React.isValidElement(fragChild) && fragChild.type === 'option') {
               options.push({
                   value: fragChild.props.value || '',
                   label: fragChild.props.children?.toString() || '',
                   statusClass: fragChild.props['data-status'] || '',
                   amountText: fragChild.props['data-amount'] || ''
               });
           }
       });
    }
  });

  const selectedOption = options.find(opt => opt.value === value);

  const updateDropdownPosition = () => {
    if (wrapperRef.current && isOpen) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = 240; // max-h-60 is 240px
      
      let top = rect.bottom + window.scrollY;
      
      // If no space below but space above, render upwards
      if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
        top = rect.top + window.scrollY - dropdownHeight - 4; // 4px margin
      } else {
        top += 4; // 4px margin below
      }

      const dropdownWidth = Math.max(rect.width, 200);
      let left = rect.left + window.scrollX;
      
      // If it overflows the right edge of the screen, align it to open to the left (right-aligned to trigger)
      if (rect.left + dropdownWidth > window.innerWidth) {
        left = rect.right + window.scrollX - dropdownWidth;
        // Bound it on the left edge of the viewport
        if (left < window.scrollX + 4) {
          left = window.scrollX + 4;
        }
      }

      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
        zIndex: 99999,
      });
    }
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent | PointerEvent) {
      if (
        wrapperRef.current && 
        !wrapperRef.current.contains(event.target as Node) &&
        (!dropdownRef.current || !dropdownRef.current.contains(event.target as Node))
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Handle position on scroll and resize
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
    }
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition, true);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } else {
      setSearchTerm('');
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  }, [isOpen]);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const trimmedSearchTerm = searchTerm.trim();
  const hasExactMatch = options.some(opt => opt.label.toLowerCase() === trimmedSearchTerm.toLowerCase());
  const showCreateOption = Boolean(onCreateOption && trimmedSearchTerm && !hasExactMatch);
  const optionCount = filteredOptions.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    setActiveIndex(0);
    optionRefs.current = [];
  }, [searchTerm, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const selectOptionAtIndex = (index: number) => {
    if (index < filteredOptions.length) {
      const opt = filteredOptions[index];
      if (!opt) return;
      onChange({ target: { value: opt.value } });
    } else if (showCreateOption) {
      onCreateOption?.(trimmedSearchTerm);
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative font-sans ${className.includes('min-h-') || className.includes('h-') ? '' : 'min-h-[30px]'} ${className}`} ref={wrapperRef}>
      {/* Trigger / Input Field */}
      <div 
        className={`relative w-full h-full min-h-[inherit] flex items-center transition-colors bg-transparent ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
        style={{ backgroundColor: 'inherit' }}
        onClick={() => {
          if (!disabled && !isOpen) setIsOpen(true);
        }}
      >
        <input
          id={id}
          ref={inputRef}
          type="text"
          disabled={disabled}
          className={`w-full h-full bg-transparent outline-none pl-2 pr-7 py-1 text-xs text-left truncate ${disabled ? 'cursor-not-allowed' : 'cursor-text'} ${!selectedOption && !isOpen ? 'text-gray-500' : ''} ${inputClassName}`}
          style={inputClassName.includes('text-center') ? { textAlign: 'center' } : undefined}
          placeholder={placeholder}
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : "")}
          onChange={(e) => {
            if (!disabled && !isOpen) setIsOpen(true);
            setSearchTerm(e.target.value);
          }}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                return;
              }
              if (optionCount > 0) {
                setActiveIndex(prev => (prev + 1) % optionCount);
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (!isOpen) {
                setIsOpen(true);
                return;
              }
              if (optionCount > 0) {
                setActiveIndex(prev => (prev - 1 + optionCount) % optionCount);
              }
            } else if (e.key === 'Enter') {
              if (isOpen && optionCount > 0) {
                e.preventDefault();
                selectOptionAtIndex(activeIndex);
              }
            } else if (e.key === 'Escape') {
              if (isOpen) {
                e.preventDefault();
                setIsOpen(false);
              }
            }
          }}
        />
        <div 
          className={`absolute right-0 top-0 h-full w-8 flex items-center justify-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[#ee317b]' : 'text-gray-500'}`} />
        </div>
      </div>
      {/* Portal Dropdown Menu */}
      {isOpen && createPortal(
        <>
          <style>{`
            @keyframes selectDropdownFadeIn {
              from { opacity: 0; transform: translateY(-4px) scale(0.98); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
            .animate-select-dropdown {
              animation: selectDropdownFadeIn 120ms cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
              transform-origin: top;
            }
          `}</style>
          <div 
            ref={dropdownRef}
            style={dropdownStyle}
            className="searchable-select-dropdown bg-[#181818] border border-[#262626] rounded-md shadow-2xl max-h-60 flex flex-col overflow-hidden animate-select-dropdown z-[9999]"
          >
            <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 py-1">
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="px-3 py-3 text-xs text-gray-500 text-center italic">
                No matches found
              </div>
            ) : (
              <>
                {filteredOptions.map((opt, index) => (
                  <div
                    key={`${opt.value}-${index}`}
                    ref={(node) => { optionRefs.current[index] = node; }}
                    onClick={() => {
                      onChange({ target: { value: opt.value } });
                      setIsOpen(false);
                    }}
                    className={`searchable-select-option px-3 py-2 text-xs cursor-pointer transition-colors flex justify-between items-center
                      ${index === activeIndex
                        ? 'bg-[#262626] text-white'
                        : opt.value === value 
                        ? 'bg-[#ee317b]/10 border-l-2 border-[#ee317b] font-bold' 
                        : 'hover:bg-[#262626] border-l-2 border-transparent'
                      } ${opt.statusClass ? opt.statusClass : (opt.value === value ? 'text-[#ee317b]' : 'text-gray-300')}
                    `}
                  >
                    <span className="truncate">{opt.label}</span>
                    {opt.amountText && <span className="opacity-70 whitespace-nowrap ml-2">{opt.amountText}</span>}
                  </div>
                ))}

                {showCreateOption && (
                  <div
                    ref={(node) => { optionRefs.current[filteredOptions.length] = node; }}
                    onClick={() => {
                      onCreateOption?.(trimmedSearchTerm);
                      setIsOpen(false);
                    }}
                    className={`searchable-select-create-option px-3 py-2.5 bg-[#ee317b]/10 hover:bg-[#ee317b]/20 text-white font-sans text-xs flex items-center justify-between cursor-pointer border-t border-[#262626] ${activeIndex === filteredOptions.length ? 'ring-1 ring-[#ee317b]/40' : ''}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PlusCircle className="w-4 h-4 text-[#ee317b] shrink-0" />
                      <span className="truncate">{createOptionLabel} <strong className="text-[#ee317b]">"{trimmedSearchTerm}"</strong></span>
                    </div>
                    {createOptionBadge && (
                      <span className="text-[10px] text-[#ee317b] uppercase font-sans font-bold tracking-wider ml-2 shrink-0">{createOptionBadge}</span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        </>,
        document.body
      )}
    </div>
  );
}
