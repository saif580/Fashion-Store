const app = require("./app");
const { appEnv, port } = require("./config/env");

app.listen(port, () => {
  console.log(`Server listening on port ${port} in ${appEnv}`);
});
