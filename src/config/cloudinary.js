const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = require("./env");
const { createHttpError } = require("../utils/httpError");

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

const imageFileFilter = (req, file, cb) => {
  if (!file.mimetype?.startsWith("image/")) {
    return cb(createHttpError(400, "Only image uploads are allowed for this endpoint"));
  }
  cb(null, true);
};

const uploadProductImage = multer({
  storage: productImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    files: 10,
    fileSize: 8 * 1024 * 1024,
  },
});

const uploadProductVideo = multer({ storage: productVideoStorage });

const deleteCloudinaryAsset = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = {
  cloudinary,
  uploadProductImage,
  uploadProductVideo,
  deleteCloudinaryAsset,
};
