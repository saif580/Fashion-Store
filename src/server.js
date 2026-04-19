const app = require("./app");
const { appEnv, port } = require("./config/env");
const { initializeDatabase } = require("./config/db");

const startServer = async () => {
  try {
    await initializeDatabase();

    app.listen(port, () => {
      console.log(`Server listening on port ${port} in ${appEnv}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
