
//src/routes/index.ts
import express from 'express';
import { getSPLTokensController, getWalletBalance } from '../controllers/solanaController';

const router = express.Router();

// Define routes
router.get('/wallet/:publicKey/balance', getWalletBalance);
// Define the route for getting SPL tokens
router.get('/spl-tokens/:publicKey', getSPLTokensController);

export default router;