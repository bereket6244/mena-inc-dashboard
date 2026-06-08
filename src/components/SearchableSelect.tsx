import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface SearchableSelectProps {
  value: string;
  onChange: (e: any) => void;
  children: ReactNode;
  className?: string;
}

export default function SearchableSelect({
  value,
  onChange,
  children,
  className = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${Math.max(rect.width, 200)}px`,
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

  return (
    <div className={`relative font-sans ${className}`} ref={wrapperRef}>
      {/* Trigger / Input Field */}
      <div 
        className="relative w-full h-full min-h-[30px] flex items-center transition-colors bg-transparent"
        style={{ backgroundColor: 'inherit' }}
        onClick={() => {
          if (!isOpen) setIsOpen(true);
        }}
      >
        <input
          ref={inputRef}
          type="text"
          className={`w-full h-full bg-transparent outline-none pl-2 pr-7 py-1 text-xs text-left truncate cursor-text ${!selectedOption && !isOpen ? 'text-gray-500' : ''}`}
          placeholder="Select..."
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : "")}
          onChange={(e) => {
            if (!isOpen) setIsOpen(true);
            setSearchTerm(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
        />
        <div 
          className="absolute right-0 top-0 h-full w-8 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180 text-[#ee317b]' : 'text-gray-500'}`} />
        </div>
      </div>

      {/* Portal Dropdown Menu */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          style={dropdownStyle}
          className="bg-[#181818] border border-[#262626] rounded-md shadow-2xl max-h-60 flex flex-col overflow-hidden"
        >
          <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1 py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-500 text-center italic">
                No matches found
              </div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={`${opt.value}-${index}`}
                  onClick={() => {
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                  }}
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors flex justify-between items-center
                    ${opt.value === value 
                      ? 'bg-[#ee317b]/10 border-l-2 border-[#ee317b] font-bold' 
                      : 'hover:bg-[#262626] border-l-2 border-transparent'
                    } ${opt.statusClass ? opt.statusClass : (opt.value === value ? 'text-[#ee317b]' : 'text-gray-300')}
                  `}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.amountText && <span className="opacity-70 whitespace-nowrap ml-2">{opt.amountText}</span>}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
