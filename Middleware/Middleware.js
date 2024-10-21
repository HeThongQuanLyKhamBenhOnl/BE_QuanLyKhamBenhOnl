const jwt = require("jsonwebtoken");
const User = require("../models/User");

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

exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Không tìm thấy token xác thực' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Sử dụng decoded.user.id thay vì decoded.id
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



// Middleware để kiểm tra vai trò 'patient'
exports.isPatient = (req, res, next) => {
  if (req.user.role !== "patient") {
    return res.status(403).json({ msg: "Access denied: Patients only" });
  }
  next();
};

exports.isDoctor = async (req, res, next) => {
  try {
      const user = await User.findById(req.user.id);
      if (user.role !== 'doctor') {
          return res.status(403).json({ message: 'Bạn không có quyền truy cập vào tài nguyên này' });
      }
      next();
  } catch (error) {
      res.status(500).json({ message: 'Lỗi máy chủ', error });
  }
};
// Middleware để kiểm tra vai trò 'admin'
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Access denied: Admins only" });
  }
  next();
};
