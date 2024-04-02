import express from "express";
import swaggerSpec from "../config/swaggerConfig";
import swaggerUi from "swagger-ui-express";

const router = express.Router();

router.use(
  "/",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCssUrl: "/api/v1/swagger-custom.css",
  })
);

export default router;
