const crypto = require('crypto');


const sessions = new Map();
const SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours


const ACCOUNTS = {
    admin: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin'
    },
    customer: {
        username: process.env.CUSTOMER_USERNAME || 'customer',
        password: process.env.CUSTOMER_PASSWORD || 'customer123',
        role: 'customer'
    }
};

function safeEqual(a, b) {
    const hashA = crypto.createHash('sha256').update(String(a)).digest();
    const hashB = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(hashA, hashB);
}

function createSession(account) {
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, {
        role: account.role,
        username: account.username,
        expires: Date.now() + SESSION_MS
    });
    return token;
}

function destroySession(token) {
    sessions.delete(token);
}

function getSession(req) {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return null;

    const session = sessions.get(token);
    if (!session) return null;

    if (session.expires < Date.now()) {
        sessions.delete(token);
        return null;
    }
    return { ...session, token };
}

function requireAuth(req, res, next) {
    const session = getSession(req);
    if (!session) {
        return res.status(401).json({ message: 'Please log in first.' });
    }
    req.user = session;
    next();
}


function requireRole(...roles) {
    return (req, res, next) => {
        const session = getSession(req);
        if (!session) {
            return res.status(401).json({ message: 'Please log in first.' });
        }
        if (!roles.includes(session.role)) {
            return res.status(403).json({ message: 'You do not have access to this.' });
        }
        req.user = session;
        next();
    };
}

module.exports = {
    ACCOUNTS,
    safeEqual,
    createSession,
    destroySession,
    getSession,
    requireAuth,
    requireRole
};