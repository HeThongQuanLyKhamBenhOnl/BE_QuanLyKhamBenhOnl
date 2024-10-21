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
            type: Date,
            required: true
        },
        startTime: {
            type: String, 
            required: true
        },
        endTime: {
            type: String, 
            required: true
        },
        isAvailable: {
            type: Boolean, 
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
