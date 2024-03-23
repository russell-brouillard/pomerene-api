import express from "express";
import {
  solanaKeypairController,
  getSPLTokensController,
  getWalletBalance,
  getAccountsController
} from "../controllers/solanaController";
import { authMiddleware } from "../middleware/authMiddleware";


const router = express.Router();

// Solana endpoints
router.get("/wallet/:publicKey/balance", getWalletBalance);
router.get("/spl-tokens/:publicKey", getSPLTokensController);
router.get("/key", solanaKeypairController);
router.get("/accounts", authMiddleware, getAccountsController);

export default router;
