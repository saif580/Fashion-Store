const express = require("express");
const apiRoutes = require("./routes");

const app = express();

app.use(express.json());
app.use("/", apiRoutes);

module.exports = app;
