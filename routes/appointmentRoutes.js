const express = require("express");
const router = express.Router();
const {
  createAppointment,
  getAppointments,
  updateAppointmentStatus,
  cancelAppointment,
  getDoctorAppointments,
  rescheduleAppointment,
  updateMedicalRecord,
  getAllMedicalRecords,
  getUpdatedMedicalRecords,
  getDoctorMedicalRecords,
} = require("../controllers/AppointmentController");
const { verifyToken, isDoctor } = require("../Middleware/Middleware");


router.post("/appointments", verifyToken, createAppointment);

router.put(
  "/medical-records/:recordId",
  verifyToken,
  isDoctor,
  updateMedicalRecord
);

router.get("/medical-records/me", verifyToken, isDoctor, getAllMedicalRecords);
router.get(
  "/medical-records/doctor",
  verifyToken,
  isDoctor,
  getDoctorMedicalRecords
);

router.get("/medical-records/updated", verifyToken, getUpdatedMedicalRecords);

// Route để lấy danh sách lịch hẹn
router.get("/appointments", verifyToken, getAppointments);

// Route để cập nhật trạng thái lịch hẹn
router.put(
  "/appointments/:appointmentId/status",
  verifyToken,
  isDoctor,
  updateAppointmentStatus
);

router.get(
  "/appointments/doctor",
  verifyToken,
  isDoctor,
  getDoctorAppointments
);
// Route để hủy lịch hẹn
router.delete(
  "/appointments/:appointmentId/cancel",
  verifyToken,
  isDoctor,
  cancelAppointment
);

// Route để dời lịch hẹn
router.put(
  "/appointments/:appointmentId/reschedule",
  verifyToken,
  rescheduleAppointment
);

module.exports = router;
