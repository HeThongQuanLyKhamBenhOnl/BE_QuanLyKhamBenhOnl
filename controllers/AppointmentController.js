const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const MedicalRecord = require("../models/MedicalRecord");

exports.createAppointment = async (req, res) => {
  const { doctorId, date, startTime, endTime, reasonForVisit, notes } =
    req.body;

  try {
    const patientId = req.user._id;

    // Tạo lịch hẹn mới
    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      startTime,
      endTime,
      reasonForVisit,
      notes,
    });

    // Lưu lịch hẹn vào cơ sở dữ liệu
    await newAppointment.save();

    // Cập nhật mảng appointments trong Doctor model
    await Doctor.findByIdAndUpdate(doctorId, {
      $push: { appointments: newAppointment._id }, // Thêm ID của lịch hẹn vào mảng appointments
    });

    // Sau khi tạo lịch hẹn, tạo hồ sơ bệnh án cho lịch hẹn này
    const newMedicalRecord = new MedicalRecord({
      patient: patientId,
      doctor: doctorId,
      appointment: newAppointment._id,
    });

    // Lưu hồ sơ bệnh án
    await newMedicalRecord.save();

    res.status(201).json({
      success: true,
      message: "Lịch hẹn và hồ sơ bệnh án đã được tạo thành công",
      appointment: newAppointment,
      medicalRecord: newMedicalRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo lịch hẹn và hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.getAllMedicalRecords = async (req, res) => {
  try {
    // Tìm tất cả hồ sơ bệnh án và lấy kèm thông tin bệnh nhân, bác sĩ, cuộc hẹn liên quan
    const medicalRecords = await MedicalRecord.find().populate(
      "patient doctor appointment"
    );

    res.status(200).json({
      success: true,
      message: "Đã lấy tất cả hồ sơ bệnh án",
      medicalRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.updateMedicalRecord = async (req, res) => {
  const { recordId } = req.params;
  const { diagnosis, treatment, notes } = req.body;

  try {
    // Tìm hồ sơ bệnh án theo ID
    const medicalRecord = await MedicalRecord.findById(recordId);

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án",
      });
    }

    // Cập nhật thông tin hồ sơ bệnh án
    medicalRecord.diagnosis = diagnosis || medicalRecord.diagnosis;
    medicalRecord.treatment = treatment || medicalRecord.treatment;
    medicalRecord.notes = notes || medicalRecord.notes;
    medicalRecord.updatedAt = Date.now();

    // Lưu hồ sơ bệnh án đã cập nhật
    await medicalRecord.save(); // Đảm bảo đã có await ở đây để thực sự lưu lại thay đổi

    res.status(200).json({
      success: true,
      message: "Hồ sơ bệnh án đã được cập nhật thành công",
      medicalRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate({
        path: "doctor",
        model: "User",
        select: "fullName email role",
        match: { role: "doctor" },
      })
      .populate("patient", "fullName")
      .lean();

    // Thêm thông tin doctor từ bảng Doctor
    const populatedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        if (appointment.doctor) {
          const doctorInfo = await Doctor.findOne({
            user: appointment.doctor._id,
          })
            .select("specialty experience qualifications")
            .lean();

          return {
            ...appointment,
            doctor: {
              ...appointment.doctor,
              ...doctorInfo,
            },
          };
        }
        return appointment;
      })
    );

    res.status(200).json({
      success: true,
      appointments: populatedAppointments,
    });
  } catch (error) {
    console.error("Error in getAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy lịch hẹn",
      error: error.message,
    });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    // Lấy `doctorId` từ thông tin user đã đăng nhập (bác sĩ)
    const doctorId = req.user._id;

    // Tìm tất cả lịch hẹn mà bác sĩ là người phụ trách
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "fullName phone email") // Lấy thông tin bệnh nhân
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName", // Chỉ lấy thông tin cần thiết của bác sĩ
        },
      });

    // Trả về danh sách các lịch hẹn
    res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy lịch hẹn của bác sĩ",
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
        message: "Không tìm thấy lịch hẹn",
      });
    }

    res.status(200).json({
      success: true,
      message: "Trạng thái lịch hẹn đã được cập nhật",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật trạng thái lịch hẹn",
      error: error.message,
    });
  }
};

// Hủy lịch hẹn
exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;

  try {
    // Tìm và xóa lịch hẹn
    const appointment = await Appointment.findByIdAndDelete(appointmentId);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Kiểm tra xem cuộc hẹn có hồ sơ bệnh án không, nếu có thì xóa
    if (appointment.medicalRecord) {
      await MedicalRecord.findByIdAndDelete(appointment.medicalRecord);
    }

    res.status(200).json({
      success: true,
      message: "Lịch hẹn và hồ sơ bệnh án liên quan (nếu có) đã bị xóa",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi hủy lịch hẹn và xóa hồ sơ bệnh án",
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
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Chỉ cho phép dời lịch hẹn nếu trạng thái là "pending" hoặc "confirmed"
    if (
      appointment.status === "completed" ||
      appointment.status === "cancelled"
    ) {
      return res.status(400).json({
        success: false,
        message: "Không thể dời lịch hẹn đã hoàn tất hoặc đã hủy",
      });
    }

    // Cập nhật ngày và giờ cho lịch hẹn
    appointment.date = date;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.status = "pending"; // Đặt lại trạng thái về "pending" sau khi dời lịch

    // Lưu lịch hẹn đã cập nhật
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Lịch hẹn đã được dời thành công",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi dời lịch hẹn",
      error: error.message,
    });
  }
};
