//src/routes/index.ts
import express from "express";
import {
  solanaKeypairController,
  getSPLTokensController,
  getWalletBalance,
} from "../controllers/solanaController";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  createUserWithSolanaKeypair,
  getAllUsersController,
  getSolanaKeypair,
  getUserByEmailController,
  getUserByUIDController,
  getUserJWTController,
} from "../controllers/userController";
import { createDeviceController } from "../controllers/deviceController";

const router = express.Router();

// Define routes
router.get("/wallet/:publicKey/balance", getWalletBalance);
// Define the route for getting SPL tokens
router.get("/spl-tokens/:publicKey", getSPLTokensController);

router.get("/solana/key", solanaKeypairController);

//user endpoints
router.get("/user/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/user/create", createUserWithSolanaKeypair);
router.post("/user/signIn", getUserJWTController);
router.get("/user/email/:email", getUserByEmailController);
router.get("/user/:uid", getUserByUIDController);
router.get("/users", getAllUsersController);

//devices endpoints
router.post("/device/create/:deviceKey", authMiddleware, createDeviceController);

export default router;
