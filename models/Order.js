
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Served'],
        default: 'Pending'
    },
    servedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Order', orderSchema, 'orders');
