import React, { useState, useRef, useEffect, ReactNode } from 'react';
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse children into options array
  const options: { value: string; label: string }[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    
    if (child.type === 'option') {
      options.push({
        value: child.props.value || '',
        label: child.props.children?.toString() || ''
      });
    } else if (child.type === React.Fragment) {
       React.Children.forEach(child.props.children, (fragChild) => {
           if (React.isValidElement(fragChild) && fragChild.type === 'option') {
               options.push({
                   value: fragChild.props.value || '',
                   label: fragChild.props.children?.toString() || ''
               });
           }
       });
    }
  });

  const selectedOption = options.find(opt => opt.value === value);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        className="relative w-full h-full min-h-[30px] flex items-center border rounded-md transition-colors bg-transparent border-transparent hover:border-[#ee317b]/50"
        style={{ backgroundColor: 'inherit', borderColor: 'inherit' }}
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

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[9999] top-full mt-1 left-0 w-full min-w-[200px] bg-[#181818] border border-[#262626] rounded-md shadow-2xl max-h-60 flex flex-col overflow-hidden">
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
                  className={`px-3 py-2 text-xs cursor-pointer transition-colors break-words
                    ${opt.value === value 
                      ? 'bg-[#ee317b]/10 text-[#ee317b] font-bold border-l-2 border-[#ee317b]' 
                      : 'text-gray-300 hover:bg-[#262626] border-l-2 border-transparent'
                    }
                  `}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
