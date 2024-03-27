import express from "express";
import userRoutes from "./userRoutes";
import scannerRoutes from "./scannerRoutes";
import itemRoutes from "./itemRoutes";
import eventRoutes from "./eventRoutes";
import swaggerSpec from "../config/swaggerConfig";
import swaggerUi from "swagger-ui-express"; // Import the swaggerSpec from the new file
import path from "path";

const router = express.Router();

// Use the separate routes
router.use("/event", eventRoutes);
router.use("/user", userRoutes);
router.use("/scanner", scannerRoutes);
router.use("/item", itemRoutes);
// Serve Swagger docs using imported swaggerSpec
router.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
router.use("/", express.static(path.join(__dirname, "public")));



export default router;
