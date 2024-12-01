const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const MedicalRecord = require("../models/MedicalRecord");
const Medicine = require("../models/Medicine");
const sendEmail = require("../config/mailer");
const User = require("../models/User");
const mongoose = require("mongoose");
const Chat = require("../models/Chat");

const PayOS = require("@payos/node");

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.updateMedicalRecord = async (req, res) => {
  const { recordId } = req.params;
  const { diagnosis, treatment, notes, prescribedMedicines } = req.body;

  try {
    const medicalRecord = await MedicalRecord.findById(recordId).populate(
      "patient",
      "fullName email"
    );

    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy hồ sơ bệnh án",
      });
    }

    // Update basic fields
    medicalRecord.diagnosis = diagnosis || medicalRecord.diagnosis;
    medicalRecord.treatment = treatment || medicalRecord.treatment;
    medicalRecord.notes = notes || medicalRecord.notes;

    let totalCost = 0;

    // Process prescribed medicines
    if (prescribedMedicines && prescribedMedicines.length > 0) {
      const updatedMedicines = await Promise.all(
        prescribedMedicines.map(async (item) => {
          const medicine = await Medicine.findById(item.medicine);
          if (!medicine) {
            throw new Error(`Không tìm thấy thuốc với ID ${item.medicine}`);
          }

          if (medicine.stock < item.quantity) {
            throw new Error(`Không đủ ${medicine.name} trong kho`);
          }

          // Deduct stock
          medicine.stock -= item.quantity;
          await medicine.save();

          const total = item.quantity * medicine.price;
          totalCost += total;

          return {
            medicine: item.medicine,
            quantity: item.quantity,
            price: medicine.price,
            total,
            paymentStatus: "Unpaid",
          };
        })
      );

      medicalRecord.prescribedMedicines = updatedMedicines;
    }

    // Generate payment link if there's a cost
    if (totalCost > 0) {
      const orderCode = Math.floor(Math.random() * 1000000000); // Shorter order code
      const paymentData = {
        orderCode,
        amount: totalCost,
        description: "Thanh toán đơn thuốc",
        returnUrl: `${process.env.DOMAIN_URL}/api/medical-records/payment-success?orderCode=${orderCode}`,
        cancelUrl: `${process.env.DOMAIN_URL}/api/medical-records/payment-cancel?orderCode=${orderCode}`,
      };

      const paymentResponse = await payos.createPaymentLink(paymentData);

      if (paymentResponse.status === "PENDING") {
        medicalRecord.paymentLink = paymentResponse.checkoutUrl;
        medicalRecord.qrCode = paymentResponse.qrCode;
        medicalRecord.paymentStatus = "Pending";
        medicalRecord.orderCode = orderCode;
      } else {
        return res.status(400).json({
          success: false,
          message: "Không thể tạo liên kết thanh toán",
          error: paymentResponse.message,
        });
      }
    } else {
      medicalRecord.paymentStatus = "Unpaid";
    }

    // Save updated medical record
    medicalRecord.updatedAt = Date.now();
    await medicalRecord.save();

    res.status(200).json({
      success: true,
      message: "Hồ sơ bệnh án đã được cập nhật thành công",
      medicalRecord: {
        ...medicalRecord.toObject(),
        paymentLink: medicalRecord.paymentLink,
        qrCode: medicalRecord.qrCode,
      },
    });
  } catch (error) {
    console.error("Error updating medical record:", error.message);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.handlePaymentSuccess = async (req, res) => {
  const { orderCode, status } = req.query;

  try {
    // Validate orderCode and payment status
    if (!orderCode || (status !== "PAID" && status !== "SUCCESS")) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment callback data",
      });
    }

    // Find the medical record with the given orderCode
    const medicalRecord = await MedicalRecord.findOne({ orderCode });
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found for the provided order code",
      });
    }

    // Only update if the current status is not already Paid
    if (medicalRecord.paymentStatus !== "Paid") {
      medicalRecord.paymentStatus = "Paid";
      await medicalRecord.save();
    }

    res.status(200).json({
      success: true,
      message: "Payment successful, medical record updated",
      medicalRecord,
    });
  } catch (error) {
    console.error("Error handling payment success:", error.message);
    res.status(500).json({
      success: false,
      message: "Error processing payment success",
      error: error.message,
    });
  }
};
exports.handlePaymentCancellation = async (req, res) => {
  const { orderCode } = req.query;
  try {
    if (!orderCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment cancellation data",
      });
    }
    const medicalRecord = await MedicalRecord.findOne({ orderCode });
    if (!medicalRecord) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found for the provided order code",
      });
    }
    medicalRecord.paymentStatus = "Unpaid";
    await medicalRecord.save();

    res.status(200).json({
      success: true,
      message: "Payment canceled, medical record updated",
      medicalRecord,
    });
  } catch (error) {
    console.error("Error handling payment cancellation:", error.message);
    res.status(500).json({
      success: false,
      message: "Error processing payment cancellation",
      error: error.message,
    });
  }
};

