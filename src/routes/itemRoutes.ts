import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  bulkUploadController,
  createItemController,
  deleteItemController,
  fetchGPSByItemController,
  fetchLocationsByItemController,
  getQrCodeController,
  handleFetchItemsForUser,
  handleFetchItemsLastLocation,
} from "../controllers/ItemController";

const router = express.Router();

// Item endpoints
router.post("/create", authMiddleware, createItemController);
router.delete("/:itemObjectId", authMiddleware, deleteItemController);
router.get("/user", authMiddleware, handleFetchItemsForUser);

router.get("/qr/:itemObjectId", authMiddleware, getQrCodeController);

router.get("/map", authMiddleware, handleFetchItemsLastLocation);
router.get("/map/:itemPublicKey", authMiddleware, fetchGPSByItemController);
router.get("/:itemPublicKey", authMiddleware, fetchLocationsByItemController);

router.post("/bulk-upload", authMiddleware, bulkUploadController);

export default router;
