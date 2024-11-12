const express = require("express");
const router = express.Router();
const chatController = require("../controllers/ChatController");
const { verifyToken } = require("../Middleware/Middleware");



router.post("/create", chatController.createChat);
router.post("/send",verifyToken ,chatController.sendMessage);
router.get("/:chatId/messages", verifyToken,chatController.getMessages);

module.exports = router;
