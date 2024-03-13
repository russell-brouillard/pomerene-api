import express from "express";
import solanaRoutes from "./solanaRoutes";
import userRoutes from "./userRoutes";
import deviceRoutes from "./deviceRoutes";

const router = express.Router();

// Use the separate routes
router.use("/solana", solanaRoutes);
router.use("/user", userRoutes);
router.use("/device", deviceRoutes);

export default router;
