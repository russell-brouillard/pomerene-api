
//src/routes/index.ts
import express from 'express';
import * as solanaController from '../controllers/solanaController';

const router = express.Router();

// Define routes
router.get('/wallet/:publicKey/balance', solanaController.getWalletBalance);

export default router;