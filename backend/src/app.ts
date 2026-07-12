import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { importRouter } from "./routes/import.routes.js";

export const app = express();

// CORS_ORIGIN is a comma-separated list (see config/env.ts) — split it into
// the array form the cors package expects.
const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/imports", importRouter);

app.use(errorHandler);
