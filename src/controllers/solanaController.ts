//src/controllers/solanaController.ts
import { Request, Response } from "express";
import { getBalance, getSPLTokens } from "../services/solana/solanaService";
import { SplTokenAccount } from "solanaTypes";

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

/**
 * @swagger
 * /api/spl-tokens/{publicKey}:
 *   get:
 *     summary: Retrieves SPL tokens for a given Solana wallet public key
 *     tags: [SPL Tokens]
 *     parameters:
 *       - in: path
 *         name: publicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: The public key of the Solana wallet to fetch SPL tokens for
 *     responses:
 *       200:
 *         description: A list of SPL tokens associated with the wallet
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   mint:
 *                     type: string
 *                     description: The mint address of the SPL token
 *                   owner:
 *                     type: string
 *                     description: The owner's public key
 *                   tokenAmount:
 *                     type: number
 *                     description: The amount of tokens, adjusted for decimals
 *       400:
 *         description: Public key is required
 *       500:
 *         description: Failed to retrieve SPL tokens
 */
export const getSPLTokensController = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { publicKey } = req.params; // Assuming the public key is passed as a URL parameter
    if (!publicKey) {
      res.status(400).send("Public key is required");
      return;
    }

    const tokens: SplTokenAccount[] = await getSPLTokens(publicKey);
    res.json(tokens);
  } catch (error) {
    console.error("Failed to get SPL tokens:", error);
    res.status(500).send("Failed to retrieve SPL tokens");
  }
};
