import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createUserWithSolanaKeypair,
  getAllUsersController,
  getSolanaBalance,
  getSolanaKeypair,
  getUserByEmailController,
  getUserByUIDController,
  getUserJWTController,
} from "../controllers/userController";

const router = express.Router();

// User endpoints
router.get("/balance", authMiddleware, getSolanaBalance);
router.get("/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/create", createUserWithSolanaKeypair);
router.post("/signIn", getUserJWTController);
router.get("/email/:email", getUserByEmailController);
router.get("/users", getAllUsersController);
router.get("/:uid", getUserByUIDController);

export default router;
