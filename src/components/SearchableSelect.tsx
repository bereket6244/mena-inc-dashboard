import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { ChevronDown, Search } from 'lucide-react';

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

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`relative font-sans ${className}`} ref={wrapperRef}>
      {/* Trigger Button */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full min-h-[30px] px-2 py-1 flex items-center justify-between text-xs cursor-pointer border rounded-md transition-colors bg-transparent border-transparent hover:border-[#ee317b]/50"
        style={{ backgroundColor: 'inherit', borderColor: 'inherit' }}
      >
        <span className={`truncate flex-1 text-left ${!selectedOption ? 'text-gray-500' : ''}`}>
          {selectedOption ? selectedOption.label : "Select..."}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180 text-[#ee317b]' : 'text-gray-500'}`} />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[9999] top-full mt-1 left-0 w-full min-w-[200px] bg-[#181818] border border-[#262626] rounded-md shadow-2xl max-h-60 flex flex-col overflow-hidden">
          
          {/* Search Input Box */}
          <div className="p-2 border-b border-[#262626] bg-[#1a1a1a]">
            <div className="relative">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                className="w-full pl-7 pr-3 py-1.5 bg-[#121212] border border-[#262626] rounded text-xs text-white outline-none focus:border-[#ee317b]/70"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options List */}
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
                    // Simulate native select event
                    onChange({ target: { value: opt.value } });
                    setIsOpen(false);
                    setSearchTerm('');
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
