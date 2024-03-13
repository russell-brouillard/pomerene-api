import express from "express";
import {
  solanaKeypairController,
  getSPLTokensController,
  getWalletBalance,
} from "../controllers/solanaController";

const router = express.Router();

// Solana endpoints
router.get("/wallet/:publicKey/balance", getWalletBalance);
router.get("/spl-tokens/:publicKey", getSPLTokensController);
router.get("/key", solanaKeypairController);

export default router;
