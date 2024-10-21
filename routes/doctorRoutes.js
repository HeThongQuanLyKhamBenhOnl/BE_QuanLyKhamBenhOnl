const express = require("express");
const { createDoctor } = require("../controllers/userController");
const { verifyToken, isAdmin, isDoctor } = require("../Middleware/Middleware");
const {
  createDoctorSchedule,
  getDoctorSchedule,
  getAllDoctors,
  getDoctorById,
  getDoctorByUser,
  getDoctorProfile,
  updateDoctorProfile,
} = require("../controllers/DoctorController");
const router = express.Router();

router.get("/doctor/profile", verifyToken, isDoctor, getDoctorProfile);

// Cập nhật hồ sơ bác sĩ
router.put(
  "/doctor/profile/update",
  verifyToken,
  isDoctor,
  updateDoctorProfile
);

// Tạo tài khoản bác sĩ (chỉ dành cho admin, yêu cầu đã đăng nhập và có vai trò admin)
router.post("/users/createDoctor", verifyToken, isAdmin, createDoctor);

// Thêm lịch làm việc cho bác sĩ
router.post("/schedule", verifyToken, isDoctor, createDoctorSchedule);

// Lấy lịch làm việc của bác sĩ
router.get("/schedule/me", verifyToken, isDoctor, getDoctorSchedule);

// Lấy danh sách tất cả các bác sĩ
router.get("/all", getAllDoctors);

// Lấy thông tin chi tiết của một bác sĩ theo doctorId
router.get("/:doctorId", verifyToken, getDoctorById);

module.exports = router;
