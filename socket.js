const socketIo = require("socket.io");
const Chat = require("./models/Chat"); // Đảm bảo đường dẫn chính xác

// Hàm khởi tạo Socket.IO và cấu hình các sự kiện
function initializeSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*", // Cấu hình CORS cho Socket.IO
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Người dùng đã kết nối:", socket.id);

    // Tham gia phòng chat dựa trên chatId
    socket.on("joinChat", (chatId) => {
      socket.join(chatId);
      console.log(`Người dùng đã tham gia phòng chat: ${chatId}`);
    });

    // Xử lý sự kiện gửi tin nhắn trực tiếp trong Socket.IO
    socket.on("sendMessage", async ({ chatId, senderId, content }) => {
      try {
        // Tìm cuộc trò chuyện với `chatId` và xác nhận quyền hạn người gửi
        const chat = await Chat.findById(chatId);
        if (!chat) {
          socket.emit("error", { message: "Không tìm thấy cuộc trò chuyện" });
          return;
        }

        // Kiểm tra quyền của người gửi
        if (
          (chat.doctorId.toString() !== senderId && chat.patientId.toString() !== senderId)
        ) {
          socket.emit("error", { message: "Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này" });
          return;
        }

        // Xác định người gửi dựa trên `senderId`
        const senderRole = chat.doctorId.toString() === senderId ? "doctor" : "patient";

        // Tạo tin nhắn mới và thêm vào mảng `messages`
        const newMessage = { sender: senderRole, content, timestamp: new Date() };
        chat.messages.push(newMessage);
        await chat.save();

        // Phát tin nhắn tới tất cả người dùng trong phòng chat
        io.to(chatId).emit("newMessage", newMessage);
      } catch (error) {
        console.error("Lỗi khi gửi tin nhắn:", error);
        socket.emit("error", { message: "Đã xảy ra lỗi khi gửi tin nhắn" });
      }
    });

    // Ngắt kết nối
    socket.on("disconnect", () => {
      console.log("Người dùng đã ngắt kết nối:", socket.id);
    });
  });
}

module.exports = initializeSocket;
