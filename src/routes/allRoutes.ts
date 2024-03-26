import express from "express";
import userRoutes from "./userRoutes";
import scannerRoutes from "./scannerRoutes";
import itemRoutes from "./itemRoutes";

const router = express.Router();

// Use the separate routes
router.use("/user", userRoutes);
router.use("/scanner", scannerRoutes);
router.use("/item", itemRoutes);

export default router;
