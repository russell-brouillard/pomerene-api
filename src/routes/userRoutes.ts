import express from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createUserWithSolanaKeypair,
  getAllUsersController,
  getSolanaKeypair,
  getUserByEmailController,
  getUserByUIDController,
  getUserJWTController,
  handleFetchItems,
  handleFetchScanner,
} from "../controllers/userController";

const router = express.Router();

// User endpoints
router.get("/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/create", createUserWithSolanaKeypair);
router.post("/signIn", getUserJWTController);
router.get("/email/:email", getUserByEmailController);
router.get("/users", getAllUsersController);
router.get("/scanners", authMiddleware, handleFetchScanner);
router.get("/items", authMiddleware, handleFetchItems);
router.get("/:uid", getUserByUIDController);

export default router;
