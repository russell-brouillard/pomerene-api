import express from "express";
import solanaRoutes from "./solanaRoutes";
import userRoutes from "./userRoutes";
import scannerRoutes from "./scannerRoutes";
import itemRoutes from "./itemRoutes";
import uriRoutes from "./uriRoutes";

const router = express.Router();

// Use the separate routes
router.use("/solana", solanaRoutes);
router.use("/user", userRoutes);
router.use("/scanner", scannerRoutes);
router.use("/item", itemRoutes);
router.use("/uri", uriRoutes);

export default router;
