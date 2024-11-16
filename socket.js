const socketIo = require("socket.io");
const mongoose = require("mongoose");
const Chat = require("./models/Chat");

// Hàm khởi tạo Socket.IO và cấu hình các sự kiện
function initializeSocket(server) {
  const io = socketIo(server, {
    cors: {
      origin: "*", // Nên thay * bằng URL cụ thể của frontend để bảo mật
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Người dùng đã kết nối:", socket.id);

    // Tham gia phòng chat
    socket.on("joinChat", (chatId) => {
      console.log(`Người dùng đã tham gia phòng chat: ${chatId}`);
      if (!chatId) {
        return socket.emit("error", { message: "chatId không hợp lệ" });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return socket.emit("error", {
          message: "chatId không phải ObjectId hợp lệ",
        });
      }

      socket.join(chatId);
      console.log(`Người dùng đã tham gia phòng chat: ${chatId}`);
    });

    socket.on("sendMessage", async ({ chatId, senderId, content }) => {
      console.log("Dữ liệu gửi lên:", { chatId, senderId, content });

      // Kiểm tra thông tin cần thiết
      if (!chatId || !senderId || !content) {
        return socket.emit("error", {
          message: "Thiếu thông tin cần thiết để gửi tin nhắn",
        });
      }

      // Kiểm tra hợp lệ của ObjectId
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return socket.emit("error", { message: "chatId không hợp lệ" });
      }

      try {
        // Tìm cuộc trò chuyện
        const chat = await Chat.findById(chatId);
        if (!chat) {
          console.error("Không tìm thấy cuộc trò chuyện với chatId:", chatId);
          return socket.emit("error", {
            message: "Không tìm thấy cuộc trò chuyện",
          });
        }

        // Kiểm tra quyền của người gửi
        const isAuthorized =
          chat.doctorId.toString() === senderId ||
          chat.patientId.toString() === senderId;
        if (!isAuthorized) {
          return socket.emit("error", {
            message:
              "Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này",
          });
        }

        // Tạo tin nhắn mới
        const newMessage = {
          sender: chat.doctorId.toString() === senderId ? "doctor" : "patient",
          content,
          timestamp: new Date(),
        };

        // Thêm tin nhắn vào mảng messages
        chat.messages.push(newMessage);
        console.log("Tin nhắn trước khi lưu:", chat.messages);

        // Lưu thay đổi vào MongoDB
        await chat.save();

        console.log("Tin nhắn đã được lưu vào MongoDB:", newMessage);

        // Phát tin nhắn tới tất cả người dùng trong phòng chat
        io.to(chatId).emit("newMessage", newMessage);
      } catch (error) {
        console.error("Lỗi khi lưu tin nhắn:", error);
        socket.emit("error", {
          message: "Đã xảy ra lỗi khi gửi tin nhắn",
          error: error.message,
        });
      }
    });

    // Lấy danh sách tin nhắn
    socket.on("getMessages", async (chatId) => {
      if (!chatId) {
        return socket.emit("error", { message: "chatId không hợp lệ" });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return socket.emit("error", {
          message: "chatId không phải ObjectId hợp lệ",
        });
      }

      try {
        // Tìm cuộc trò chuyện
        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit("error", {
            message: "Không tìm thấy cuộc trò chuyện",
          });
        }

        // Gửi danh sách tin nhắn về client
        socket.emit("messages", chat.messages);
        console.log(`Đã gửi danh sách tin nhắn cho chatId: ${chatId}`);
      } catch (error) {
        console.error("Lỗi khi lấy tin nhắn:", error);
        socket.emit("error", {
          message: "Đã xảy ra lỗi khi lấy tin nhắn",
          error: error.message,
        });
      }
    });
    socket.on("disconnect", () => {
      console.log("Người dùng đã ngắt kết nối:", socket.id);
    });
  });
}

module.exports = initializeSocket;
