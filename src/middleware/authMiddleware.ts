// src/middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import { auth } from "firebase-admin";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return res.status(401).send("Unauthorized: No token provided");
  }

  const token = authorizationHeader.split("Bearer ")[1];
  try {
    const decodedToken = await auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Error verifying auth token:", error);
    res.status(403).send("Unauthorized: Invalid token");
  }
};
