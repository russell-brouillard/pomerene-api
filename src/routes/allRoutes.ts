import express from "express";
import userRoutes from "./userRoutes";
import scannerRoutes from "./scannerRoutes";
import itemRoutes from "./itemRoutes";
import eventRoutes from "./eventRoutes";
import apiDocsRoutes from "./apiDocsRoutes"

import path from "path";

const router = express.Router();

// Use the separate routes
router.use("/event", eventRoutes);
router.use("/user", userRoutes);
router.use("/scanner", scannerRoutes);
router.use("/item", itemRoutes);
router.use('/api-docs', apiDocsRoutes)
router.use("/", express.static(path.join(__dirname, "public")));



export default router;
