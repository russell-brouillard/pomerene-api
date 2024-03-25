import express from 'express';
import { getCargoData } from '../controllers/uriController';

const router = express.Router();

// Define the route for getting OPOS data
router.get('/cargo', getCargoData);

export default router;
