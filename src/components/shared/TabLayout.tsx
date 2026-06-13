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
  id = "default-table"
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const [isEditMode, setIsEditMode] = useState(false);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const draggedColumnRef = useRef<number | null>(null);

  // Indicators refs
  const colIndicatorRef = useRef<HTMLDivElement>(null);

  // Mobile Tapped Column/Row Refs
  const [tappedColIndex, setTappedColIndex] = useState<number | null>(null);
  const [tappedRowIndex, setTappedRowIndex] = useState<number | null>(null);

  // Setup handles & draggables on render
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    const isMobile = window.innerWidth <= 768;

    // Set draggable headers
    table.querySelectorAll('th').forEach((th: any, colIdx) => {
      // Don't drag the first two columns (usually Index and Checkbox)
      if (colIdx >= 2 && (!isMobile || isEditMode)) {
        th.setAttribute('draggable', 'true');
        th.classList.add('draggable-header');
      } else {
        th.removeAttribute('draggable');
        th.classList.remove('draggable-header');
      }

      // Add col-resize-handle if missing
      if (!th.querySelector('.col-resize-handle')) {
        const handle = document.createElement('div');
        handle.className = 'col-resize-handle';
        // Prevent click from triggering sort on th
        handle.addEventListener('click', (e) => e.stopPropagation());
        th.appendChild(handle);
      }
    });

    // Add row-resize-handles in tbody first cell
    table.querySelectorAll('tbody tr').forEach((tr: any) => {
      const firstCell = tr.cells[0];
      if (firstCell && !firstCell.querySelector('.row-resize-handle')) {
        const handle = document.createElement('div');
        handle.className = 'row-resize-handle';
        firstCell.style.position = 'relative';
        firstCell.appendChild(handle);
      }
    });
  }, [children, isEditMode]);

  // Handle Resize Events
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    let activeResize: {
      type: 'col' | 'row';
      element: HTMLElement;
      startX: number;
      startY: number;
      startSize: number;
      colIndex?: number;
    } | null = null;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!activeResize) return;

      const clientX = 'clientX' in e ? e.clientX : e.touches[0].clientX;
      const clientY = 'clientY' in e ? e.clientY : e.touches[0].clientY;

      if (activeResize.type === 'col') {
        const deltaX = clientX - activeResize.startX;
        const newWidth = Math.max(40, activeResize.startSize + deltaX);
        const colIdx = activeResize.colIndex!;
        
        activeResize.element.style.width = `${newWidth}px`;
        activeResize.element.style.minWidth = `${newWidth}px`;
        activeResize.element.style.maxWidth = `${newWidth}px`;

        Array.from(table.rows).forEach((row: any) => {
          const cell = row.cells[colIdx];
          if (cell) {
            cell.style.width = `${newWidth}px`;
            cell.style.minWidth = `${newWidth}px`;
            cell.style.maxWidth = `${newWidth}px`;
          }
        });
      } else if (activeResize.type === 'row') {
        const deltaY = clientY - activeResize.startY;
        const newHeight = Math.max(20, activeResize.startSize + deltaY);
        activeResize.element.style.height = `${newHeight}px`;
        Array.from((activeResize.element as HTMLTableRowElement).cells).forEach((cell: any) => {
          cell.style.height = `${newHeight}px`;
        });
      }

      e.preventDefault();
    };

    const handleEnd = () => {
      if (activeResize) {
        const element = activeResize.element;
        const type = activeResize.type;
        const finalSize = type === 'col' ? element.offsetWidth : element.offsetHeight;
        
        try {
          const tableId = table.id || table.className.split(' ').find((c: string) => c.includes('table')) || 'default';
          const savedSizesStr = localStorage.getItem('mena_inc_table_sizes') || '{}';
          const savedSizes = JSON.parse(savedSizesStr);

          if (type === 'col') {
            const cell = element as HTMLTableCellElement;
            const colIndex = cell.cellIndex;
            const headerText = cell.textContent?.trim() || String(colIndex);
            const colKey = `${tableId}-col-${headerText}`;
            savedSizes[colKey] = finalSize;
          } else if (type === 'row') {
            const row = element as HTMLTableRowElement;
            const rowIndex = Array.from(row.parentNode?.children || []).indexOf(row);
            const rowKey = `${tableId}-row-${rowIndex}`;
            savedSizes[rowKey] = finalSize;
          }

          localStorage.setItem('mena_inc_table_sizes', JSON.stringify(savedSizes));
        } catch (err) {
          console.error(err);
        }

        activeResize = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }

      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    const handleStart = (e: any) => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && !isEditMode) return;

      const target = e.target as HTMLElement;
      if (target.classList.contains('col-resize-handle')) {
        e.stopPropagation();
        e.preventDefault();
        const th = target.closest('th') as HTMLTableCellElement;
        const clientX = e.clientX || e.touches?.[0].clientX;
        
        activeResize = {
          type: 'col',
          element: th,
          startX: clientX,
          startY: 0,
          startSize: th.offsetWidth,
          colIndex: th.cellIndex
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
      } else if (target.classList.contains('row-resize-handle')) {
        e.stopPropagation();
        e.preventDefault();
        const tr = target.closest('tr') as HTMLTableRowElement;
        const clientY = e.clientY || e.touches?.[0].clientY;
        
        activeResize = {
          type: 'row',
          element: tr,
          startX: 0,
          startY: clientY,
          startSize: tr.offsetHeight
        };

        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        window.addEventListener('mousemove', handleMove, { passive: false });
        window.addEventListener('mouseup', handleEnd);
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
      }
    };

    table.addEventListener('mousedown', handleStart);
    table.addEventListener('touchstart', handleStart);

    return () => {
      table.removeEventListener('mousedown', handleStart);
      table.removeEventListener('touchstart', handleStart);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isEditMode]);

  // Touch gesture handler for mobile
  useEffect(() => {
    const table = tableRef.current;
    if (!table) return;

    let longPressTimer: any = null;
    let touchStartPos = { x: 0, y: 0 };
    const LONG_PRESS_DELAY = 250;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isEditMode) return;
      const target = e.target as HTMLElement;
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };

      const th = target.closest('th');
      const tr = target.closest('tbody tr') as HTMLTableRowElement | null;

      if (th && !target.classList.contains('col-resize-handle')) {
        setTappedColIndex(th.cellIndex);
      }

      if (tr) {
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          if (navigator.vibrate) navigator.vibrate(50);
          setTappedRowIndex(tr.rowIndex);
        }, LONG_PRESS_DELAY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const dist = Math.hypot(touch.clientX - touchStartPos.x, touch.clientY - touchStartPos.y);
      if (dist > 10) {
        clearTimeout(longPressTimer);
      }
    };

    const handleTouchEnd = () => {
      clearTimeout(longPressTimer);
    };

    table.addEventListener('touchstart', handleTouchStart);
    table.addEventListener('touchmove', handleTouchMove);
    table.addEventListener('touchend', handleTouchEnd);

    return () => {
      table.removeEventListener('touchstart', handleTouchStart);
      table.removeEventListener('touchmove', handleTouchMove);
      table.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isEditMode]);

  const handleDragStart = (e: React.DragEvent<HTMLTableElement>) => {
    const isMobile = window.innerWidth <= 768;
    if (isMobile && !isEditMode) {
      e.preventDefault();
      return;
    }

    const header = (e.target as HTMLElement).closest('th') as HTMLTableCellElement | null;
    if (!header || header.cellIndex < 2) {
      e.preventDefault();
      return;
    }

    draggedColumnRef.current = header.cellIndex;
    e.dataTransfer.effectAllowed = 'move';
    header.classList.add('mobile-dragging');
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableElement>) => {
    const header = (e.target as HTMLElement).closest('th') as HTMLTableCellElement | null;
    if (!header || draggedColumnRef.current === null || header.cellIndex < 2) return;

    e.preventDefault();

    const rect = header.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const isLeft = e.clientX < midX;

    const tableRect = tableRef.current!.getBoundingClientRect();
    const leftOffset = rect.left - tableRect.left + (isLeft ? 0 : rect.width);

    if (colIndicatorRef.current) {
      colIndicatorRef.current.style.display = 'block';
      colIndicatorRef.current.style.left = `${leftOffset}px`;
    }
  };

  const handleDragLeave = () => {
    if (colIndicatorRef.current) {
      colIndicatorRef.current.style.display = 'none';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLTableElement>) => {
    const header = (e.target as HTMLElement).closest('th') as HTMLTableCellElement | null;
    const fromIndex = draggedColumnRef.current;
    
    if (colIndicatorRef.current) {
      colIndicatorRef.current.style.display = 'none';
    }

    if (!header || fromIndex === null || header.cellIndex < 2) {
      draggedColumnRef.current = null;
      return;
    }

    e.preventDefault();
    moveColumn(tableRef.current!, fromIndex, header.cellIndex);
    
    tableRef.current?.querySelectorAll('th').forEach(th => th.classList.remove('mobile-dragging'));
    draggedColumnRef.current = null;
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
    <div ref={containerRef} className="relative w-full">
      {/* Mobile-only Layout Editing Toggle Panel */}
      <div className="md:hidden flex items-center justify-between px-3 py-1.5 bg-[#181818] border-b border-[#262626] text-[11px] font-sans text-gray-400">
        <span className="font-medium">Table Layout Adjustments</span>
        <button
          type="button"
          onClick={() => {
            setIsEditMode(!isEditMode);
            setTappedColIndex(null);
            setTappedRowIndex(null);
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors select-none ${
            isEditMode
              ? 'bg-[#ee317b]/20 text-[#ee317b] border border-[#ee317b]/30'
              : 'bg-[#262626] text-gray-300 border border-[#374151]'
          }`}
        >
          {isEditMode ? 'Layout: Editing' : 'Layout: Locked'}
        </button>
      </div>

      <div className="data-table-scroll app-main-table-scroll overflow-auto scrollbar-none-x relative">
        <div ref={colIndicatorRef} className="col-drop-indicator" style={{ display: 'none' }} />

        <table
          ref={tableRef}
          id={id}
          className={`freeze-pane-table w-full text-left border-collapse font-sans text-xs ${className} ${
            isEditMode ? 'layout-editing-active' : ''
          }`}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {children}
        </table>
      </div>

      <style>{`
        @media (max-width: 768px) {
          ${!isEditMode ? `
            .col-resize-handle, .row-resize-handle {
              display: none !important;
            }
          ` : `
            .col-resize-handle {
              display: none !important;
            }
            .row-resize-handle {
              display: none !important;
            }
            ${tappedColIndex !== null ? `
              th:nth-child(${tappedColIndex + 1}) .col-resize-handle {
                display: block !important;
                background-color: #ee317b !important;
              }
              th:nth-child(${tappedColIndex + 1}) {
                box-shadow: inset 0 0 0 2px #ee317b !important;
                background-color: rgba(238, 49, 123, 0.05) !important;
              }
            ` : ''}
            ${tappedRowIndex !== null ? `
              tbody tr:nth-child(${tappedRowIndex}) td:first-child .row-resize-handle {
                display: block !important;
                background-color: #ee317b !important;
              }
              tbody tr:nth-child(${tappedRowIndex}) {
                box-shadow: inset 0 0 0 2px #ee317b !important;
                background-color: rgba(238, 49, 123, 0.02) !important;
              }
            ` : ''}
          `}
        }
      `}</style>
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
