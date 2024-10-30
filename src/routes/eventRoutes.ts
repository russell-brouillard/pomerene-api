import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createScannerTransactionController,
  createSuiScannerTransactionController,
  getItemTransactionController,
  getScannerTransactionController,
  getTransactionController,
  validateSuiScannerTransactionController,
} from "../controllers/eventController";

const router = express.Router();

// Scanner endpoints
// router.post("/create", authMiddleware, createScannerController);
router.post("/sol/scan", authMiddleware, createScannerTransactionController);
router.get('/sol/scanners', authMiddleware, getScannerTransactionController); 
router.get('sol//items', authMiddleware, getItemTransactionController);  
router.get('/sol/:address', authMiddleware, getTransactionController);  

router.post("/sui/scan", createSuiScannerTransactionController);
router.post("/sui/validate", validateSuiScannerTransactionController);
// router.get('/sui/scanners', authMiddleware, getScannerTransactionController); 
// router.get('sui//items', authMiddleware, getItemTransactionController);  
// router.get('/sui/:address', authMiddleware, getTransactionController);  


export default router;
