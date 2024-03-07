
//src/routes/index.ts
import express from 'express';
import { getSPLTokensController, getWalletBalance } from '../controllers/solanaController';
import { authMiddleware } from '../middleware/authMiddleware';
import { getSolanaKeypair } from '../controllers/userController';

const router = express.Router();

// Define routes
router.get('/wallet/:publicKey/balance', getWalletBalance);
// Define the route for getting SPL tokens
router.get('/spl-tokens/:publicKey', getSPLTokensController);

router.post('/user/solana-keypair', authMiddleware, getSolanaKeypair);

export default router;