// src/controllers/userController.ts
import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import {
  createUserAndStoreSolanaKeypair,
  getAllUsers,
  getSuiKeypairForUser,
  getUser,
  getUserByEmail,
  getUserByUID,
} from "../services/users/usersServices";
import {
  getBalance,
  getNewSuiSecretKeyString,
  getSuiMoney,
} from "../services/sui/suiService";

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

  try {
    const userId = req.user.uid; // Assuming `uid` is available from decodedToken attached in authMiddleware

    const keypair = await getSuiKeypairForUser(userId);

    return res.json(keypair);
  } catch (error) {
    console.error("Error retrieving Solana keypair:", error);
    return res.status(500).send("Failed to retrieve Solana keypair");
  }
};

export const getSuiKeypairController = async (req: Request, res: Response) => {
  console.log("getSuiKeypairController");
  try {
    const key = getNewSuiSecretKeyString();

    return res.status(200).json({ status: "success", key });
  } catch (error) {
    console.error("Error retrieving Sui keypair:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to retrieve Sui keypair" });
  }
};

export const getSuiMoneyController = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user) {
    return res.status(401).send("User is not authenticated");
  }

  console.log("test ", req.user.name);
  try {
    const result = await getSuiMoney(req.user.name);
    return res.status(200).json({ status: "success", data: result });
  } catch (error) {
    console.error("Error retrieving Sui money:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Failed to retrieve Sui money" });
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
 */
