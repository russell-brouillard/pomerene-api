import swaggerJSDoc from 'swagger-jsdoc';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Pomerene API Docs',
    version: '1.0.0',
    description: 'Pomerene SaaS web API documentation',
  },
  components: {
    securitySchemes: {
      BearerAuth: { // Changed from GoogleAuth to BearerAuth for clarity
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase Auth token obtained upon user authentication. Prefix with "Bearer "',
      },
    },
  },
  security: [{
    BearerAuth: [] // Reflecting the change above
  }],
};

// Options for the swagger docs
const options = {
  definition: swaggerDefinition,
  apis: ['./routes/*.ts', './src/controllers/*.ts'], // Adjust the path according to your project structure
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
