// src/app.ts
import express from "express";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc"; // Correctly import swagger-jsdoc
import routes from "./routes";
import cors from "cors";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: 'https://www.pomerene.net', // Allow only this origin to access the resources
  methods: 'GET,POST,PUT,DELETE,OPTIONS', // Allowed methods
  allowedHeaders: 'Content-Type,Authorization', // Allowed headers
  credentials: true, // Enable cookies across domains
}));

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
