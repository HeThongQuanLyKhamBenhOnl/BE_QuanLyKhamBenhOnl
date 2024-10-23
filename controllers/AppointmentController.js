const Appointment = require('../models/Appointment');

// Tạo lịch hẹn mới
exports.createAppointment = async (req, res) => {
    const { doctorId, date, startTime, endTime, reasonForVisit, notes } = req.body;
  
    try {
      // Lấy thông tin bệnh nhân từ req.user (nếu middleware xác thực đã gắn user vào req)
      const patientId = req.user._id; 
  
      // Tạo lịch hẹn mới
      const newAppointment = new Appointment({
        doctor: doctorId,
        patient: patientId, // Sử dụng thông tin bệnh nhân từ req.user
        date,
        startTime,
        endTime,
        reasonForVisit,
        notes,
      });
  
      // Lưu lịch hẹn vào cơ sở dữ liệu
      await newAppointment.save();
  
      res.status(201).json({
        success: true,
        message: 'Lịch hẹn đã được tạo thành công',
        appointment: newAppointment,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi tạo lịch hẹn',
        error: error.message,
      });
    }
  };
  

// Lấy tất cả lịch hẹn với thông tin chi tiết về bác sĩ và bệnh nhân
exports.getAppointments = async (req, res) => {
    try {
      // Tìm các lịch hẹn của bệnh nhân dựa trên patient id
      const appointments = await Appointment.find({ patient: req.user._id })
        .populate({
          path: 'doctor', // Populate doctor model
          populate: {
            path: 'user', // Populate user model bên trong doctor
            select: 'fullName', // Chọn trường fullName từ user
          },
        })
        .populate('patient', 'fullName'); // Populate thông tin bệnh nhân nếu cần
  
      // Trả về dữ liệu appointments
      res.status(200).json({
        success: true,
        appointments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Đã xảy ra lỗi khi lấy lịch hẹn',
        error: error.message,
      });
    }
  };
  

// Cập nhật trạng thái lịch hẹn
exports.updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;

  try {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Trạng thái lịch hẹn đã được cập nhật',
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi cập nhật trạng thái lịch hẹn',
      error: error.message,
    });
  }
};

// Hủy lịch hẹn
exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status: 'cancelled' },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lịch hẹn đã bị hủy',
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi hủy lịch hẹn',
      error: error.message,
    });
  }
};

// Dời lịch hẹn (Reschedule)
exports.rescheduleAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { date, startTime, endTime } = req.body;

  try {
    // Tìm lịch hẹn theo ID
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch hẹn',
      });
    }

    // Chỉ cho phép dời lịch hẹn nếu trạng thái là "pending" hoặc "confirmed"
    if (appointment.status === 'completed' || appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Không thể dời lịch hẹn đã hoàn tất hoặc đã hủy',
      });
    }

    // Cập nhật ngày và giờ cho lịch hẹn
    appointment.date = date;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.status = 'pending'; // Đặt lại trạng thái về "pending" sau khi dời lịch

    // Lưu lịch hẹn đã cập nhật
    await appointment.save();

    res.status(200).json({
      success: true,
      message: 'Lịch hẹn đã được dời thành công',
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi dời lịch hẹn',
      error: error.message,
    });
  }
};
