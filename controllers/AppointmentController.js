const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const MedicalRecord = require("../models/MedicalRecord");
const Medicine = require("../models/Medicine");
const sendEmail = require("../config/mailer");
const User = require("../models/User");
const mongoose = require("mongoose");

exports.createAppointment = async (req, res) => {
  const { doctorId, date, shift, reasonForVisit, notes, status } = req.body;

  try {
    const patientId = req.user._id;
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });

    const availableSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(date).toISOString() &&
        slot.shift === shift &&
        slot.isAvailable
    );

    if (!availableSlot) {
      return res.status(400).json({
        success: false,
        message: "Ca làm việc này không khả dụng, vui lòng chọn ca khác",
      });
    }

    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      shift,
      reasonForVisit,
      notes,
      status,
    });

    await newAppointment.save();

    doctor.appointments.push(newAppointment._id);
    await doctor.save();

    // Tạo hồ sơ bệnh án cho lịch hẹn này

    const newMedicalRecord = new MedicalRecord({
      patient: patientId,
      doctor: doctorId,
      appointment: newAppointment._id,
    });

    await newMedicalRecord.save();

    // Lấy thông tin bệnh nhân và bác sĩ để gửi email
    const patient = await User.findById(patientId);
    const doctorUser = await User.findById(doctor.user);

    if (patient && patient.email) {
      const to = patient.email;
      const subject = "Xác nhận lịch hẹn";
      const text = `Chào ${patient.fullName},

Lịch hẹn của bạn với bác sĩ ${doctorUser.fullName} vào ngày ${new Date(
        date
      ).toLocaleDateString()} ca ${shift} đã được đặt thành công.

Lý do khám: ${reasonForVisit}
Ghi chú: ${notes}
Trạng thái:${status}

Cảm ơn bạn,
Tên phòng khám`;

      try {
        await sendEmail(to, subject, text);
      } catch (emailError) {
        console.error("Lỗi khi gửi email:", emailError);
      }
    } else {
      console.error("Không tìm thấy email của bệnh nhân.");
    }

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

