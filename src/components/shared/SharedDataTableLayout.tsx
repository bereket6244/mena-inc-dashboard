import React, { ReactNode } from 'react';
import { PageLayout, TableToolbar, DataTableWrapper, DataTable } from './TabLayout';

interface SharedDataTableLayoutProps {
  id?: string;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  mobileLeftControls?: ReactNode;
  mobileRightControls?: ReactNode;
  mobileToolbarClassName?: string;
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
  tableClassName?: string;
  contentClassName?: string;
  disableResizing?: boolean;
}

export function SharedDataTableLayout({
  id,
  searchQuery,
  onSearchChange,
  mobileLeftControls,
  mobileRightControls,
  mobileToolbarClassName,
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
  tableClassName = '',
  contentClassName = '',
  disableResizing = false,
}: SharedDataTableLayoutProps) {
  const tableStateClasses = `alternating-table-rows ${tableClassName}`.trim();

  return (
    <PageLayout id={id}>
      <TableToolbar
        searchQuery={searchQuery}
        setSearchQuery={onSearchChange}
        mobileLeftControls={mobileLeftControls}
        mobileRightControls={mobileRightControls}
        mobileToolbarClassName={mobileToolbarClassName}
        desktopLeftControls={desktopLeftControls}
        desktopRightControls={desktopRightControls}
      />
      
      {selectedItemsBar}

      {children || (
        <>
          {/* RENDER MODE: EXCEL SPREADSHEET HORIZONTAL GRID */}
          <DataTableWrapper className={`${layoutMode === 'grid' ? 'block' : 'hidden'} mobile-table-bottom-gap md:mb-0 !border-t md:!border md:!rounded-md ${contentClassName}`}>
            <DataTable className={tableStateClasses} disableResizing={disableResizing}>
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
            <div className={`${layoutMode === 'cards' ? 'grid' : 'hidden'} shared-gallery-scroll grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 animate-none mobile-table-bottom-gap md:mb-0 ${contentClassName}`}>
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

export function SharedTr({ children, className = "", isSelected = false, ...props }: { children: ReactNode, className?: string, isSelected?: boolean } & React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr {...props} className={`group hover:bg-[#1a1a1a] transition-colors border-b border-[#262626] ${isSelected ? 'selected-row' : ''} ${className}`}>
      {children}
    </tr>
  );
}
