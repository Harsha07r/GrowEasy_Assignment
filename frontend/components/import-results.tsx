// Step 3: shows what happened after Confirm Import — how many records were
// imported, how many were skipped and why, plus the full data in two tables.
"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CrmRecord, ImportResult, SkippedRow } from "@/types/crm";

const ROWS_PER_PAGE = 10;

// Shows a value in a single truncated line, with the full text in a tooltip.
// Input: the text to show.
// Output: a span (or a dash if the value is empty).
function TruncatedText({ value }: { value: string }) {
  if (!value) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className="block max-w-[220px] truncate text-left" />}
      >
        {value}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

// Picks a badge color for a CRM status value.
// Input: the crm_status string.
// Output: a badge variant name matching the ui Badge component.
function crmStatusBadgeVariant(status: string) {
  if (status === "GOOD_LEAD_FOLLOW_UP" || status === "SALE_DONE") return "default";
  if (status === "DID_NOT_CONNECT") return "secondary";
  if (status === "BAD_LEAD") return "destructive";
  return "outline";
}

const importedColumns: ColumnDef<CrmRecord>[] = [
  {
    id: "created_at",
    header: "Created At",
    accessorFn: (row) => row.created_at,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "email",
    header: "Email",
    accessorFn: (row) => row.email,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "country_code",
    header: "Country Code",
    accessorFn: (row) => row.country_code,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "mobile_without_country_code",
    header: "Mobile",
    accessorFn: (row) => row.mobile_without_country_code,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "company",
    header: "Company",
    accessorFn: (row) => row.company,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "city",
    header: "City",
    accessorFn: (row) => row.city,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "state",
    header: "State",
    accessorFn: (row) => row.state,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "country",
    header: "Country",
    accessorFn: (row) => row.country,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "lead_owner",
    header: "Lead Owner",
    accessorFn: (row) => row.lead_owner,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "crm_status",
    header: "CRM Status",
    accessorFn: (row) => row.crm_status,
    cell: (info) => {
      const status = info.getValue<string>();
      if (!status) return <span className="text-muted-foreground">—</span>;
      return <Badge variant={crmStatusBadgeVariant(status)}>{status}</Badge>;
    },
  },
  {
    id: "crm_note",
    header: "CRM Note",
    accessorFn: (row) => row.crm_note,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "data_source",
    header: "Data Source",
    accessorFn: (row) => row.data_source,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "possession_time",
    header: "Possession Time",
    accessorFn: (row) => row.possession_time,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
  {
    id: "description",
    header: "Description",
    accessorFn: (row) => row.description,
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
];

const skippedColumns: ColumnDef<SkippedRow>[] = [
  {
    id: "rowIndex",
    header: "Row #",
    accessorFn: (row) => row.rowIndex + 1,
  },
  {
    id: "reason",
    header: "Reason",
    accessorFn: (row) => row.reason,
    cell: (info) => (
      <span className="block max-w-[320px] whitespace-normal text-destructive">
        {info.getValue<string>()}
      </span>
    ),
  },
  {
    id: "raw",
    header: "Raw Row",
    accessorFn: (row) => JSON.stringify(row.raw),
    cell: (info) => <TruncatedText value={info.getValue<string>()} />,
  },
];

// Shows the imported CRM records in a paginated, scrollable table.
// Input: the list of imported records.
// Output: the table, or an empty-state message if there are none.
function ImportedRecordsTable({ rows }: { rows: CrmRecord[] }) {
  const table = useReactTable({
    data: rows,
    columns: importedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: ROWS_PER_PAGE } },
  });

  if (rows.length === 0) {
    return <EmptyState label="No records were imported." />;
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const firstRowOnPage = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRowOnPage = Math.min(firstRowOnPage + pageSize - 1, rows.length);

  return (
    <>
      <div className="max-h-[420px] w-full overflow-auto rounded-lg border">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-20 border-b bg-muted font-semibold whitespace-nowrap shadow-sm"
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

      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Showing {firstRowOnPage}–{lastRowOnPage} of {rows.length.toLocaleString()} rows
        </p>
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
    </>
  );
}

// Shows the skipped rows (and why they were skipped) in a paginated,
// scrollable table.
// Input: the list of skipped rows.
// Output: the table, or an empty-state message if there are none.
function SkippedRecordsTable({ rows }: { rows: SkippedRow[] }) {
  const table = useReactTable({
    data: rows,
    columns: skippedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: ROWS_PER_PAGE } },
  });

  if (rows.length === 0) {
    return <EmptyState label="No records were skipped." />;
  }

  const { pageIndex, pageSize } = table.getState().pagination;
  const firstRowOnPage = rows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const lastRowOnPage = Math.min(firstRowOnPage + pageSize - 1, rows.length);

  return (
    <>
      <div className="max-h-[420px] w-full overflow-auto rounded-lg border">
        <table className="w-full caption-bottom text-sm">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="sticky top-0 z-20 border-b bg-muted font-semibold whitespace-nowrap shadow-sm"
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

      <div className="flex flex-col-reverse items-center justify-between gap-3 pt-3 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          Showing {firstRowOnPage}–{lastRowOnPage} of {rows.length.toLocaleString()} rows
        </p>
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
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed p-10 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

// Builds the wording for the success banner shown after an import finishes.
// Input: how many records were imported and how many were skipped.
// Output: a short message describing the outcome.
function buildSuccessMessage(importedCount: number, skippedCount: number) {
  if (importedCount > 0 && skippedCount === 0) {
    return "All records were imported successfully.";
  }
  if (importedCount > 0 && skippedCount > 0) {
    return `Import completed. ${importedCount} record${importedCount === 1 ? "" : "s"} imported, ${skippedCount} skipped — see Skipped Records below for details.`;
  }
  return "Import completed, but no records could be imported. See Skipped Records below for details.";
}

interface ImportResultsProps {
  result: ImportResult;
  onStartOver: () => void;
}

// The main results screen shown after a CSV import finishes.
// Input: the import result (imported/skipped/totalRows) and a callback to
// reset the wizard back to the upload step.
// Output: the summary stats, a toggle between the two tables, and the table.
export function ImportResults({ result, onStartOver }: ImportResultsProps) {
  const [activeView, setActiveView] = useState<"imported" | "skipped">("imported");

  const importedCount = result.imported.length;
  const skippedCount = result.skipped.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Import Summary</h2>
        <p className="text-sm text-muted-foreground">
          Your CSV has been processed and mapped to CRM records.
        </p>
      </div>

      <Alert>
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle>Import complete</AlertTitle>
        <AlertDescription>
          {buildSuccessMessage(importedCount, skippedCount)}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Total Rows</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{result.totalRows}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Imported Records</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{importedCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Skipped Records</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{skippedCount}</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeView === "imported" ? "default" : "outline"}
          onClick={() => setActiveView("imported")}
        >
          Imported Records
          <Badge variant="secondary" className="ml-1">
            {importedCount}
          </Badge>
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeView === "skipped" ? "default" : "outline"}
          onClick={() => setActiveView("skipped")}
        >
          Skipped Records
          <Badge variant="secondary" className="ml-1">
            {skippedCount}
          </Badge>
        </Button>
      </div>

      {activeView === "imported" ? (
        <ImportedRecordsTable rows={result.imported} />
      ) : (
        <SkippedRecordsTable rows={result.skipped} />
      )}

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={onStartOver}>
          Import Another File
        </Button>
      </div>
    </div>
  );
}
