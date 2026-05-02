const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require("./env");

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret,
});

const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fashion-store/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ quality: "auto", fetch_format: "auto" }],
  },
});

const productVideoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fashion-store/videos",
    resource_type: "video",
    allowed_formats: ["mp4", "mov", "webm"],
  },
});

const uploadProductImage = multer({ storage: productImageStorage });
const uploadProductVideo = multer({ storage: productVideoStorage });

module.exports = { cloudinary, uploadProductImage, uploadProductVideo };
