const express = require("express");
const { createPatientProfile, updatePatientProfile, getPatientProfile } = require("../controllers/PatientController");
const { verifyToken } = require("../Middleware/Middleware"); // Middleware xác thực token

const router = express.Router();

// Route tạo hồ sơ bệnh nhân
router.post("/create", verifyToken, createPatientProfile);

// Route cập nhật hồ sơ bệnh nhân
router.put("/update", verifyToken, updatePatientProfile);

// Route lấy hồ sơ bệnh nhân hiện tại
router.get("/me", verifyToken, getPatientProfile);

module.exports = router;
