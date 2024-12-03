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

export const getSuiKeypair = async (req: AuthRequest, res: Response) => {
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

export async function getAllUsersController(req: Request, res: Response) {
  try {
    const users = await getAllUsers();
    return res.status(200).json(users.map((user) => user.toJSON()));
  } catch (error) {
    console.error("Error in getAllUsersController:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

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

export const airdropSuiController = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).send("User is not authenticated");
  }

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
