"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, FileWarning, Loader2 } from "lucide-react";

import { CsvPreviewTable } from "@/components/csv-preview-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { parseCsvFile, type ParsedCsv } from "@/lib/csv";
import { formatFileSize } from "@/lib/utils";

type ParseState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: ParsedCsv };

interface CsvPreviewProps {
  file: File;
  onBack: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function CsvPreview({ file, onBack, onConfirm, isSubmitting = false }: CsvPreviewProps) {
  const [state, setState] = useState<ParseState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    parseCsvFile(file)
      .then((data) => {
        if (!cancelled) setState({ status: "success", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to parse CSV file.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const totalRows = state.status === "success" ? state.data.totalRows : 0;
  const totalColumns = state.status === "success" ? state.data.columns.length : 0;
  const isEmpty = state.status === "success" && (totalRows === 0 || totalColumns === 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Filename" value={file.name} />
        <StatTile label="File Size" value={formatFileSize(file.size)} />
        <StatTile
          label="Total Rows"
          value={state.status === "success" ? String(totalRows) : "—"}
        />
        <StatTile
          label="Total Columns"
          value={state.status === "success" ? String(totalColumns) : "—"}
        />
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold">CSV Preview</h2>
        <p className="text-sm text-muted-foreground">
          Rows: {state.status === "success" ? totalRows : "—"} · Columns:{" "}
          {state.status === "success" ? totalColumns : "—"}
        </p>
      </div>

      {state.status === "loading" && (
        <div className="space-y-2 rounded-lg border p-3">
          <Skeleton className="h-9 w-full" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      )}

      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t parse this file</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      )}

      {state.status === "success" && isEmpty && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <FileWarning className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">No rows found in this CSV</p>
          <p className="text-sm text-muted-foreground">
            The file appears to be empty or has no data rows.
          </p>
        </div>
      )}

      {state.status === "success" && !isEmpty && (
        <CsvPreviewTable columns={state.data.columns} rows={state.data.rows} />
      )}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onConfirm}
          disabled={state.status !== "success" || isEmpty || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              Confirm Import
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium" title={value}>
        {value}
      </p>
    </Card>
  );
}
