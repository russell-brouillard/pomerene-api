import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createItemController,
  deleteItemController,
  fetchGPSByItemController,
  fetchLocationsByItemController,
  handleFetchItemsForUser,
  handleFetchItemsLastLocation,
} from "../controllers/ItemController";

const router = express.Router();

// Item endpoints
router.post("/create", authMiddleware, createItemController);
router.delete("/:itemObjectId", authMiddleware, deleteItemController);
router.get("/user", authMiddleware, handleFetchItemsForUser);
// router.get("/explore", handleFetchItems);

router.get("/map", authMiddleware, handleFetchItemsLastLocation);
router.get("/map/:itemPublicKey", authMiddleware, fetchGPSByItemController);
router.get("/:itemPublicKey", authMiddleware, fetchLocationsByItemController);

export default router;
