// cloudinaryConfig.js
require("dotenv").config(); // Đọc các biến từ .env
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cấu hình Cloudinary với các biến từ .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Thiết lập bộ lưu trữ Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "doctor_images",
    allowed_formats: ["jpg", "png", "jpeg"],
  },
});

const upload = multer({
  storage: storage,
  limits: { files: 5 }, // Giới hạn tối đa 5 ảnh
});

// Hàm upload ảnh đơn lẻ
const uploadImage = async (filePath) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "doctor_images",
    });
    return result.secure_url;
  } catch (error) {
    console.error("Upload failed:", error);
    throw new Error("Failed to upload image");
  }
};

module.exports = { cloudinary, upload, uploadImage };
