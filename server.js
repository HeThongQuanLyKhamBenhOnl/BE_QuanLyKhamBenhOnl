const express = require("express");
const http = require("http");
const connectDB = require("./config/db");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const initializeSocket = require("./socket"); // Import hàm khởi tạo Socket.IO

// Khởi tạo ứng dụng Express
const app = express();
connectDB();

// Cấu hình CORS cho Express
app.use(
  cors({
    origin: "*" || "http://localhost:3000",
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Định nghĩa các route API
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api", require("./routes/doctorRoutes"));
app.use("/api", require("./routes/appointmentRoutes"));
app.use("/api", require("./routes/medicineRoutes"));
app.use("/api/chats", require("./routes/chatRoutes"));

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// Cấu hình static files cho frontend
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// Tạo HTTP server từ Express app
const server = http.createServer(app);

// Khởi tạo Socket.IO trên cùng server với Express
initializeSocket(server);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server đang chạy trên cổng ${PORT}`);
});
