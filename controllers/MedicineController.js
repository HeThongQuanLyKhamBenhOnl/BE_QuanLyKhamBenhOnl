const Medicine = require("../models/Medicine");

// Tạo thuốc mới
exports.createMedicine = async (req, res) => {
  try {
    const { name, price, stock } = req.body;
    const newMedicine = new Medicine({ name, price, stock });
    await newMedicine.save();
    res.status(201).json({ success: true, data: newMedicine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Lấy danh sách tất cả các thuốc
exports.getAllMedicines = async (req, res) => {
  try {
    const medicines = await Medicine.find();
    res.status(200).json({ success: true, data: medicines });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Cập nhật thông tin thuốc theo ID
exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, stock } = req.body;
    const updatedMedicine = await Medicine.findByIdAndUpdate(
      id,
      { name, price, stock, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updatedMedicine) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy thuốc" });
    }

    res.status(200).json({ success: true, data: updatedMedicine });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Xóa thuốc theo ID
exports.deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMedicine = await Medicine.findByIdAndDelete(id);

    if (!deletedMedicine) {
      return res
        .status(404)
        .json({ success: false, error: "Không tìm thấy thuốc" });
    }

    res.status(200).json({ success: true, message: "Xóa thuốc thành công" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
