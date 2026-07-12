import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  // Optional at boot — not needed until the Gemini service is actually used
  // (see services/gemini.service.ts's requireGeminiApiKey()).
  GEMINI_API_KEY: z.string().optional(),
  // "gemini-flash-latest" is Google's alias for their current recommended
  // Flash model — pinned model names like "gemini-2.5-flash" get cut off
  // from new API keys over time, so the alias is what stays working.
  GEMINI_MODEL: z.string().default("gemini-flash-latest"),
  // Comma-separated list of allowed frontend origins. Defaults to both
  // localhost:3000 and :3001 because Next.js silently falls back to 3001
  // whenever 3000 is already taken (e.g. another dev server already
  // running) — without both, that fallback causes a confusing CORS error
  // that looks like "the backend is down" from the frontend's side.
  CORS_ORIGIN: z.string().default("http://localhost:3000,http://localhost:3001"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().default(10),
  CSV_BATCH_SIZE: z.coerce.number().default(30),
});

export const env = envSchema.parse(process.env);