exports.createAppointment = async (req, res) => {
  const { doctorId, date, shift, reasonForVisit, notes, status } = req.body;

  try {
    const patientId = req.user._id;
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy bác sĩ" });

    // const availableSlot = doctor.schedule.find(
    //   (slot) =>
    //     slot.date.toISOString() === new Date(date).toISOString() &&
    //     slot.shift === shift &&
    //     slot.isAvailable
    // );

    // if (!availableSlot) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Ca làm việc này không khả dụng, vui lòng chọn ca khác",
    //   });
    // }

    const newAppointment = new Appointment({
      doctor: doctorId,
      patient: patientId,
      date,
      shift,
      reasonForVisit,
      notes,
      status,
    });

    await newAppointment.save();

    doctor.appointments.push(newAppointment._id);
    await doctor.save();

    const newMedicalRecord = new MedicalRecord({
      patient: patientId,
      doctor: doctorId,
      appointment: newAppointment._id,
    });

    await newMedicalRecord.save();

    const patient = await User.findById(patientId);
    const doctorUser = await User.findById(doctor.user);

    if (patient && patient.email) {
      const to = patient.email;
      const subject = "Xác nhận lịch hẹn";
      const text = `Chào ${patient.fullName},

Lịch hẹn của bạn với bác sĩ ${doctorUser.fullName} vào ngày ${new Date(
        date
      ).toLocaleDateString()} ca ${shift} đã được đặt thành công.

Lý do khám: ${reasonForVisit}
Ghi chú: ${notes}
Trạng thái:${status}

Cảm ơn bạn,
Tên phòng khám`;

      try {
        await sendEmail(to, subject, text);
      } catch (emailError) {
        console.error("Lỗi khi gửi email:", emailError);
      }
    } else {
      console.error("Không tìm thấy email của bệnh nhân.");
    }

    res.status(201).json({
      success: true,
      message: "Lịch hẹn và hồ sơ bệnh án đã được tạo thành công",
      appointment: newAppointment,
      medicalRecord: newMedicalRecord,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi tạo lịch hẹn và hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.getDoctorMedicalRecords = async (req, res) => {
  try {
    const doctorId = req.user._id; // Lấy ID bác sĩ từ token đã đăng nhập

    // Tìm bác sĩ dựa trên ID của user đã đăng nhập
    const doctor = await Doctor.findOne({ user: doctorId });
    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Bác sĩ không tồn tại" });
    }

    // Tìm tất cả hồ sơ bệnh án có bác sĩ là người đang đăng nhập
    const medicalRecords = await MedicalRecord.find({ doctor: doctorId })
      .populate("patient", "fullName dateOfBirth gender") // Thông tin của bệnh nhân
      .populate({
        path: "appointment",
        match: { doctor: doctorId, status: "Completed" },
        select: "date shift reasonForVisit status", // Thông tin cuộc hẹn liên quan
      })
      .populate("prescribedMedicines.medicine", "name")
      .lean();

    // Lọc ra các hồ sơ có lịch hẹn cụ thể với bác sĩ
    const recordsWithAppointment = medicalRecords.filter(
      (record) =>
        record.appointment && record.appointment.status === "Completed"
    );

    res.status(200).json({
      success: true,
      message: "Lấy hồ sơ bệnh án thành công",
      medicalRecords: recordsWithAppointment,
    });
  } catch (error) {
    console.error("Error in getDoctorMedicalRecords:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.getAllMedicalRecords = async (req, res) => {
  try {
    // Tìm tất cả hồ sơ bệnh án và lấy kèm thông tin bệnh nhân, bác sĩ, cuộc hẹn liên quan
    const medicalRecords = await MedicalRecord.find().populate(
      "patient doctor appointment"
    );

    res.status(200).json({
      success: true,
      message: "Đã lấy tất cả hồ sơ bệnh án",
      medicalRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy hồ sơ bệnh án",
      error: error.message,
    });
  }
};
exports.getUpdatedMedicalRecords = async (req, res) => {
  try {
    // Lấy ID của bệnh nhân hiện tại
    const patientId = req.user._id;

    // Tìm tất cả hồ sơ bệnh án của bệnh nhân, bao gồm thông tin về bác sĩ và cuộc hẹn
    const medicalRecords = await MedicalRecord.find({ patient: patientId })
      .populate({
        path: "doctor",
        model: "User", // giả sử bác sĩ nằm trong bảng User
        select: "fullName",
        match: { role: "doctor" },
      }) // Chỉ lấy thông tin bác sĩ cần thiết
      .populate("appointment", "date startTime endTime")
      .populate("prescribedMedicines.medicine", "name")
      .select(
        "diagnosis treatment notes paymentStatus paymentLink orderCode prescribedMedicines updatedAt" // Bao gồm các trường cần thiết
      )
      .lean();

    // Lọc các hồ sơ bệnh án có thông tin cập nhật từ bác sĩ (ví dụ, có chuẩn đoán và phương pháp điều trị)
    const updatedMedicalRecords = medicalRecords.filter(
      (record) => record.diagnosis || record.treatment || record.notes
    );

    res.status(200).json({
      success: true,
      message: "Đã lấy hồ sơ bệnh án đã cập nhật",
      medicalRecords: updatedMedicalRecords,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy hồ sơ bệnh án",
      error: error.message,
    });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate({
        path: "doctor",
        model: "User",
        select: "fullName email role",
        match: { role: "doctor" },
      })
      .populate("patient", "fullName")
      .lean();

    // Thêm thông tin từ bảng Doctor
    const populatedAppointments = await Promise.all(
      appointments.map(async (appointment) => {
        if (appointment.doctor) {
          const doctorInfo = await Doctor.findOne({
            user: appointment.doctor._id,
          })
            .select("specialty experience qualifications")
            .lean();

          return {
            ...appointment,
            doctor: doctorInfo
              ? {
                  ...appointment.doctor,
                  specialty: doctorInfo.specialty || "Không có chuyên khoa",
                  experience: doctorInfo.experience || 0,
                  qualifications: doctorInfo.qualifications || [],
                }
              : appointment.doctor,
          };
        }
        return appointment;
      })
    );

    res.status(200).json({
      success: true,
      appointments: populatedAppointments,
    });
  } catch (error) {
    console.error("Error in getAppointments:", error);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy lịch hẹn",
      error: error.message,
    });
  }
};

exports.getDoctorAppointments = async (req, res) => {
  try {
    // Lấy `doctorId` từ thông tin user đã đăng nhập (bác sĩ)
    const doctorId = req.user._id;

    // Tìm tất cả lịch hẹn mà bác sĩ là người phụ trách
    const appointments = await Appointment.find({ doctor: doctorId })
      .populate("patient", "fullName phone email") // Lấy thông tin bệnh nhân
      .populate({
        path: "doctor",
        populate: {
          path: "user",
          select: "fullName", // Chỉ lấy thông tin cần thiết của bác sĩ
        },
      });

    // Trả về danh sách các lịch hẹn
    res.status(200).json({
      success: true,
      appointments,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi lấy lịch hẹn của bác sĩ",
      error: error.message,
    });
  }
};

exports.updateAppointmentStatus = async (req, res) => {
  const { appointmentId } = req.params;
  const { status } = req.body;
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      { status },
      { new: true }
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    if (status === "Completed") {
      const existingChat = await Chat.findOne({
        doctorId: appointment.doctor,
        patientId: appointment.patient,
        appointmentId: appointment._id,
      });

      if (!existingChat) {
        const newChat = new Chat({
          doctorId: appointment.doctor,
          patientId: appointment.patient,
          appointmentId: appointment._id,
          messages: [],
        });
        await newChat.save();
      }
    }
    res.status(200).json({
      success: true,
      message: "Trạng thái lịch hẹn đã được cập nhật",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi cập nhật trạng thái lịch hẹn",
      error: error.message,
    });
  }
};

// Hủy lịch hẹn
exports.cancelAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(appointmentId)) {
    return res.status(400).json({
      success: false,
      message: "ID cuộc hẹn không hợp lệ",
    });
  }

  try {
    // Tìm cuộc hẹn theo ID
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Kiểm tra trạng thái cuộc hẹn
    if (appointment.status === "Completed") {
      return res.status(400).json({
        success: false,
        message: "Không thể hủy cuộc hẹn đã hoàn thành",
      });
    }

    // Xóa lịch hẹn khỏi danh sách của bác sĩ
    const doctor = await Doctor.findOne({ user: appointment.doctor });
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy bác sĩ liên quan đến lịch hẹn này",
      });
    }

    // Xóa ID cuộc hẹn khỏi danh sách của bác sĩ
    doctor.appointments = doctor.appointments.filter(
      (id) => !id.equals(appointment._id)
    );

    // Tìm và cập nhật slot trong lịch của bác sĩ thành khả dụng
    const scheduleSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(appointment.date).toISOString() &&
        slot.shift === appointment.shift
    );

    if (scheduleSlot) {
      scheduleSlot.isAvailable = true;
    }

    await doctor.save();

    // Xóa hồ sơ bệnh án liên quan đến cuộc hẹn
    await MedicalRecord.findOneAndDelete({ appointment: appointmentId });

    // Xóa cuộc hẹn
    await Appointment.findByIdAndDelete(appointmentId);

    res.status(200).json({
      success: true,
      message: "Lịch hẹn đã bị hủy thành công",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi hủy lịch hẹn",
      error: error.message,
    });
  }
};

