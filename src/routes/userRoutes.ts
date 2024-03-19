import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createUserWithSolanaKeypair,
  getAllUsersController,
  getSolanaKeypair,
  getUserByEmailController,
  getUserByUIDController,
  getUserJWTController,
  handleFetchMintAddresses,
} from "../controllers/userController";

const router = express.Router();

// User endpoints
router.get("/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/create", createUserWithSolanaKeypair);
router.post("/signIn", getUserJWTController);
router.get("/email/:email", getUserByEmailController);
router.get("/users", getAllUsersController);
router.get("/scanner", authMiddleware, handleFetchMintAddresses);
router.get("/:uid", getUserByUIDController);

export default router;
