const express = require("express");
const { createDoctor } = require("../controllers/userController");
const { verifyToken, isAdmin } = require("../Middleware/Middleware");
const {
    updateDoctorProfile,
    createDoctorSchedule,
    getDoctorSchedule,
    getAllDoctors,
    getDoctorById
  } = require("../controllers/DoctorController");
const router = express.Router();

// Tạo tài khoản bác sĩ (chỉ dành cho admin, yêu cầu đã đăng nhập và có vai trò admin)
router.post("/users/createDoctor", verifyToken, isAdmin, createDoctor);


// Cập nhật hồ sơ bác sĩ
router.put("/update", verifyToken, updateDoctorProfile);

// Thêm lịch làm việc cho bác sĩ
router.post("/schedule", verifyToken, createDoctorSchedule);

// Lấy lịch làm việc của bác sĩ
router.get("/schedule/me", verifyToken, getDoctorSchedule);

// Lấy danh sách tất cả các bác sĩ
router.get("/all", verifyToken, getAllDoctors);

// Lấy thông tin chi tiết của một bác sĩ theo doctorId
router.get("/:doctorId", verifyToken, getDoctorById);


module.exports = router;
