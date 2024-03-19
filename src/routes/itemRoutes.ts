import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { createItemController } from "../controllers/ItemController";

const router = express.Router();

// Item endpoints
router.post("/create", authMiddleware, createItemController);


export default router;
