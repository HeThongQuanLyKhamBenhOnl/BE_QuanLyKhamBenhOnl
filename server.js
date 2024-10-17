const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

// Load environment variables
require("dotenv").config();

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();


app.use(
  cors({
    origin: "*" || "http://localhost:3000",
    credentials: true,
  })
);


app.use(express.json());
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api", require("./routes/doctorRoutes"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
