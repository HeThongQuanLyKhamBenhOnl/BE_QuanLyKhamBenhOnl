const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware tạo JWT token
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

// Middleware xác thực JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.user.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Token không hợp lệ hoặc người dùng không tồn tại' });
    }

    req.user = user; // Gán người dùng đã xác thực vào request
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Token không hợp lệ', error: error.message });
  }
};

// Middleware kiểm tra vai trò dựa trên `role`
exports.checkRole = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ msg: `Access denied: ${role}s only` });
    }
    next();
  };
};

// Sử dụng checkRole thay cho từng middleware riêng lẻ
exports.isPatient = exports.checkRole('patient');
exports.isDoctor = exports.checkRole('doctor');
exports.isAdmin = exports.checkRole('admin');
