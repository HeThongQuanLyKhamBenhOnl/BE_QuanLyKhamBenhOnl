const User = require("../models/User");
const argon2 = require("argon2");
const { generateToken } = require("../Middleware/Middleware");
const Doctor = require("../models/Doctor");
const sendEmail = require("../config/mailer");
const { sendVerificationCode, verifyCode } = require("../config/twillioconfig");

exports.sendOtpWithDetails = async (req, res) => {
  const {
    username,
    email,
    password,
    fullName,
    phone,
    gender,
    dateOfBirth,
    address,
  } = req.body;

  // Kiểm tra thông tin bắt buộc
  if (!phone || !username || !email || !password) {
    return res.status(400).json({
      success: false,
      message:
        "Vui lòng nhập đầy đủ thông tin bắt buộc: username, email, password, phone",
    });
  }

  try {
    // Gửi OTP tới số điện thoại
    const status = await sendVerificationCode(phone);

    if (status === "pending") {
      // Lưu thông tin tạm thời vào session, cache, hoặc token JWT để sử dụng sau
      return res.status(200).json({
        success: true,
        message: "OTP đã được gửi. Vui lòng xác nhận OTP để hoàn tất đăng ký.",
        tempUser: {
          username,
          email,
          password,
          fullName,
          phone,
          gender,
          dateOfBirth,
          address,
        },
      });
    }

    res.status(500).json({ success: false, message: "Gửi OTP thất bại" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.registerUser = async (req, res) => {
  const { otp, tempUser } = req.body;

  // Kiểm tra thông tin bắt buộc
  if (!otp || !tempUser || !tempUser.phone) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp OTP và thông tin người dùng tạm thời",
    });
  }

  const {
    username,
    email,
    password,
    fullName,
    phone,
    gender,
    dateOfBirth,
    address,
  } = tempUser;

  try {
    // Xác minh OTP với Twilio
    const status = await verifyCode(phone, otp);

    if (status !== "approved") {
      return res
        .status(400)
        .json({ success: false, message: "OTP không hợp lệ hoặc đã hết hạn" });
    }

    // Kiểm tra email đã tồn tại hay chưa
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "Email đã được sử dụng" });
    }

    // Hash mật khẩu
    const hashedPassword = await argon2.hash(password);

    // Tạo mới người dùng
    user = new User({
      username,
      email,
      password: hashedPassword,
      role: "patient",
      fullName,
      phone,
      gender,
      dateOfBirth,
      address,
    });

    await user.save();

    // Tạo token
    const token = generateToken(user);

    // Trả về kết quả
    res.status(201).json({
      success: true,
      message: "Đăng ký thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.createDoctor = async (req, res) => {
  const {
    username,
    email,
    password,
    fullName,
    phone,
    gender,
    dateOfBirth,
    address,
    specialization,
    experience,
    qualifications,
  } = req.body;

  // Kiểm tra nếu có trường nào bị thiếu
  if (
    !username ||
    !email ||
    !password ||
    !fullName ||
    !phone ||
    !gender ||
    !dateOfBirth ||
    !address ||
    !specialization ||
    !experience
  ) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng điền đầy đủ thông tin!",
    });
  }

  try {
    // Kiểm tra xem email đã tồn tại chưa
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ success: false, message: "Email đã được sử dụng" });
    }

    // Mã hóa mật khẩu bằng argon2 hoặc bcrypt
    const hashedPassword = await argon2.hash(password);

    // Tạo tài khoản người dùng với vai trò "doctor"
    user = new User({
      username,
      email,
      password: hashedPassword,
      role: "doctor",
      fullName,
      phone,
      gender,
      dateOfBirth,
      address,
    });

    await user.save();

    const doctorProfile = new Doctor({
      user: user._id,
      specialty: specialization,
      experience,
      qualifications: qualifications || [],
    });

    await doctorProfile.save();

    res.status(201).json({
      success: true,
      message: "Tài khoản và hồ sơ bác sĩ đã được tạo thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        specialization: doctorProfile.specialty,
        experience: doctorProfile.experience,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ", error });
  }
};

exports.loginUser = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    const isMatch = await argon2.verify(user.password, password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
    }

    const token = generateToken(user);
    res.status(200).json({
      success: true,
      message: "Đăng nhập thành công",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        gender: user.gender,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { username, fullName, phone, gender, dateOfBirth, address } = req.body;

  try {
    let user = await User.findById(req.user.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }

    user.username = username || user.username;
    user.fullName = fullName || user.fullName;
    user.phone = phone || user.phone;
    user.gender = gender || user.gender;
    user.dateOfBirth = dateOfBirth || user.dateOfBirth;
    user.address = address || user.address;

    await user.save();

    res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        address: user.address,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Người dùng không tồn tại" });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" }).select("-password");
    if (!patients.length) {
      return res
        .status(404)
        .json({ success: false, message: "Không có bệnh nhân nào" });
    }
    res.status(200).json({
      success: true,
      patients,
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

    // Tìm tất cả các hồ sơ Doctor có user thuộc danh sách người dùng vừa tìm
    const doctors = await Doctor.find({
      user: { $in: users.map((user) => user._id) },
    }).populate("user", "-password");

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

    // Trả về danh sách bác sĩ kèm thông tin hợp nhất
    res.status(200).json({
      success: true,
      doctors: mergedDoctors,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Kiểm tra xem email có tồn tại trong hệ thống không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email không tồn tại trong hệ thống",
      });
    }

    // Tạo một mật khẩu mới gồm 6 ký tự số
    const newPassword = Math.floor(100000 + Math.random() * 900000).toString();

    // Mã hoá mật khẩu mới
    const hashedPassword = await argon2.hash(newPassword);

    // Cập nhật mật khẩu của người dùng trong cơ sở dữ liệu
    user.password = hashedPassword;
    await user.save();

    // Gửi mật khẩu mới tới email của người dùng
    const emailSubject = "Mật khẩu mới của bạn";
    const emailText = `Mật khẩu mới của bạn là: ${newPassword}. Hãy đăng nhập và thay đổi mật khẩu của bạn.`;

    await sendEmail(email, emailSubject, emailText);

    res.status(200).json({
      success: true,
      message: "Mật khẩu mới đã được gửi về email của bạn",
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, message: "Lỗi máy chủ" });
  }
};