export const createUserWithSolanaKeypair = async (
  req: Request,
  res: Response
) => {
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

/**
 * @swagger
 * /api/v1/user/signin:
 *   post:
 *     summary: Authenticates a user and returns user information.
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: Email address of the user.
 *               password:
 *                 type: string
 *                 description: Password of the user.
 *     responses:
 *       200:
 *         description: Authentication successful. Returns user information.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                       description: The unique identifier of the authenticated user.
 *                     email:
 *                       type: string
 *                       description: The email address of the authenticated user.
 *                     emailVerified:
 *                       type: boolean
 *                       description: Indicates whether the email of the authenticated user is verified.
 *                     displayName:
 *                       type: string
 *                       description: The display name of the authenticated user.
 *                     isAnonymous:
 *                       type: boolean
 *                       description: Indicates whether the authenticated user is anonymous.
 *                     providerData:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           providerId:
 *                             type: string
 *                             description: The provider ID of the user.
 *                           uid:
 *                             type: string
 *                             description: The user ID of the provider.
 *                           displayName:
 *                             type: string
 *                             description: The display name of the user.
 *                           email:
 *                             type: string
 *                             description: The email address of the user.
 *                           phoneNumber:
 *                             type: string
 *                             description: The phone number of the user.
 *                           photoURL:
 *                             type: string
 *                             description: The photo URL of the user.
 *                     stsTokenManager:
 *                       type: object
 *                       properties:
 *                         refreshToken:
 *                           type: string
 *                           description: The refresh token of the authenticated user.
 *                         accessToken:
 *                           type: string
 *                           description: The access token of the authenticated user.
 *                         expirationTime:
 *                           type: number
 *                           description: The expiration time of the tokens.
 *                     createdAt:
 *                       type: string
 *                       description: The creation time of the authenticated user.
 *                     lastLoginAt:
 *                       type: string
 *                       description: The last login time of the authenticated user.
 *                     apiKey:
 *                       type: string
 *                       description: The API key of the authenticated user.
 *                     appName:
 *                       type: string
 *                       description: The name of the app associated with the authenticated user.
 *                 providerId:
 *                   type: string
 *                   description: The provider ID of the authentication operation.
 *                 _tokenResponse:
 *                   type: object
 *                   properties:
 *                     kind:
 *                       type: string
 *                       description: The kind of the token response.
 *                     localId:
 *                       type: string
 *                       description: The local ID of the token response.
 *                     email:
 *                       type: string
 *                       description: The email address of the token response.
 *                     displayName:
 *                       type: string
 *                       description: The display name of the token response.
 *                     idToken:
 *                       type: string
 *                       description: The ID token of the token response.
 *                     registered:
 *                       type: boolean
 *                       description: Indicates whether the token response is registered.
 *                     refreshToken:
 *                       type: string
 *                       description: The refresh token of the token response.
 *                     expiresIn:
 *                       type: string
 *                       description: The expiration time of the token response.
 *                 operationType:
 *                   type: string
 *                   description: The type of the authentication operation.
 *       400:
 *         description: Email and password are required.
 *       401:
 *         description: Authentication failed. Invalid email or password.
 *       500:
 *         description: Internal server error.
 */
export async function getUserJWTController(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const email = req.body.email as string;
    const password = req.body.password as string;

    // Check if email and password are provided
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required." });
      return;
    }

    // Authenticate user and get google firebase auth user
    const user = await getUser(email, password);

    // If authentication is successful, return the user
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(401).json({ error: "Authentication failed." });
    }
  } catch (error) {
    console.error("Error authenticating user:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

/**
 * @swagger
 * /api/v1/user/{uid}:
 *   get:
 *     summary: Get user by UID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: uid
 *         required: true
 *         description: The UID of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User details retrieved successfully
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal server error
 */
export async function getUserByUIDController(req: Request, res: Response) {
  const { uid } = req.params;
  try {
    const userRecord = await getUserByUID(uid);
    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(userRecord.toJSON());
  } catch (error) {
    console.error("Error in getUserByUIDController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @swagger
 * /api/v1/user/email/{email}:
 *   get:
 *     summary: Get user by email
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         description: The email of the user to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: User details retrieved successfully
 *       '404':
 *         description: User not found
 *       '500':
 *         description: Internal server error
 */
export async function getUserByEmailController(req: Request, res: Response) {
  const email = req.body.email as string;

  try {
    const userRecord = await getUserByEmail(email);
    if (!userRecord) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(userRecord.toJSON());
  } catch (error) {
    console.error("Error in getUserByEmailController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @swagger
 * /api/v1/user:
 *   get:
 *     summary: Get all users
 *     tags: [User]
 *     responses:
 *       '200':
 *         description: Users retrieved successfully
 *       '500':
 *         description: Internal server error
 */
export async function getAllUsersController(req: Request, res: Response) {
  try {
    const users = await getAllUsers();
    return res.status(200).json(users.map((user) => user.toJSON()));
  } catch (error) {
    console.error("Error in getAllUsersController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

/**
 * @swagger
 * /api/v1/user/balance:
 *   get:
 *     summary: Retrieves the Solana balance for the authenticated user.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Solana balance successfully retrieved.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 balance:
 *                   type: number
 *                   description: The Solana balance of the authenticated user in SOL.
 *       401:
 *         description: User is not authenticated.
 *       404:
 *         description: User or Solana public key not found.
 *       500:
 *         description: Failed to retrieve Solana balance.
 */
export const getSuiBalance = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).send("User is not authenticated");
  }

  try {
    const userPublicKey = req.user.name;

    const balance = await getBalance(userPublicKey);
    return res.json({ balance });
  } catch (error) {
    console.error("Error retrieving Solana balance:", error);
    return res.status(500).send("Failed to retrieve Solana balance");
  }
};

/**
 * @swagger
 * /api/v1/user/airdrop:
 *   post:
 *     summary: Airdrops SOL to the authenticated user's public key.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               publicKey:
 *                 type: string
 *                 description: The public key of the user to receive the airdrop.
 *     responses:
 *       200:
 *         description: SOL successfully airdropped.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   description: True if the airdrop was successful.
 *       401:
 *         description: User is not authenticated.
 *       404:
 *         description: Public key not provided.
 *       500:
 *         description: Failed to airdrop SOL.
 */
export const airdropSuiController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).send("User is not authenticated");
  }

  console.log("test ", req.user.name);

  try {
    const sui = await getSuiMoney(req.user.name);
    return res.json({ success: true, sui });
  } catch (error) {
    console.error("Error airdropping Sui:", error);
    return res.status(500).send("Failed to airdrop Sui");
  }
};
function getNewSuiKKeyString() {
  throw new Error("Function not implemented.");
}
