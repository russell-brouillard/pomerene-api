//src/routes/index.ts
import express from "express";
import {
  getSPLTokensController,
  getWalletBalance,
} from "../controllers/solanaController";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createUserWithSolanaKeypair,
  getSolanaKeypair,
  getUserJWTController,
} from "../controllers/userController";

const router = express.Router();

// Define routes
router.get("/wallet/:publicKey/balance", getWalletBalance);
// Define the route for getting SPL tokens
router.get("/spl-tokens/:publicKey", getSPLTokensController);

router.get("/user/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/user/create", createUserWithSolanaKeypair);
router.post("/user/signIn", getUserJWTController);

export default router;
