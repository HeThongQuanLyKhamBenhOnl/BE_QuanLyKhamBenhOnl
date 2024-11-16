const Chat = require("../models/Chat");

exports.createChat = async (req, res) => {
  const { doctorId, patientId, appointmentId } = req.body;

  try {
    const existingChat = await Chat.findOne({
      doctorId,
      patientId,
      appointmentId,
    });
    if (existingChat) {
      return res.status(200).json({ success: true, chat: existingChat });
    }

    const newChat = new Chat({
      doctorId,
      patientId,
      appointmentId,
      messages: [],
    });

    await newChat.save();
    res.status(201).json({ success: true, chat: newChat });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi tạo cuộc trò chuyện",
      error: error.message,
    });
  }
};

exports.sendMessage = async (req, res) => {
  const { chatId, content } = req.body;

  // Xác định người gửi từ `req.user`
  const senderRole = req.user.role === "doctor" ? "doctor" : "patient";
  const receiverRole = senderRole === "doctor" ? "patient" : "doctor";

  try {
    // Tìm cuộc trò chuyện với `chatId`
    const chat = await Chat.findById(chatId);

    // Kiểm tra nếu cuộc trò chuyện không tồn tại
    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    // Kiểm tra xem người gửi có phải là bác sĩ hoặc bệnh nhân của cuộc trò chuyện không
    if (
      (senderRole === "doctor" &&
        chat.doctorId.toString() !== req.user._id.toString()) ||
      (senderRole === "patient" &&
        chat.patientId.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền gửi tin nhắn trong cuộc trò chuyện này",
      });
    }

    // Tạo tin nhắn mới và thêm vào mảng `messages`
    const newMessage = { sender: senderRole, content, timestamp: new Date() };
    chat.messages.push(newMessage);
    await chat.save();

    // Phản hồi thành công với tin nhắn mới
    res.status(200).json({ success: true, message: newMessage });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi gửi tin nhắn",
      error: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy cuộc trò chuyện" });
    }

    res.status(200).json({ success: true, messages: chat.messages });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy tin nhắn",
      error: error.message,
    });
  }
};

exports.getChatList = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role; // "doctor" hoặc "patient"

    let chats;

    // Tìm các cuộc trò chuyện mà user có liên quan
    if (role === "doctor") {
      chats = await Chat.find({ doctorId: userId })
        .populate("patientId", "fullName") // Lấy tên bệnh nhân
        .populate("doctorId", "fullName"); // Lấy tên bác sĩ
    } else if (role === "patient") {
      chats = await Chat.find({ patientId: userId })
        .populate("doctorId", "fullName") // Lấy tên bác sĩ
        .populate("patientId", "fullName"); // Lấy tên bệnh nhân
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Role không hợp lệ" });
    }

    // Nếu không tìm thấy cuộc trò chuyện nào, trả về danh sách rỗng
    if (!chats || chats.length === 0) {
      return res.status(200).json({ success: true, chats: [] });
    }

    // Trích xuất danh sách chatId và thông tin người dùng
    const chatData = chats.map((chat) => {
      const chatName =
        role === "doctor"
          ? chat.patientId?.fullName // Tên bệnh nhân nếu là bác sĩ
          : chat.doctorId?.fullName;
      return {
        chatId: chat._id,
        fullName: chatName || "Người dùng không xác định",
      };
    });

    res.status(200).json({ success: true, chats: chatData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi khi lấy danh sách chat",
      error: error.message,
    });
  }
};
