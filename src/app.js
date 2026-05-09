const express = require("express");
const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");
const { swaggerSpec, swaggerUi } = require("./config/swagger");

const app = express();

app.use(
  express.json({
    verify: (req, _res, buf) => {
      if (req.originalUrl === "/api/payments/webhook") {
        req.rawBody = Buffer.from(buf);
      }
    },
  }),
);

if (process.env.APP_ENV !== "prod") {
  app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