// Dời lịch hẹn (Reschedule)
exports.rescheduleAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { date, shift } = req.body;

  try {
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment)
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy lịch hẹn" });

    const doctor = await Doctor.findById(appointment.doctor);
    const oldSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(appointment.date).toISOString() &&
        slot.shift === appointment.shift
    );

    if (oldSlot) oldSlot.isAvailable = true;

    const newSlot = doctor.schedule.find(
      (slot) =>
        slot.date.toISOString() === new Date(date).toISOString() &&
        slot.shift === shift &&
        slot.isAvailable
    );

    if (!newSlot) {
      return res.status(400).json({
        success: false,
        message: "Ca làm việc mới không khả dụng, vui lòng chọn ca khác",
      });
    }

    appointment.date = date;
    appointment.shift = shift;
    appointment.status = "pending";
    await appointment.save();

    newSlot.isAvailable = false;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Lịch hẹn đã được dời thành công",
      appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi dời lịch hẹn",
      error: error.message,
    });
  }
};

exports.getTopDoctors = async (req, res) => {
  try {
    // Aggregation pipeline
    const topDoctors = await Appointment.aggregate([
      {
        $group: {
          _id: "$doctor", // Group by doctor ID
          appointmentCount: { $sum: 1 }, // Count the number of appointments for each doctor
        },
      },
      {
        $sort: { appointmentCount: -1 }, // Sort by appointment count in descending order
      },
      {
        $limit: 10, // Limit to top 10 doctors
      },
      {
        $lookup: {
          from: "users", // Collection to join (User model)
          localField: "_id", // Field from Appointment
          foreignField: "_id", // Field from User
          as: "userDetails", // Output array
        },
      },
      {
        $unwind: "$userDetails", // Convert array to object
      },
      {
        $match: {
          "userDetails.role": "doctor", // Ensure only doctors are included
        },
      },
      {
        $project: {
          _id: 0, // Exclude MongoDB `_id`
          doctorId: "$_id",
          fullName: "$userDetails.fullName",
          email: "$userDetails.email",
          appointmentCount: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      message: "Thống kê các bác sĩ được đặt nhiều nhất thành công",
      topDoctors,
    });
  } catch (error) {
    console.error("Error in getTopDoctors:", error.message);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thống kê các bác sĩ",
      error: error.message,
    });
  }
};

