//src/routes/index.ts
import express from "express";
import {
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
import cors from "cors";

const router = express.Router();

// Define routes
router.get("/wallet/:publicKey/balance", getWalletBalance);
// Define the route for getting SPL tokens
router.get("/spl-tokens/:publicKey", getSPLTokensController);

//user endpoints
router.get("/user/solana-keypair", authMiddleware, getSolanaKeypair);
router.post("/user/create", createUserWithSolanaKeypair);

router.post("/user/signIn", cors(), (req, res) => {
  // Set Access-Control-Allow-Origin header to allow requests from specific origins
  
  res.setHeader("Access-Control-Allow-Origin", "https://www.pomerene.net");
  console.log("req", req.headers);
  // Call your controller function
  getUserJWTController(req, res);
});
router.get("/user/email/:email", getUserByEmailController);
router.get("/user/:uid", getUserByUIDController);
router.get("/users", getAllUsersController);

//devices endpoints
router.post("/device/create", authMiddleware, createDeviceController);

export default router;
