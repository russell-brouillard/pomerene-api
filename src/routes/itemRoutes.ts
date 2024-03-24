import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createItemController,
  deleteItemController,
} from "../controllers/ItemController";

const router = express.Router();

// Item endpoints
router.post("/create", authMiddleware, createItemController);
router.delete("/:mint", authMiddleware, deleteItemController);

export default router;
