const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // Đảm bảo tên thuốc là duy nhất
  },
  price: {
    type: Number,
    required: true,
    min: 0, // Giá không thể âm
  },
  stock: {
    type: Number,
    required: true,
    min: 0, // Số lượng tồn kho không thể âm
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

medicineSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Medicine = mongoose.model("Medicine", medicineSchema);

module.exports = Medicine;
