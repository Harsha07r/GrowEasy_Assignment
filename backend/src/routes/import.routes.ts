import { Router } from "express";
import { importCsv } from "../controllers/import.controller.js";
import { upload } from "../middleware/upload.middleware.js";

export const importRouter = Router();

// Mounted at /api/imports in app.ts -> POST /api/imports
importRouter.post("/", upload.single("file"), importCsv);
