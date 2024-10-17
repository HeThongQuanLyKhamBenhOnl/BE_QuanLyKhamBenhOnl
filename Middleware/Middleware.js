const jwt = require("jsonwebtoken");
const User = require("../models/User"); // Đảm bảo bạn đã import model User

// Middleware để tạo JWT token
exports.generateToken = (user) => {
  const payload = {
    user: {
      id: user._id,
      role: user.role,
    },
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: "24h" } // Token hết hạn sau 24 giờ
  );
};

// Middleware để xác thực token
// Middleware để xác thực token trên backend
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Lấy token từ tiêu đề Authorization
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "Không tìm thấy token xác thực" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Xác thực token
    console.log("Token:", token); // Kiểm tra token
    console.log("Decoded Token:", decoded); // Log nội dung token sau khi giải mã

    const user = await User.findById(decoded.user.id).select("-password"); // Lấy thông tin người dùng từ DB

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ hoặc người dùng không tồn tại",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error: ", error.message); // Log lỗi chi tiết
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
      error: error.message,
    });
  }
};

// Middleware để kiểm tra vai trò 'patient'
exports.isPatient = (req, res, next) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({ msg: "Access denied: Patients only" });
  }
  next();
};

// Middleware để kiểm tra vai trò 'doctor'
exports.isDoctor = (req, res, next) => {
  if (req.user.role !== "doctor") {
    return res.status(403).json({ msg: "Access denied: Doctors only" });
  }
  next();
};

// Middleware để kiểm tra vai trò 'admin'
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied: Admins only" });
  }
  next();
};