exports.getAppointmentStats = async (req, res) => {
  try {
    const { period } = req.query; // Lấy khoảng thời gian từ query: "day", "week", "month"

    if (!["day", "week", "month"].includes(period)) {
      return res.status(400).json({
        success: false,
        message:
          "Khoảng thời gian không hợp lệ, hãy chọn 'day', 'week', hoặc 'month'.",
      });
    }

    // Xác định khoảng thời gian bắt đầu và kết thúc
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case "day":
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Bắt đầu ngày
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 1); // Kết thúc ngày
        break;
      case "week":
        const startOfWeek = now.getDate() - now.getDay(); // Bắt đầu tuần
        startDate = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 7); // Kết thúc tuần
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1); // Bắt đầu tháng
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Kết thúc tháng
        break;
    }

    // Aggregation pipeline
    const stats = await Appointment.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      },
      {
        $group: {
          _id: "$date", // Group by date
          appointmentCount: { $sum: 1 }, // Count appointments
          uniquePatients: { $addToSet: "$patient" }, // Collect unique patients
        },
      },
      {
        $project: {
          date: "$_id",
          appointmentCount: 1,
          uniquePatientCount: { $size: "$uniquePatients" }, // Count unique patients
          _id: 0,
        },
      },
      {
        $sort: { date: 1 }, // Sort by date ascending
      },
    ]);

    res.status(200).json({
      success: true,
      message: `Thống kê lịch hẹn trong ${period} thành công`,
      stats,
    });
  } catch (error) {
    console.error("Error in getAppointmentStats:", error.message);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thống kê lịch hẹn",
      error: error.message,
    });
  }
};

