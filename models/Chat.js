const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ["doctor", "patient"], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const chatSchema = new mongoose.Schema({
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Appointment", required: true },
  messages: [messageSchema],
});

module.exports = mongoose.model("Chat", chatSchema);
