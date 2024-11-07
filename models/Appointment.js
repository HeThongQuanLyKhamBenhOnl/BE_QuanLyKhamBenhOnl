const mongoose = require("mongoose");

// Tạo schema cho Appointment (lịch hẹn)
const appointmentSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor", // Liên kết với model Doctor (Bác sĩ)
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Liên kết với model User (Bệnh nhân)
      required: true,
    },
    date: {
      type: Date, // Ngày khám
      required: true,
    },
    shift: {
      type: String,
      enum: ["morning", "afternoon", "evening"], // Các ca làm việc
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"], // Các trạng thái
      default: "pending",
    },
    reasonForVisit: {
      type: String, // Lý do khám bệnh
      required: true,
    },
    notes: {
      type: String, // Ghi chú bổ sung (của bác sĩ hoặc phòng khám)
      default: "",
    },
  },
  {
    timestamps: true, // Tự động thêm `createdAt` và `updatedAt`
  }
);

// Tạo model Appointment
const Appointment = mongoose.model("Appointment", appointmentSchema);

module.exports = Appointment;
