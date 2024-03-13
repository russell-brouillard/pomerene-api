import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createDeviceController } from "../controllers/deviceController";

const router = express.Router();

// Devices endpoints
router.post("/create", authMiddleware, createDeviceController);

export default router;
