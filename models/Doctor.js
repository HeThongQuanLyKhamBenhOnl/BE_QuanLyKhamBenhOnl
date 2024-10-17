const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    specialty: {
        type: String,
        required: true
    },
    experience: {
        type: Number,
        required: true,
        min: 0
    },
    qualifications: {
        type: [String],
        default: []
    },
    schedule: [{
        date: {
            type: Date, // Ngày cụ thể cho lịch làm việc (ví dụ: 2024-10-15)
            required: true
        },
        startTime: {
            type: String, // Giờ bắt đầu làm việc (ví dụ: '08:00')
            required: true
        },
        endTime: {
            type: String, // Giờ kết thúc làm việc (ví dụ: '16:00')
            required: true
        },
        isAvailable: {
            type: Boolean, // Bác sĩ có sẵn sàng làm việc không vào ngày cụ thể đó
            default: true
        }
    }],
    patients: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Patient'
    }],
    appointments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

doctorSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Doctor = mongoose.model('Doctor', doctorSchema);

module.exports = Doctor;
