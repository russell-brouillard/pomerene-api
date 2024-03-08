import { Request, Response } from "express";
import { getUser } from "../services/users/usersServices";

export async function getUserJWTController(req: Request, res: Response): Promise<void> {
  try {

    console.log(req.body)
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
