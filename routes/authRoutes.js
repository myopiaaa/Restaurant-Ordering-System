const express = require('express');
const router = express.Router();

const {
    ACCOUNTS,
    safeEqual,
    createSession,
    destroySession,
    requireAuth
} = require('../middleware/auth');


router.post('/admin', (req, res) => {
    const { username, password } = req.body || {};
    const admin = ACCOUNTS.admin;

    const validUser = safeEqual(username || '', admin.username);
    const validPass = safeEqual(password || '', admin.password);

    if (!validUser || !validPass) {
        return res.status(401).json({ message: 'Invalid username or password.' });
    }

    res.json({ token: createSession(admin), role: admin.role });
});


router.post('/customer', (req, res) => {
    const customer = ACCOUNTS.customer;
    res.json({ token: createSession(customer), role: customer.role });
});

router.get('/me', requireAuth, (req, res) => {
    res.json({ role: req.user.role, username: req.user.username });
});

router.post('/logout', requireAuth, (req, res) => {
    destroySession(req.user.token);
    res.json({ message: 'Logged out.' });
});

module.exports = router;