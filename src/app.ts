// src/app.ts
import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc"; // Correctly import swagger-jsdoc
import routes from "./routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Options for the swagger docs
const options = {
  definition: {
    openapi: "3.0.0", // Moved openapi, info, etc., under definition
    info: {
      title: "Pomerene API Docs",
      version: "1.0.0",
      description: "pomerene SaaS web API documentation",
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ["./routes/*.ts", "./src/controllers/*.ts"], // Make sure this path is correct and points to your actual route files
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Serve swagger docs the way you like (Recommendation: only in development)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Use the imported routes
app.use("/api/v1/", routes); // Mount the routes at the "/api" base path

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`API docs are running at http://localhost:${PORT}/api-docs`);
});
