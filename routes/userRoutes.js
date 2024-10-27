const express = require("express");
const {
  registerUser,
  loginUser,
  updateUserProfile,
  getUserProfile,
  getAllPatients,
  getAllDoctors,
} = require("../controllers/userController");
const { verifyToken, isAdmin } = require("../Middleware/Middleware");
const User = require("../models/User");
const argon2 = require("argon2");

const router = express.Router();

// Đăng ký người dùng (bệnh nhân)
router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/profile", verifyToken, updateUserProfile);

router.get("/profile", verifyToken, getUserProfile);

router.get("/getAllPatients", verifyToken, isAdmin, getAllPatients);
router.get("/getAllDoctors", verifyToken, isAdmin, getAllDoctors);

router.post("/create-admin", async (req, res) => {
  const {
    username,
    email,
    password,
    fullName,
    phone,
    gender,
    dateOfBirth,
    address,
  } = req.body;

  try {
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Email hoặc Tên đăng nhập đã được sử dụng",
      });
    }

    const hashedPassword = await argon2.hash(password);
    user = new User({
      username,
      email,
      password: hashedPassword,
      role: "admin",
      fullName,
      phone,
      gender,
      dateOfBirth,
      address,
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: "Tài khoản admin đã được tạo thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
});

module.exports = router;
