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
        ref: "Medicine", 
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        required: true,
      },
      total: {
        type: Number, 
        required: true,
      },
    },
  ],
  paymentStatus: {
    type: String,
    enum: ["Unpaid", "Paid", "Pending"],
    default: "Unpaid",
  },
  paymentLink: {
    type: String,
  },
  orderCode: {
    type: Number,
  },
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
