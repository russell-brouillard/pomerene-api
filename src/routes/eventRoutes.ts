import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerTransactionController,
  getItemTransactionController,
  getMapItemsController,
  getScannerTransactionController,
  getTransactionController,
  getMapScannersController,
} from "../controllers/eventController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);
router.post("/scan", authMiddleware, createScannerTransactionController);
router.get('/scanners', authMiddleware, getScannerTransactionController); 
router.get('/items', authMiddleware, getItemTransactionController);  
router.get('/map/items', authMiddleware, getMapItemsController); 
router.get('/map/scanners', authMiddleware, getMapScannersController);
router.get('/:address', authMiddleware, getTransactionController);  



export default router;
