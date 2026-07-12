// Thin fetch wrapper around the Express backend. This exists so components
// never call fetch() directly — they just call importCsvFile and get back
// either the result or a friendly ApiError.
import type { ImportResult } from "@/types/crm";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

// Thrown for anything that goes wrong while importing a file — a network
// failure, a bad response, or an error the backend sent back on purpose.
export class ApiError extends Error {}

// Uploads a CSV file to the backend and returns the import result.
// Input: the File the user confirmed on the preview screen.
// Output: a promise resolving to the import result (imported/skipped rows).
export async function importCsvFile(file: File): Promise<ImportResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/imports`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Could not reach the import server. Check that the backend is running."
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiError("The server returned an unexpected response.");
  }

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body));
  }

  return body as ImportResult;
}

// Reads the "error" field out of a backend error response.
// Input: the parsed JSON response body (shape unknown until checked).
// Output: the error message string, or a generic fallback.
function getErrorMessage(body: unknown): string {
  if (body && typeof body === "object" && "error" in body) {
    return String((body as { error: unknown }).error);
  }
  return "Import failed.";
}
