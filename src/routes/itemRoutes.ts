import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createItemController,
  deleteItemController,
  handleFetchItemsForUser,
} from "../controllers/ItemController";

const router = express.Router();

// Item endpoints
router.post("/create", authMiddleware, createItemController);
router.delete("/:mint/:account", authMiddleware, deleteItemController);
router.get("/user", authMiddleware, handleFetchItemsForUser);

export default router;
