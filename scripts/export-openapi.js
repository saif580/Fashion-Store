const fs = require("fs");
const path = require("path");
const { swaggerSpec } = require("../src/config/swagger");

const outputDir = path.join(__dirname, "..", "docs");
const outputFile = path.join(outputDir, "openapi.json");

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputFile, JSON.stringify(swaggerSpec, null, 2));

console.log(`OpenAPI spec exported to ${outputFile}`);
