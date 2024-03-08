// src/controllers/userController.ts
import { Request, Response } from "express";
import { secretManagerServiceClient } from "../services/google/secretManager";
import { AuthRequest } from "../middleware/authMiddleware";
import { createUserAndStoreSolanaKeypair, getUser } from "../services/users/usersServices";

/**
 * @swagger
 * /api/v1/user/solana-keypair:
 *   get:
 *     summary: Retrieves the Solana keypair for the authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solana keypair successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secretKeyArray:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: The Solana keypair associated with the user.
 *       401:
 *         description: User is not authenticated.
 *       404:
 *         description: Solana keypair not found for user.
 *       500:
 *         description: Failed to retrieve Solana keypair.
 */
export const getSolanaKeypair = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).send("User is not authenticated");
  }

  const userId = req.user.uid; // Assuming `uid` is available from decodedToken attached in authMiddleware
  
  const secretId = `solana-keypair-${userId}`;
  const parent = `projects/${process.env.GCP_PROGECT_ID}/secrets/${secretId}/versions/latest`;

  try {
    const [accessResponse] =
      await secretManagerServiceClient.accessSecretVersion({ name: parent });
    const secretKeyString = accessResponse.payload?.data?.toString();
    if (!secretKeyString) {
      return res.status(404).send("Solana keypair not found for user");
    }

    const secretKeyArray = JSON.parse(secretKeyString);
    return res.json({ secretKeyArray });
  } catch (error) {
    console.error("Error retrieving Solana keypair:", error);
    return res.status(500).send("Failed to retrieve Solana keypair");
  }
};

/**
 * @swagger
 * /api/v1/user/create:
 *   post:
 *     summary: Creates a new user and generates a Solana keypair.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address for the new user.
 *               password:
 *                 type: string
 *                 description: Password for the new user.
 *     responses:
 *       201:
 *         description: User and Solana keypair created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateUserAndStoreSolanaKeypairResult'
 *       400:
 *         description: Email and password are required.
 *       500:
 *         description: Failed to create user and Solana keypair.
 *
 * components:
 *   schemas:
 *     CreateUserAndStoreSolanaKeypairResult:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message.
 *         data:
 *           type: object
 *           properties:
 *             firebaseUserId:
 *               type: string
 *               description: The Firebase user ID of the created user.
 *             solanaPublic:
 *               type: string
 *               description: The public part of the Solana keypair.
 */
export const createUserWithSolanaKeypair = async (
  req: Request,
  res: Response
) => {
  console.log("Creating user and storing Solana keypair");
  const { email, password } = req.body; // Extract email and password from request body

  if (!email || !password) {
    return res.status(400).send("Email and password are required");
  }

  try {
    const result = await createUserAndStoreSolanaKeypair(email, password);
    return res.status(201).json({
      message: "User and Solana keypair created successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error creating user and Solana keypair:", error);
    return res.status(500).send("Failed to create user and Solana keypair");
  }
};

export async function getUserJWTController(req: Request, res: Response): Promise<void> {
  try {
    const email = req.body.email as string;
    const password = req.body.password as string;

    console.log("email", email);
    console.log("password", password);

    // Check if email and password are provided
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    // Authenticate user and get JWT token
    const token = await getUser(email, password);

    // If authentication is successful, return the token
    if (token) {
      res.status(200).json({ token });
    } else {
      res.status(401).json({ error: "Authentication failed." });
    }
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}
