"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { ArrowRight, FileText, UploadCloud, X } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatFileSize } from "@/lib/utils";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function rejectionMessage(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-too-large") return "File is too large. Maximum size is 5MB.";
  if (code === "file-invalid-type") return "Only .csv files are supported.";
  return rejection.errors[0]?.message ?? "File could not be accepted.";
}

interface CsvUploadProps {
  file: File | null;
  onFileChange: (file: File | null) => void;
  onContinue: () => void;
}

export function CsvUpload({ file, onFileChange, onContinue }: CsvUploadProps) {
  const [error, setError] = useState<string | null>(null);

  const selectFile = useCallback(
    (next: File | null) => {
      onFileChange(next);
    },
    [onFileChange]
  );

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setError(null);

      if (fileRejections.length > 0) {
        setError(rejectionMessage(fileRejections[0]));
        return;
      }

      const accepted = acceptedFiles[0];
      if (!accepted) return;

      if (!accepted.name.toLowerCase().endsWith(".csv")) {
        setError("Only .csv files are supported.");
        return;
      }

      selectFile(accepted);
    },
    [selectFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
    maxSize: MAX_FILE_SIZE_BYTES,
    multiple: false,
    disabled: !!file,
  });

  const handleRemove = () => {
    setError(null);
    selectFile(null);
  };

  // react-dropzone injects an inline `style` on the hidden input to
  // visually hide it. Stripping it out here (rather than overriding via
  // getInputProps({ style: undefined }), which the library doesn't apply
  // consistently) means our own JSX never declares a style prop — verified
  // identical on server and client. Tailwind's static `sr-only` class
  // replaces it for the visually-hidden effect.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- discarded on purpose
  const { style: discardedInputStyle, ...inputProps } = getInputProps();

  return (
    <div className="w-full space-y-4">
      {!file ? (
        <Card
          {...getRootProps()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors sm:py-16",
            isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <input {...inputProps} className="sr-only" suppressHydrationWarning />
          <div className="rounded-full bg-muted p-4">
            <UploadCloud className="h-7 w-7 text-muted-foreground sm:h-8 sm:w-8" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium sm:text-base">
              {isDragActive ? "Drop your CSV file here" : "Drag & drop your CSV file here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click below to browse from your computer
            </p>
          </div>
          <Button type="button" variant="secondary" size="sm" className="mt-1">
            Browse Files
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Supports .csv files up to 5MB
          </p>
        </Card>
      ) : (
        <Card className="flex flex-row items-center justify-between gap-4 p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-md bg-muted p-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </Button>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Upload error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="button" onClick={onContinue} disabled={!file}>
          Continue to Preview
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
