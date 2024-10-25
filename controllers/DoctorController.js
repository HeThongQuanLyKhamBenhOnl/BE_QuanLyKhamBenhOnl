const Doctor = require("../models/Doctor");
const User = require("../models/User");
const mongoose = require('mongoose');

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

exports.getDoctorProfile = async (req, res) => {
  const userId = req.user.id; // Lấy userId từ token sau khi xác thực

  if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: 'User ID không hợp lệ' });
  }

  try {
      // Tìm bác sĩ có trường `user` trỏ đến `userId`
      const doctor = await Doctor.findOne({ user: userId })
          .populate('user', 'fullName phone email address gender dateOfBirth') // Lấy thông tin từ User
          .populate('appointments', 'date startTime endTime status'); // Nếu cần lấy thêm thông tin từ Appointment

      if (!doctor) {
          return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ bác sĩ' });
      }

      return res.status(200).json({ success: true, data: doctor });
  } catch (error) {
      console.error('Error fetching doctor profile:', error);
      return res.status(500).json({ success: false, message: 'Lỗi máy chủ', error: error.message });
  }
};


// Cập nhật thông tin cá nhân của doctor
exports.updateDoctorProfile = async (req, res) => {
  const { specialty, experience, qualifications } = req.body;

  try {
    // Tìm hồ sơ bác sĩ dựa trên userId
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy hồ sơ bác sĩ" });
    }

    // Cập nhật các trường thông tin
    doctor.specialty = specialty || doctor.specialty;
    doctor.experience = experience || doctor.experience;
    doctor.qualifications = qualifications || doctor.qualifications;

    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin bác sĩ thành công",
      doctor,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ", error });
  }
};

// Thêm lịch làm việc cho bác sĩ
exports.createDoctorSchedule = async (req, res) => {
  const { schedule } = req.body;

  try {
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Bác sĩ không tồn tại" });
    }
    const conflictingSchedule = doctor.schedule.some((existingSchedule) => {
      return schedule.some((newSchedule) => {
        return (
          existingSchedule.date === newSchedule.date &&
          ((newSchedule.startTime >= existingSchedule.startTime &&
            newSchedule.startTime <= existingSchedule.endTime) ||
            (newSchedule.endTime >= existingSchedule.startTime &&
              newSchedule.endTime <= existingSchedule.endTime))
        );
      });
    });

    if (conflictingSchedule) {
      return res
        .status(400)
        .json({ success: false, message: "Lịch làm việc bị trùng lặp" });
    }

    // Thêm lịch mới vào
    doctor.schedule.push(...schedule);
    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Lịch làm việc đã được thêm thành công",
      schedule: doctor.schedule,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

// Lấy lịch làm việc của bác sĩ
exports.getDoctorSchedule = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id }).populate(
      "user",
      "-password"
    );
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Bác sĩ không tồn tại" });
    }

    res.status(200).json({
      success: true,
      schedule: doctor.schedule,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.getAllDoctors = async (req, res) => {
  try {
    // Lấy tất cả các người dùng có vai trò là "doctor", không lấy password
    const users = await User.find({ role: "doctor" }).select("-password");

    if (!users.length) {
      return res
        .status(404)
        .json({ success: false, message: "Không có bác sĩ nào" });
    }
    const userIds = users.map((user) => user._id);
    const doctors = await Doctor.find({ user: { $in: userIds } }).populate(
      "user",
      "-password"
    );

    if (!doctors.length) {
      return res
        .status(404)
        .json({ success: false, message: "Không có hồ sơ bác sĩ nào" });
    }

    // Gộp thông tin từ User và Doctor
    const mergedDoctors = doctors.map((doctor) => ({
      ...doctor.user.toObject(), // Dữ liệu từ User
      specialty: doctor.specialty, // Thông tin từ Doctor
      experience: doctor.experience,
      qualifications: doctor.qualifications,
      schedule: doctor.schedule,
      patients: doctor.patients,
      appointments: doctor.appointments,
    }));
    res.status(200).json({
      success: true,
      doctors: mergedDoctors,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.getDoctorById = async (req, res) => {
  const { userId } = req.params; // Lấy userId từ req.params

  try {
    // Tìm thông tin bác sĩ theo userId
    const doctor = await Doctor.findOne({ user: userId }).populate(
      "user",
      "-password"
    );

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.confirmAppointment = async (req, res) => {
  const { appointmentId } = req.body;

  try {
    const doctor = await Doctor.findOne({ user: req.user.id });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Bác sĩ không tồn tại" });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ success: false, message: "Cuộc hẹn không tồn tại" });
    }

    appointment.isConfirmed = true;
    await appointment.save();

    res.status(200).json({
      success: true,
      message: "Cuộc hẹn đã được xác nhận thành công",
      appointment,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.getDoctorPatients = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ user: req.user.id }).populate(
      "patients"
    );
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });
    }

    res.status(200).json({
      success: true,
      patients: doctor.patients,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
