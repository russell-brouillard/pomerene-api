import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createSuiScannerTransactionController,
  deleteEventForUersController,
  fetchEventsForUersController,
  validateSuiScannerTransactionController,
} from "../controllers/eventController";

const router = express.Router();


router.delete("/events/:eventId", authMiddleware, deleteEventForUersController);
router.get("/events", authMiddleware, fetchEventsForUersController);

router.post("/sui/scan", authMiddleware, createSuiScannerTransactionController);
router.post("/sui/validate", validateSuiScannerTransactionController);

export default router;
