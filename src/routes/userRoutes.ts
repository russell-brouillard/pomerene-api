import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  airdropSOLController,
  createUserWithSolanaKeypair,
  getAllUsersController,
  getSolanaBalance,
  getSolanaKeypair,
  getSuiKeypairController,
  getSuiMoneyController,
  getUserByEmailController,
  getUserByUIDController,
  getUserJWTController,
} from "../controllers/userController";

const router = express.Router();

router.get("/sui/keypair", getSuiKeypairController);
router.post("/sui/faucet", getSuiMoneyController);

// User endpoints
router.get("/balance", authMiddleware, getSolanaBalance);
router.get("/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/create", createUserWithSolanaKeypair);
router.post("/signIn", getUserJWTController);
router.get("/email/:email", getUserByEmailController);
router.get("/users", getAllUsersController);
router.get("/:uid", getUserByUIDController);
router.post("/airdrop", authMiddleware, airdropSOLController);

export default router;
