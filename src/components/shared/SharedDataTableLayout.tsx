import React, { ReactNode } from 'react';
import { PageLayout, TableToolbar, DataTableWrapper, DataTable } from './TabLayout';

interface SharedDataTableLayoutProps {
  id?: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  mobileLeftControls?: ReactNode;
  mobileRightControls?: ReactNode;
  desktopLeftControls?: ReactNode;
  desktopRightControls?: ReactNode;
  selectedItemsBar?: ReactNode;
  tableHeaders?: ReactNode;
  tableBody?: ReactNode;
  fab?: ReactNode;
  modals?: ReactNode;
  layoutMode?: 'grid' | 'cards';
  cardsView?: ReactNode;
  children?: ReactNode;
  tablePreferenceKey?: string;
}

export function SharedDataTableLayout({
  id,
  searchQuery,
  onSearchChange,
  mobileLeftControls,
  mobileRightControls,
  desktopLeftControls,
  desktopRightControls,
  selectedItemsBar,
  tableHeaders,
  tableBody,
  fab,
  modals,
  layoutMode = 'grid',
  cardsView,
  children,
}: SharedDataTableLayoutProps) {
  const tableStateClasses = 'alternating-table-rows';

  return (
    <PageLayout id={id}>
      <TableToolbar
        searchQuery={searchQuery}
        setSearchQuery={onSearchChange}
        mobileLeftControls={mobileLeftControls}
        mobileRightControls={mobileRightControls}
        desktopLeftControls={desktopLeftControls}
        desktopRightControls={desktopRightControls}
      />
      
      {selectedItemsBar}

      {children || (
        <>
          {/* RENDER MODE: EXCEL SPREADSHEET HORIZONTAL GRID */}
          <DataTableWrapper className={`${layoutMode === 'grid' ? 'block' : 'hidden'} mb-28 md:mb-0 !border-t md:!border md:!rounded-md`}>
            <DataTable className={tableStateClasses}>
              <thead>
                <tr className="bg-[#181818] border-b border-[#262626] text-gray-400 font-sans tracking-wider uppercase text-center">
                  {tableHeaders}
                </tr>
              </thead>
              <tbody>
                {tableBody}
              </tbody>
            </DataTable>
          </DataTableWrapper>

          {/* RESPONSIVE CARDS VIEW */}
          {cardsView && (
            <div className={`${layoutMode === 'cards' ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-none mb-28 md:mb-0`}>
              {cardsView}
            </div>
          )}
        </>
      )}

      {modals}
      
      {fab}
    </PageLayout>
  );
}

export function SharedTh({ children, className = "", align = "left", isIndex = false, width, onClick }: { children: ReactNode, className?: string, align?: 'left'|'center'|'right', isIndex?: boolean, width?: string, onClick?: () => void }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  if (isIndex) {
    return (
      <th className={`py-1.5 md:py-2.5 px-2.5 md:px-3 border-r border-[#262626] bg-[#1C1C1C] font-bold text-gray-500 font-sans text-center w-8 text-[11px] md:text-xs ${className}`} style={width ? { width } : undefined} onClick={onClick}>
        {children}
      </th>
    );
  }
  return (
    <th className={`py-2.5 px-3 font-semibold text-gray-300 border-r border-[#262626] ${alignClass} ${className}`} style={width ? { width } : undefined} onClick={onClick}>
      {children}
    </th>
  );
}

export function SharedTd({ children, className = "", align = "left", isIndex = false }: { children: ReactNode, className?: string, align?: 'left'|'center'|'right', isIndex?: boolean }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
  if (isIndex) {
    return (
      <td className={`py-2 px-1 text-center font-sans text-gray-500 border-r border-[#262626] bg-[#181818] ${className}`}>
        {children}
      </td>
    );
  }
  return (
    <td className={`py-2 px-3 border-r border-[#262626] font-sans ${alignClass} ${className}`}>
      {children}
    </td>
  );
}

export function SharedTr({ children, className = "", isSelected = false }: { children: ReactNode, className?: string, isSelected?: boolean }) {
  return (
    <tr className={`group hover:bg-[#1a1a1a] transition-colors border-b border-[#262626] ${isSelected ? 'selected-row bg-[#121912]/20 border-l-2 border-[#71b536]' : ''} ${className}`}>
      {children}
    </tr>
  );
}
