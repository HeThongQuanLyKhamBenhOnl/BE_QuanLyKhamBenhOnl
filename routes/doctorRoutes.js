const express = require("express");
const { createDoctor } = require("../controllers/userController");
const { verifyToken, isAdmin, isDoctor } = require("../Middleware/Middleware");
const {
  createSchedule,
  getDoctorSchedule,
  updateDoctorSchedule,
  getAllDoctors,
  getDoctorById,
  getDoctorProfile,
  updateDoctorProfile,
  getSchedule,
} = require("../controllers/DoctorController");
const { upload } = require("../config/cloudinaryConfig");
const router = express.Router();

router.get("/doctor/profile", verifyToken, isDoctor, getDoctorProfile);

router.get("/doctor/:userId", getDoctorById);

router.put(
  "/doctor/profile/update",
  verifyToken,
  isDoctor,
  upload.array("images", 5),
  updateDoctorProfile
);

// Tạo tài khoản bác sĩ (chỉ dành cho admin, yêu cầu đã đăng nhập và có vai trò admin)
router.post("/users/createDoctor", verifyToken, isAdmin, createDoctor);

router.post("/doctor/schedule", verifyToken, isDoctor, createSchedule);
router.get("/doctor/schedule/me", verifyToken, isDoctor, getDoctorSchedule);
router.put(
  "/doctor/scheduleUpdate",
  verifyToken,
  isDoctor,
  updateDoctorSchedule
);

// Lấy danh sách tất cả các bác sĩ
router.get("/all", getAllDoctors);

router.get("/schedule/:doctorId", verifyToken, getSchedule);

module.exports = router;
