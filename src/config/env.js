const dotenv = require("dotenv");
const os = require("os");

const appEnv = process.env.APP_ENV || "dev";
dotenv.config({ path: `.env.${appEnv}` });

const require_env = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not set in environment`);
  return value;
};

module.exports = {
  appEnv,
  port: process.env.PORT || 3000,
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL || null,
  dbHost: process.env.DB_HOST || "127.0.0.1",
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbName: process.env.DB_NAME || "fashion_store",
  dbUser: process.env.DB_USER || os.userInfo().username,
  dbPassword: process.env.DB_PASSWORD || "",
  jwtSecret: require_env("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "15m",
  jwtRefreshSecret: require_env("JWT_REFRESH_SECRET"),
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  emailHost: process.env.EMAIL_HOST || "smtp.mailtrap.io",
  emailPort: Number(process.env.EMAIL_PORT) || 587,
  emailUser: process.env.EMAIL_USER || "",
  emailPass: process.env.EMAIL_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "no-reply@fashionstore.com",
  cloudinaryCloudName: require_env("CLOUDINARY_CLOUD_NAME"),
  cloudinaryApiKey: require_env("CLOUDINARY_API_KEY"),
  cloudinaryApiSecret: require_env("CLOUDINARY_API_SECRET"),
  razorpayKeyId: require_env("RAZORPAY_KEY_ID"),
  razorpayKeySecret: require_env("RAZORPAY_KEY_SECRET"),
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
};
