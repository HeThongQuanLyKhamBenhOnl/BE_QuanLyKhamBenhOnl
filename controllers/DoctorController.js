const Doctor = require("../models/Doctor");

// Cập nhật thông tin bác sĩ
exports.updateDoctorProfile = async (req, res) => {
  const { specialty, experience, qualifications } = req.body;

  try {
    // Tìm bác sĩ theo ID của người dùng (user ID)
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ bác sĩ" });
    }

    // Cập nhật các trường thông tin
    doctor.specialty = specialty || doctor.specialty;
    doctor.experience = experience || doctor.experience;
    doctor.qualifications = qualifications || doctor.qualifications;

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật hồ sơ bác sĩ thành công",
      doctor
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// Thêm lịch làm việc cho bác sĩ
exports.createDoctorSchedule = async (req, res) => {
  const { schedule } = req.body;

  try {
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Bác sĩ không tồn tại" });
    }

    // Thêm lịch làm việc mới vào lịch hiện tại
    doctor.schedule.push(...schedule);
    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Lịch làm việc đã được thêm thành công",
      schedule: doctor.schedule
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// Lấy lịch làm việc của bác sĩ
exports.getDoctorSchedule = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id }).populate('user', '-password');
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Bác sĩ không tồn tại" });
    }

    res.status(200).json({
      success: true,
      schedule: doctor.schedule
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// Lấy danh sách tất cả các bác sĩ
exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find().populate('user', '-password');
    if (!doctors.length) {
      return res.status(404).json({ success: false, message: "Không có bác sĩ nào" });
    }

    res.status(200).json({
      success: true,
      doctors
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// Lấy thông tin chi tiết của một bác sĩ
exports.getDoctorById = async (req, res) => {
  const { doctorId } = req.params;

  try {
    const doctor = await Doctor.findById(doctorId).populate('user', '-password');
    if (!doctor) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bác sĩ" });
    }

    res.status(200).json({
      success: true,
      doctor
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
