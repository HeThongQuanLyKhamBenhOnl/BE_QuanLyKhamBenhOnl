const express = require('express');
const router = express.Router();
const { 
  createAppointment, 
  getAppointments, 
  updateAppointmentStatus, 
  cancelAppointment, 
  getDoctorAppointments,
  rescheduleAppointment ,
  updateMedicalRecord,
  getAllMedicalRecords
} = require('../controllers/AppointmentController');
const { verifyToken, isDoctor } = require('../Middleware/Middleware');

// Route để tạo lịch hẹn
router.post('/appointments', verifyToken, createAppointment);

router.put('/medical-records/:recordId', verifyToken, isDoctor, updateMedicalRecord);

router.get('/medical-records', verifyToken, isDoctor, getAllMedicalRecords);

// Route để lấy danh sách lịch hẹn
router.get('/appointments', verifyToken, getAppointments);

// Route để cập nhật trạng thái lịch hẹn
router.put('/appointments/:appointmentId/status', verifyToken,isDoctor, updateAppointmentStatus);

router.get('/appointments/doctor', verifyToken, isDoctor, getDoctorAppointments);
// Route để hủy lịch hẹn
router.put('/appointments/:appointmentId/cancel', verifyToken,isDoctor, cancelAppointment);

// Route để dời lịch hẹn
router.put('/appointments/:appointmentId/reschedule', verifyToken, rescheduleAppointment);

module.exports = router;
