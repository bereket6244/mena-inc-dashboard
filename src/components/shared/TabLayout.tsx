import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, Lock } from 'lucide-react';

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
  onLongPressFreeze,
}: {
  children: ReactNode;
  className?: string;
  onLongPressFreeze?: (target: 'header' | 'firstColumn') => void;
}) {
  const longPressTimerRef = useRef<number | null>(null);
  const [lockNotice, setLockNotice] = useState('');
  const draggedColumnRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    tableRef.current?.querySelectorAll('th').forEach(th => {
      th.setAttribute('draggable', 'true');
    });
  }, [children]);

  const triggerFreeze = (cell: HTMLTableCellElement | null) => {
    if (!onLongPressFreeze || !cell) return;

    const isHeader = cell.tagName.toLowerCase() === 'th';
    const isFirstColumn = cell.cellIndex === 0;
    if (!isHeader && !isFirstColumn) return;

    const target = isHeader ? 'header' : 'firstColumn';
    onLongPressFreeze(target);
    setLockNotice(target === 'header' ? 'Header lock toggled' : 'First column lock toggled');
    window.setTimeout(() => setLockNotice(''), 1400);

    if ('vibrate' in navigator) {
      navigator.vibrate?.(35);
    }
  };

  const handleDoubleClick = (event: React.MouseEvent<HTMLTableElement>) => {
    if (!onLongPressFreeze) return;

    const cell = (event.target as HTMLElement).closest('th,td') as HTMLTableCellElement | null;
    triggerFreeze(cell);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const moveColumn = (table: HTMLTableElement, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    Array.from(table.rows).forEach(row => {
      const cells = Array.from(row.children);
      const fromCell = cells[fromIndex];
      const toCell = cells[toIndex];
      if (!fromCell || !toCell) return;
      row.insertBefore(fromCell, fromIndex < toIndex ? toCell.nextSibling : toCell);
    });
  };

  return (
    <div className="overflow-x-auto scrollbar-none-x relative">
      <AnimatePresence>
        {lockNotice && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 rounded-md border border-[#ee317b]/40 bg-[#181818] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#ee317b] shadow-xl"
          >
            <Lock className="w-3 h-3" />
            {lockNotice}
          </motion.div>
        )}
      </AnimatePresence>
      <table
        ref={tableRef}
        className={`w-full text-left border-collapse font-sans text-xs ${className}`}
        onDoubleClick={handleDoubleClick}
        onDragStart={(event) => {
          const header = (event.target as HTMLElement).closest('th') as HTMLTableCellElement | null;
          draggedColumnRef.current = header?.cellIndex ?? null;
          event.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(event) => {
          if ((event.target as HTMLElement).closest('th')) event.preventDefault();
        }}
        onDrop={(event) => {
          const header = (event.target as HTMLElement).closest('th') as HTMLTableCellElement | null;
          const fromIndex = draggedColumnRef.current;
          if (!header || fromIndex === null) return;
          event.preventDefault();
          moveColumn(event.currentTarget, fromIndex, header.cellIndex);
          draggedColumnRef.current = null;
        }}
        onTouchStart={(event) => {
          const cell = (event.target as HTMLElement).closest('th,td') as HTMLTableCellElement | null;
          clearLongPressTimer();
          longPressTimerRef.current = window.setTimeout(() => triggerFreeze(cell), 650);
        }}
        onTouchEnd={clearLongPressTimer}
        onTouchMove={clearLongPressTimer}
        onTouchCancel={clearLongPressTimer}
      >
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
