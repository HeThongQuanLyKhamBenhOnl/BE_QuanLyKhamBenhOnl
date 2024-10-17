const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Liên kết với model User để sử dụng thông tin tài khoản
        required: true
    },
    medicalHistory: {
        type: [String], // Danh sách bệnh lý đã từng mắc
        default: []
    },
    allergies: {
        type: [String], // Dị ứng của bệnh nhân
        default: []
    },
    currentMedications: {
        type: [String], // Thuốc hiện tại đang sử dụng
        default: []
    },
    bloodType: {
        type: String, // Nhóm máu của bệnh nhân (A, B, AB, O)
        enum: ['A', 'B', 'AB', 'O'],
        required: true
    },
    emergencyContact: {
        name: {
            type: String,
            required: true
        },
        relationship: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true,
            match: [/^[0-9]{10}$/, 'Please fill a valid phone number'], // Ràng buộc định dạng số điện thoại
        }
    },
    medicalRecords: [{
        doctor: {
            type: mongoose.Schema.Types.ObjectId, // Thêm thông tin bác sĩ lập hồ sơ
            ref: 'Doctor',
            required: true
        },
        diagnosis: {
            type: String, // Chẩn đoán bệnh
            required: true
        },
        treatment: {
            type: String, // Phác đồ điều trị
            required: true
        },
        prescriptions: {
            type: [String], // Đơn thuốc
            default: []
        },
        dateOfRecord: {
            type: Date, // Ngày lập hồ sơ
            default: Date.now
        },
        followUpDate: {
            type: Date, // Ngày tái khám (nếu có)
            default: null
        }
    }],
    appointments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment' // Liên kết với các cuộc hẹn
    }],
    insuranceProvider: {
        type: String, // Nhà cung cấp bảo hiểm y tế
        default: ''
    },
    insuranceNumber: {
        type: String, // Số bảo hiểm y tế
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

patientSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
