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
  mobileToolbarClassName = "",
  desktopLeftControls,
  desktopRightControls,
}: {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  mobileLeftControls?: ReactNode;
  mobileRightControls?: ReactNode;
  mobileToolbarClassName?: string;
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

  useEffect(() => {
    const handleFocusSearch = (event: Event) => {
      const requestedTab = (event as CustomEvent)?.detail?.tab;
      const panel = (searchWrapperRef.current || mobileSearchWrapperRef.current)?.closest('[id$="-tab-pnl"]') as HTMLElement | null;
      if (requestedTab && panel && panel.id !== `${requestedTab}-tab-pnl`) return;
      const desktopToolbar = searchWrapperRef.current?.closest('.app-sticky-toolbar') as HTMLElement | null;
      const mobileToolbar = mobileSearchWrapperRef.current?.closest('.app-mobile-sticky-toolbar') as HTMLElement | null;
      const desktopVisible = !!desktopToolbar && window.getComputedStyle(desktopToolbar).display !== 'none';
      const mobileVisible = !!mobileToolbar && window.getComputedStyle(mobileToolbar).display !== 'none';
      setIsSearchExpanded(true);
      window.setTimeout(() => {
        if (desktopVisible) {
          searchInputRef.current?.focus();
        } else if (mobileVisible) {
          mobileSearchInputRef.current?.focus();
        }
      }, 0);
    };
    window.addEventListener('mena:focus-search', handleFocusSearch);
    return () => window.removeEventListener('mena:focus-search', handleFocusSearch);
  }, []);

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
      <div className={`app-mobile-sticky-toolbar md:hidden flex items-center justify-between gap-1.5 pt-1 relative w-full h-8 ${mobileToolbarClassName}`}>
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
      <div className="app-sticky-toolbar hidden md:flex items-center justify-between gap-4 py-1.5 border-b border-[#262626] font-sans text-xs">
        {/* Left Side: Custom views or title */}
        <div className="flex items-center text-gray-400 font-medium gap-2">
          {desktopLeftControls}
        </div>

        {/* Right Side: Search and actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Search control in toolbar */}
          <div ref={searchWrapperRef} className="relative flex items-center">
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

          {desktopRightControls}
        </div>
      </div>
    </>
  );
}

export function DataTableWrapper({ children, className = "" }: { children: ReactNode, className?: string }) {
  return (
    <div className={`bg-[#121212] border border-[#262626] shadow-none overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function DataTable({
  children,
  className = "",
  id,
  disableResizing,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  disableResizing?: boolean;
}) {
  const tableRef = useRef<HTMLTableElement>(null);
  const scrollOuterRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [topScrollWidth, setTopScrollWidth] = useState(0);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  useEffect(() => {
    const table = tableRef.current;
    const scrollOuter = scrollOuterRef.current;
    if (!table || !scrollOuter) return;

    const measure = () => {
      setTopScrollWidth(table.scrollWidth);
      setHasHorizontalOverflow(scrollOuter.scrollWidth > scrollOuter.clientWidth + 1);
    };

    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(table);
    resizeObserver.observe(scrollOuter);
    window.addEventListener('resize', measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  const syncHorizontalScroll = (source: 'top' | 'table') => {
    const scrollOuter = scrollOuterRef.current;
    const topScroll = topScrollRef.current;
    if (!scrollOuter || !topScroll) return;

    if (source === 'top') {
      scrollOuter.scrollLeft = topScroll.scrollLeft;
    } else {
      topScroll.scrollLeft = scrollOuter.scrollLeft;
    }
  };

  return (
    <div className="data-table-scroll app-main-table-scroll relative">
      <div
        ref={scrollOuterRef}
        className="data-table-scroll-outer scrollbar-none-x relative"
        onScroll={() => syncHorizontalScroll('table')}
      >
        <table
          ref={tableRef}
          id={id}
          className={`freeze-pane-table w-full text-left border-collapse font-sans text-xs ${className}`}
        >
          {children}
        </table>
      </div>
      <div
        ref={topScrollRef}
        className={`data-table-top-scroll hidden md:block ${hasHorizontalOverflow ? '' : 'opacity-0 pointer-events-none'}`}
        onScroll={() => syncHorizontalScroll('top')}
        aria-hidden="true"
      >
        <div style={{ width: topScrollWidth, height: 1 }} />
      </div>
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
