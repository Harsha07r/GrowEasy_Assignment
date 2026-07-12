// CSV import wizard: Upload -> Preview -> Confirm -> Results.
"use client";

import { useState } from "react";

import { CsvPreview } from "@/components/csv-preview";
import { CsvUpload } from "@/components/csv-upload";
import { ImportResults } from "@/components/import-results";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError, importCsvFile } from "@/lib/api";
import type { ImportResult } from "@/types/crm";

type Step = "upload" | "preview" | "results";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Uploads the selected file and moves to the results step on success.
  // Input: nothing (uses the `file` already picked in the upload step).
  // Output: nothing — updates state (result/step, or an error message).
  const handleConfirm = async () => {
    if (!file) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const data = await importCsvFile(file);
      setResult(data);
      setStep("results");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong while importing this file. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resets the wizard back to the first step so the user can import another file.
  // Input: nothing.
  // Output: nothing — clears file/result/error state and goes back to "upload".
  const handleStartOver = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setStep("upload");
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-6 space-y-1 sm:mb-8">
        <h1 className="text-xl font-semibold sm:text-2xl">Import Leads</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV file to import leads into your CRM.
        </p>
      </div>

      {step === "upload" && (
        <CsvUpload
          file={file}
          onFileChange={setFile}
          onContinue={() => setStep("preview")}
        />
      )}

      {step === "preview" && file && (
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Import failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <CsvPreview
            file={file}
            onBack={() => setStep("upload")}
            onConfirm={handleConfirm}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {step === "results" && result && (
        <ImportResults result={result} onStartOver={handleStartOver} />
      )}
    </main>
  );
}
