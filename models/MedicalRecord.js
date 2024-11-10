const mongoose = require("mongoose");

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  diagnosis: {
    type: String,
    default: "",
  },
  treatment: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  prescribedMedicines: [
    {
      medicine: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Medicine", // Liên kết với model Medicine
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number, // Giá bán của thuốc tại thời điểm kê toa
        required: true,
      },
      total: {
        type: Number, // Tổng giá tiền của thuốc (price * quantity)
        required: true,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

module.exports = MedicalRecord;
