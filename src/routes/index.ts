
//src/routes/index.ts
import express from 'express';
import { getWalletBalance } from '../controllers/solanaController';

const router = express.Router();

// Define routes
router.get('/wallet/:publicKey/balance', getWalletBalance);

export default router;