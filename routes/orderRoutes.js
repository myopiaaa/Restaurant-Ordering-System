
const express = require('express');
const router = express.Router();

const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const MenuItem = require('../models/MenuItem');

router.get('/', async (req, res) => {
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

router.post('/', async (req, res) => {
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

router.put('/:id/serve', async (req, res) => {
    try {
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'Served' },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                message: 'Order not found.'
            });
        }

        res.json({
            message: 'Order marked as served!',
            order: updatedOrder
        });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

router.get('/sales/daily', async (req, res) => {
    try {
        const now = new Date();

        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);

        const sales = await Order.aggregate([
            {
                $match: {
                    status: 'Served',
                    createdAt: {
                        $gte: startOfDay,
                        $lte: endOfDay
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$totalAmount' },
                    totalOrders: { $sum: 1 }
                }
            }
        ]);

        res.json({
            date: now.toLocaleDateString(),
            totalSales: sales.length > 0 ? sales[0].totalSales : 0,
            totalOrders: sales.length > 0 ? sales[0].totalOrders : 0
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
