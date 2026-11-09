
const express = require('express');
const router = express.Router();

const { requireRole } = require('../middleware/auth');

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const MenuItem = require('../models/MenuItem');

router.get('/', requireRole('admin'), async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });

        const ordersWithItems = await Promise.all(
            orders.map(async (order) => {
                const items = await OrderItem.find({
                    orderId: order._id
                });

                return {
                    ...order.toObject(),
                    items
                };
            })
        );

        res.json(ordersWithItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/', requireRole('admin', 'customer'), async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: 'Please add at least one item.'
            });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const menuItem = await MenuItem.findById(item.menuItemId);

            if (!menuItem || !menuItem.available) {
                return res.status(400).json({
                    message: 'A menu item is unavailable or does not exist.'
                });
            }

            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({
                    message: 'Quantity must be a positive whole number.'
                });
            }

            const subtotal = menuItem.price * quantity;

            totalAmount += subtotal;

            orderItems.push({
                menuItemId: menuItem._id,
                itemName: menuItem.name,
                price: menuItem.price,
                quantity,
                subtotal
            });
        }

        const newOrder = new Order({
            totalAmount,
            status: 'Pending'
        });

        const savedOrder = await newOrder.save();

        const itemsToSave = orderItems.map((item) => ({
            ...item,
            orderId: savedOrder._id
        }));

        await OrderItem.insertMany(itemsToSave);

        const savedItems = await OrderItem.find({
            orderId: savedOrder._id
        });

        res.status(201).json({
            message: 'Order created successfully!',
            order: savedOrder,
            items: savedItems
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.put('/:id', requireRole('admin'), async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status: 'Served',
                servedAt: new Date()
            },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({
                message: 'Order not found'
            });
        }

        res.json(order);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

router.get('/sales/daily', requireRole('admin'), async (req, res) => {
    try {
        const date = req.query.date;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                message: 'Please provide a valid date.'
            });
        }

        const startDate = new Date(`${date}T00:00:00`);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);

        const result = await Order.aggregate([
            {
                $match: {
                    status: 'Served',
                    servedAt: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        res.json({
            totalSales: result.length > 0
                ? result[0].totalSales
                : 0,
            orderCount: result.length > 0
                ? result[0].orderCount
                : 0
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
});

module.exports = router;
