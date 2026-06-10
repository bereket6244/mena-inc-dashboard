import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus } from 'lucide-react';

export function PageLayout({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div className="space-y-3" id={id}>
      {children}
    </div>
  );
}

export function TableToolbar({
  searchQuery,
  setSearchQuery,
  mobileLeftControls,
  mobileRightControls,
  desktopLeftControls,
  desktopRightControls,
}: {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  mobileLeftControls?: ReactNode;
  mobileRightControls?: ReactNode;
  desktopLeftControls?: ReactNode;
  desktopRightControls?: ReactNode;
}) {
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchWrapperRef = useRef<HTMLDivElement>(null);

  // Focus management
  useEffect(() => {
    if (isSearchExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  useEffect(() => {
    if (isSearchExpanded && mobileSearchInputRef.current) {
      mobileSearchInputRef.current.focus();
    }
  }, [isSearchExpanded]);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSearchExpanded, searchQuery]);

  useEffect(() => {
    const handleClickOutsideMobile = (e: MouseEvent) => {
      if (mobileSearchWrapperRef.current && !mobileSearchWrapperRef.current.contains(e.target as Node)) {
        if (!searchQuery) {
          setIsSearchExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutsideMobile);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideMobile);
    };
  }, [isSearchExpanded, searchQuery]);

  return (
    <>
      {/* Mobile-only Notion Toolbar Control Row */}
      <div className="md:hidden flex items-center justify-between gap-1.5 pt-1 relative w-full h-8">
        {/* Left Side */}
        <div className="flex bg-transparent shrink-0 gap-0.5">
          {mobileLeftControls}
        </div>

        {/* Right Side: Search toggler & Additional Controls */}
        <div className="flex items-center gap-1 justify-end flex-1">
          <div ref={mobileSearchWrapperRef} className="relative flex items-center h-7 select-none">
            <AnimatePresence initial={false}>
              {!(isSearchExpanded || searchQuery) ? (
                <motion.button
                  key="search-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  type="button"
                  onClick={() => setIsSearchExpanded(true)}
                  className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#181818] transition-colors cursor-pointer"
                  title="Search database"
                >
                  <Search className="w-3.5 h-3.5" />
                </motion.button>
              ) : (
                <motion.div
                  key="search-input-wrapper"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 25, stiffness: 250 }}
                  className="relative flex items-center bg-transparent overflow-hidden"
                >
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1 flex-shrink-0">
                    <Search className="h-3.5 w-3.5" />
                  </div>
                  <input
                    ref={mobileSearchInputRef}
                    type="text"
                    placeholder="Type to search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setIsSearchExpanded(false);
                      }
                    }}
                    className="bg-transparent text-[11px] text-white border-none outline-none focus:outline-none focus:ring-0 no-focus-outline shadow-none p-0 m-0 font-sans w-full pl-0.5"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchExpanded(false);
                      }}
                      className="ml-1 text-gray-500 hover:text-white transition-colors focus:outline-none flex-shrink-0"
                      title="Clear search"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {!(isSearchExpanded || searchQuery) && mobileRightControls}
        </div>
      </div>

      {/* Notion-style Database Toolbar (Desktop/Tablet) */}
      <div className="hidden md:flex items-center justify-between gap-4 py-1.5 border-b border-[#262626] font-sans text-xs">
        {/* Left Side: Custom views or title */}
        <div className="flex items-center text-gray-400 font-medium gap-2">
          {desktopLeftControls}
        </div>

        {/* Right Side: Filters, Search, Switcher, Create Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {desktopRightControls}

          {/* Search control in toolbar */}
          <div ref={searchWrapperRef} className="relative flex items-center">
            {!(isSearchExpanded || searchQuery) ? (
              <button
                type="button"
                onClick={() => setIsSearchExpanded(true)}
                className="flex items-center justify-center p-1.5 rounded text-gray-300 hover:bg-[#202020] hover:text-white transition-colors cursor-pointer text-xs font-medium font-sans"
                title="Search database"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="relative flex items-center bg-transparent transition-all">
                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-[#252525] text-gray-400 mr-1">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setIsSearchExpanded(false);
                    }
                  }}
                  className="bg-transparent text-xs text-white border-none outline-none focus:outline-none focus:ring-0 shadow-none w-[180px] font-sans placeholder-gray-600 focus:placeholder-gray-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setIsSearchExpanded(false);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white transition-colors cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function DataTableWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="bg-[#121212] border border-[#262626] shadow-none overflow-hidden">
      {children}
    </div>
  );
}

export function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs font-sans">
        {children}
      </table>
    </div>
  );
}

export function FloatingAddButton({
  onClick,
  title,
  icon = <Plus className="w-5 h-5" />
}: {
  onClick: () => void;
  title: string;
  icon?: ReactNode;
}) {
  return (
    <div className="md:hidden fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] right-4 z-30 pointer-events-none">
      <button
        type="button"
        onClick={onClick}
        className="bg-[#ee317b] text-black rounded-full p-3 shadow-lg shadow-[#ee317b]/15 flex items-center justify-center transition-transform hover:scale-105 active:scale-95 pointer-events-auto"
        title={title}
      >
        {icon}
      </button>
    </div>
  );
}
