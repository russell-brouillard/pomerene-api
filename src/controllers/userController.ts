// src/controllers/userController.ts
import { Request, Response } from "express";
import { secretManagerServiceClient } from "../services/google/googleCloud";
import { AuthRequest } from "../middleware/authMiddleware";


export const getSolanaKeypair = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).send("User is not authenticated");
  }

  const userId = req.user.uid; // Assuming `uid` is available from decodedToken attached in authMiddleware
  const projectId = 'your-google-cloud-project-id';
  const secretId = `solana-keypair-${userId}`;
  const parent = `projects/${projectId}/secrets/${secretId}/versions/latest`;

  try {
    const [accessResponse] = await secretManagerServiceClient.accessSecretVersion({ name: parent });
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
