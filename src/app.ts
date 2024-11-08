import express from "express";
import dotenv from "dotenv";
import routes from "./routes/allRoutes";
import cors from "cors";
import path from "path";
import { getFirebaseAdmin } from "./services/google/firebase";
import { initializeFirebaseWeb } from "./services/google/firebaseWeb";

dotenv.config();

async function startServer() {
  try {
    // Initialize Firebase Admin
    await getFirebaseAdmin();

    // Initialize Firebase Web
    await initializeFirebaseWeb();

    const app = express();

    app.use(
      cors({
        origin: [`${process.env.CORS_ORIGIN}`, `${process.env.CORS_ORIGIN}/`],
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/api/v1", express.static(path.join(__dirname, "public")));

    // Health check endpoint
    app.get("/api/v1/health", (req, res) => {
      res
        .status(200)
        .json({ status: "UP", timestamp: new Date().toISOString() });
    });

    // Mount routes
    app.use("/api/v1/", routes);

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.info(`Server is running at http://localhost:${PORT}/api/v1/`);
      console.info(`API docs are running at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("Failed to initialize Firebase services:", error);
    process.exit(1);
  }
}

startServer();
