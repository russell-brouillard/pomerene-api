//src/controllers/solanaController.ts
import { Request, Response } from "express";
import { getBalance } from "../solana/services/solanaService";

/**
 * @swagger
 * /wallet/{publicKey}/balance:
 *   get:
 *     summary: Retrieves the balance of a Solana wallet.
 *     tags: [Solana]
 *     parameters:
 *       - in: path
 *         name: publicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: The public key of the Solana wallet.
 *     responses:
 *       200:
 *         description: Success response with the balance.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   description: The current balance of the Solana wallet.
 *       500:
 *         description: Error occurred
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Error message detailing what went wrong.
 */
export async function getWalletBalance(req: Request, res: Response) {
  try {
    console.log("test");
    console.log(req.params.publicKey);
    const balance = await getBalance(req.params.publicKey);
    res.json({ balance });
  } catch (error: any) {
    res.status(500).send(error.toString());
  }
}
