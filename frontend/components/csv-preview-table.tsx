"use client";

import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CsvRow } from "@/types/crm";

const PAGE_SIZE = 10;
const MAX_PREVIEW_ROWS = 100;

interface CsvPreviewTableProps {
  columns: string[];
  rows: CsvRow[];
}

// Shows a preview of the parsed CSV before the user confirms the import.
// Input: the column names and the parsed rows (only the first
// MAX_PREVIEW_ROWS are actually rendered, to keep this fast for big files).
// Output: a paginated, scrollable preview table.
export function CsvPreviewTable({ columns, rows }: CsvPreviewTableProps) {
  const previewRows = useMemo(() => rows.slice(0, MAX_PREVIEW_ROWS), [rows]);

  const columnDefs = useMemo<ColumnDef<CsvRow>[]>(
    () =>
      columns.map((column, index) => ({
        // Explicit, index-based id — never derived from the header text.
        // CSV headers are untrusted: they can be blank (falsy id) or
        // duplicated (colliding id), either of which breaks TanStack's
        // internal column lookup. accessorFn (not accessorKey) is used for
        // the same reason: accessorKey treats "." in a key as a nested-path
        // separator, which would misread a literal header like "a.b".
        id: `col_${index}`,
        accessorFn: (row) => row[column],
        header: column || `Column ${index + 1}`,
        cell: (info) => {
          const value = info.getValue<string>();
          if (!value) {
            return <span className="text-muted-foreground">—</span>;
          }
          return (
            <Tooltip>
              <TooltipTrigger
                render={<span className="block max-w-[250px] truncate text-left" />}
              >
                {value}
              </TooltipTrigger>
              <TooltipContent>{value}</TooltipContent>
            </Tooltip>
          );
        },
      })),
    [columns]
  );

  const table = useReactTable({
    data: previewRows,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: PAGE_SIZE },
    },
  });

  const previewCount = previewRows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageStart = previewCount === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = Math.min(pageStart + pageSize - 1, previewCount);
  const rangeLabel =
    rows.length > MAX_PREVIEW_ROWS
      ? `Showing ${pageStart}–${pageEnd} of first ${MAX_PREVIEW_ROWS} preview rows (${rows.length.toLocaleString()} total)`
      : `Showing ${pageStart}–${pageEnd} of ${rows.length.toLocaleString()} rows`;

  return (
    <div className="space-y-3">
      <div className="max-h-[360px] overflow-auto rounded-lg border">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="bg-muted sticky top-0 z-20 border-b font-semibold whitespace-nowrap shadow-sm"
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="bg-card">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </table>
      </div>

      <div className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">{rangeLabel}</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
