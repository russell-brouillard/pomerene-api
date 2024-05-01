import express from "express";
import dotenv from "dotenv";
import routes from "./routes/allRoutes";
import cors from "cors";
import path from "path";
import { getFirebaseAdmin } from "./services/google/firebase";

dotenv.config();

getFirebaseAdmin()
  .then((firebase) => {
    const app = express();

    app.use(
      cors({
        origin: [`${process.env.CORS_ORIGIN}`, `${process.env.CORS_ORIGIN}/`]
      })
    );

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use("/api/v1", express.static(path.join(__dirname, "public")));

    // Mount routes
    app.use("/api/v1/", routes);

    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
      console.log(`Server is running at http://localhost:${PORT}/api/v1/`);
      console.log(`API docs are running at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize Firebase Admin:", error);
    process.exit(1);
  });