exports.getTopDoctorsInMonth = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); // Bắt đầu tháng
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Kết thúc tháng

    // Aggregation pipeline
    const topDoctors = await Appointment.aggregate([
      {
        $match: {
          date: {
            $gte: startOfMonth,
            $lt: endOfMonth,
          },
        },
      },
      {
        $group: {
          _id: "$doctor", // Group by doctor ID
          appointmentCount: { $sum: 1 }, // Count total appointments
        },
      },
      {
        $lookup: {
          from: "users", // Join with User collection
          localField: "_id", // Match with doctor ID
          foreignField: "_id",
          as: "doctorInfo",
        },
      },
      {
        $unwind: "$doctorInfo", // Flatten the doctorInfo array
      },
      {
        $project: {
          _id: 0,
          doctorId: "$_id",
          fullName: "$doctorInfo.fullName",
          email: "$doctorInfo.email",
          appointmentCount: 1,
        },
      },
      {
        $sort: { appointmentCount: -1 }, // Sort by appointment count descending
      },
      {
        $limit: 10, // Limit to top 10 doctors
      },
    ]);

    res.status(200).json({
      success: true,
      message:
        "Thống kê bác sĩ có lượt đặt lịch nhiều nhất trong tháng thành công",
      topDoctors,
    });
  } catch (error) {
    console.error("Error in getTopDoctorsInMonth:", error.message);
    res.status(500).json({
      success: false,
      message: "Đã xảy ra lỗi khi thống kê bác sĩ",
      error: error.message,
    });
  }
};
