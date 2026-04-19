const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const { appEnv, port } = require("./env");

const swaggerOptions = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Fashion Store Backend API",
      version: "1.0.0",
      description: "API documentation for the Fashion Store backend.",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: `${appEnv} server`,
      },
    ],
    components: {
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: true,
            },
            data: {
              type: "object",
              additionalProperties: true,
            },
          },
          required: ["success", "data"],
        },
        HealthStatus: {
          type: "object",
          properties: {
            message: {
              type: "string",
              example: "Backend is running",
            },
            environment: {
              type: "string",
              example: "dev",
            },
          },
          required: ["message", "environment"],
        },
      },
    },
    security: [],
  },
  apis: ["./src/routes/*.js", "./src/modules/**/*.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

module.exports = {
  swaggerSpec,
  swaggerUi,
};