exports.getDoctorMedicalRecords = async (req, res) => {
  try {
    const doctorId = req.user._id; // Lấy ID bác sĩ từ token đã đăng nhập

    // Tìm bác sĩ dựa trên ID của user đã đăng nhập
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Bác sĩ không tồn tại" });
    }

    // Tìm tất cả hồ sơ bệnh án có bác sĩ là người đang đăng nhập
    const medicalRecords = await MedicalRecord.find({ doctor: doctorId })
      .populate("patient", "fullName dateOfBirth gender") // Thông tin của bệnh nhân
      .populate({
        path: "appointment",
        match: { doctor: doctorId, status: "Completed" },
        select: "date shift reasonForVisit status", // Thông tin cuộc hẹn liên quan
      })
      .populate("prescribedMedicines.medicine", "name")
      .lean();

    // Lọc ra các hồ sơ có lịch hẹn cụ thể với bác sĩ
    const recordsWithAppointment = medicalRecords.filter(
      (record) =>
        record.appointment && record.appointment.status === "Completed"
    );

    res.status(200).json({
      success: true,
      message: "Lấy hồ sơ bệnh án thành công",
      medicalRecords: recordsWithAppointment,
    });
  } catch (error) {
    console.error("Error in getDoctorMedicalRecords:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy hồ sơ bệnh án",
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
  const { diagnosis, treatment, notes, prescribedMedicines } = req.body;

  try {
    const medicalRecord = await MedicalRecord.findById(recordId).populate(
      "patient",
      "fullName email"
    );
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án",
      });
    }

    medicalRecord.diagnosis = diagnosis || medicalRecord.diagnosis;
    medicalRecord.treatment = treatment || medicalRecord.treatment;
    medicalRecord.notes = notes || medicalRecord.notes;

    if (prescribedMedicines && prescribedMedicines.length > 0) {
      console.log("Received prescribedMedicines:", prescribedMedicines);

      const newPrescriptions = await Promise.all(
        prescribedMedicines.map(async (item) => {
          const medicine = await Medicine.findById(item.medicine);
          if (!medicine) {
            throw new Error(`Không tìm thấy thuốc với ID ${item.medicine}`);
          }

          if (medicine.stock < item.quantity) {
            throw new Error(`Không đủ ${medicine.name} trong kho`);
          }

          // Cập nhật tồn kho
          medicine.stock -= item.quantity;
          await medicine.save();

          console.log(
            `Processed medicine: ${medicine.name}, quantity: ${item.quantity}, price: ${medicine.price}`
          );

          return {
            medicine: item.medicine,
            quantity: item.quantity,
            price: medicine.price,
            total: item.quantity * medicine.price,
          };
        })
      );

      console.log("New prescriptions before saving:", newPrescriptions);
      medicalRecord.prescribedMedicines = newPrescriptions;
    } else {
      console.log("No prescribedMedicines to update.");
    }

    medicalRecord.updatedAt = Date.now();
    await medicalRecord.save();

    // Gửi email hồ sơ bệnh án đã cập nhật cho bệnh nhân
    if (medicalRecord.patient && medicalRecord.patient.email) {
      const to = medicalRecord.patient.email;
      const subject = "Cập nhật hồ sơ bệnh án";
      const text = `Chào ${medicalRecord.patient.fullName},

Hồ sơ bệnh án của bạn đã được cập nhật với các thông tin sau:

Chẩn đoán: ${medicalRecord.diagnosis}
Phác đồ điều trị: ${medicalRecord.treatment}
Ghi chú: ${medicalRecord.notes}

Đơn thuốc:
${medicalRecord.prescribedMedicines
  .map(
    (item) =>
      `- ${item.quantity} x ${item.medicine.name} (Giá: ${item.price}, Tổng: ${item.total})`
  )
  .join("\n")}

Cảm ơn bạn,
Tên phòng khám`;

      try {
        await sendEmail(to, subject, text);
        console.log("Email đã được gửi thành công tới bệnh nhân");
      } catch (emailError) {
        console.error("Lỗi khi gửi email:", emailError);
      }
    } else {
      console.error("Không tìm thấy email của bệnh nhân.");
    }

    res.status(200).json({
      success: true,
      message: "Hồ sơ bệnh án đã được cập nhật thành công",
      medicalRecord,
    });
  } catch (error) {
    console.error("Error updating medical record:", error.message);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.getUpdatedMedicalRecords = async (req, res) => {
  try {
    // Lấy ID của bệnh nhân hiện tại
    const patientId = req.user._id;

    // Tìm tất cả hồ sơ bệnh án của bệnh nhân, bao gồm thông tin về bác sĩ và cuộc hẹn
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate({
        path: "doctor",
        model: "User", // giả sử bác sĩ nằm trong bảng User
        select: "fullName",
        match: { role: "doctor" },
      }) // Chỉ lấy thông tin bác sĩ cần thiết
      .populate("appointment", "date startTime endTime")
      .populate("prescribedMedicines.medicine", "name")
      .lean();

    // Lọc các hồ sơ bệnh án có thông tin cập nhật từ bác sĩ (ví dụ, có chuẩn đoán và phương pháp điều trị)
    const updatedMedicalRecords = medicalRecords.filter(
      (record) => record.diagnosis || record.treatment || record.notes
    );

    res.status(200).json({
      success: true,
      message: "Đã lấy hồ sơ bệnh án đã cập nhật",
      medicalRecords: updatedMedicalRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy hồ sơ bệnh án",
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

    // Thêm thông tin từ bảng Doctor
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
            doctor: doctorInfo
              ? {
                  ...appointment.doctor,
                  specialty: doctorInfo.specialty || "Không có chuyên khoa",
                  experience: doctorInfo.experience || 0,
                  qualifications: doctorInfo.qualifications || [],
                }
              : appointment.doctor,
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
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "ID cuộc hẹn không hợp lệ",
    });
  }

  try {
    // Tìm cuộc hẹn theo ID
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Kiểm tra trạng thái cuộc hẹn
    if (appointment.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy cuộc hẹn đã hoàn thành",
      });
    }

    // Xóa lịch hẹn khỏi danh sách của bác sĩ
    const doctor = await Doctor.findOne({ user: appointment.doctor });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ liên quan đến lịch hẹn này",
      });
    }

    // Xóa ID cuộc hẹn khỏi danh sách của bác sĩ
    doctor.appointments = doctor.appointments.filter(
      (id) => !id.equals(appointment._id)
    );

    // Tìm và cập nhật slot trong lịch của bác sĩ thành khả dụng
    const scheduleSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(appointment.date).toISOString() &&
        slot.shift === appointment.shift
    );

    if (scheduleSlot) {
      scheduleSlot.isAvailable = true;
    }

    await doctor.save();

    // Xóa hồ sơ bệnh án liên quan đến cuộc hẹn
    await MedicalRecord.findOneAndDelete({ appointment: appointmentId });

    // Xóa cuộc hẹn
    await Appointment.findByIdAndDelete(appointmentId);

    res.status(200).json({
      success: true,
      message: "Lịch hẹn đã bị hủy thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi hủy lịch hẹn",
      error: error.message,
    });
  }
};

// Dời lịch hẹn (Reschedule)
exports.rescheduleAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { date, shift } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch hẹn" });

    const doctor = await Doctor.findById(appointment.doctor);
    const oldSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(appointment.date).toISOString() &&
        slot.shift === appointment.shift
    );

    if (oldSlot) oldSlot.isAvailable = true;

    const newSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(date).toISOString() &&
        slot.shift === shift &&
        slot.isAvailable
    );

    if (!newSlot) {
      return res.status(400).json({
        success: false,
        message: "Ca làm việc mới không khả dụng, vui lòng chọn ca khác",
      });
    }

    appointment.date = date;
    appointment.shift = shift;
    appointment.status = "pending";
    await appointment.save();

    newSlot.isAvailable = false;
    await doctor.save();

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
