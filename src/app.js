const express = require("express");
const apiRoutes = require("./routes");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();

app.use(express.json());
app.use("/api", apiRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
