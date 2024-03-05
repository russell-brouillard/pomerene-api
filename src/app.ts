// src/app.ts

import express, { Request, Response } from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc"; // Correctly import swagger-jsdoc

dotenv.config();

const app = express();

// Options for the swagger docs
const options = {
  definition: {
    openapi: "3.0.0", // Moved openapi, info, etc., under definition
    info: {
      title: "Express API with Swagger",
      version: "1.0.0",
      description: "A simple Express API",
    },
  },
  // Paths to files containing OpenAPI definitions
  apis: ["./routes/*.ts", "./src/controllers/*.ts"], // Make sure this path is correct and points to your actual route files
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJSDoc(options);

// Serve swagger docs the way you like (Recommendation: only in development)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript with Express!");
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`API docs are running at http://localhost:${PORT}/api-docs`);
});
