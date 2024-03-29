import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerController,
  handleFetchScannerForUser,
} from "../controllers/scannerController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);

router.post("/create", authMiddleware, createScannerController);
router.get("/user", authMiddleware, handleFetchScannerForUser);

export default router;
