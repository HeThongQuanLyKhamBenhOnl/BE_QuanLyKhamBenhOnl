const Patient = require("../models/Patient");


//Tạo hồ sơ bệnh nhân mới.
exports.createPatientProfile = async (req, res) => {
  const { userId, medicalHistory, allergies, currentMedications, bloodType, emergencyContact } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ success: false, message: "Người dùng không tồn tại hoặc không phải là bệnh nhân" });
    }

    const patient = new Patient({
      user: userId,
      medicalHistory,
      allergies,
      currentMedications,
      bloodType,
      emergencyContact,
    });

    await patient.save();
    
    res.status(201).json({ success: true, message: "Hồ sơ bệnh nhân đã được tạo thành công", patient });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};


// Cập nhật hồ sơ bệnh nhân hiện tại
exports.updatePatientProfile = async (req, res) => {
  const { medicalHistory, allergies, currentMedications, bloodType, emergencyContact } = req.body;

  try {
    const patient = await Patient.findOne({ user: req.user.id });
    if (!patient) {
      return res.status(404).json({ success: false, message: "Hồ sơ bệnh nhân không tồn tại" });
    }

    patient.medicalHistory = medicalHistory || patient.medicalHistory;
    patient.allergies = allergies || patient.allergies;
    patient.currentMedications = currentMedications || patient.currentMedications;
    patient.bloodType = bloodType || patient.bloodType;
    patient.emergencyContact = emergencyContact || patient.emergencyContact;

    await patient.save();
    
    res.status(200).json({ success: true, message: "Cập nhật hồ sơ bệnh nhân thành công", patient });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};


//Lấy hồ sơ của bệnh nhân hiện tại.
exports.getPatientProfile = async (req, res) => {
  try {
    const patient = await Patient.findOne({ user: req.user.id }).populate('user', '-password');
    if (!patient) {
      return res.status(404).json({ success: false, message: "Hồ sơ bệnh nhân không tồn tại" });
    }

    res.status(200).json({ success: true, patient });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
