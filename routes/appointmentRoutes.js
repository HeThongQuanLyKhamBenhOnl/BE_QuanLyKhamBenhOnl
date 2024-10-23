const express = require('express');
const router = express.Router();
const { 
  createAppointment, 
  getAppointments, 
  updateAppointmentStatus, 
  cancelAppointment, 
  rescheduleAppointment 
} = require('../controllers/AppointmentController');
const { verifyToken } = require('../Middleware/Middleware');

// Route để tạo lịch hẹn
router.post('/appointments', verifyToken, createAppointment);

// Route để lấy danh sách lịch hẹn
router.get('/appointments', verifyToken, getAppointments);

// Route để cập nhật trạng thái lịch hẹn
router.put('/appointments/:appointmentId/status', verifyToken, updateAppointmentStatus);

// Route để hủy lịch hẹn
router.put('/appointments/:appointmentId/cancel', verifyToken, cancelAppointment);

// Route để dời lịch hẹn
router.put('/appointments/:appointmentId/reschedule', verifyToken, rescheduleAppointment);

module.exports = router;
