const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'room-management-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 15 * 60 * 1000 // 15 minutes session
    }
}));

// Auth Middlewares
const checkAuth = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        if (req.xhr || req.path.startsWith('/api/')) {
            res.status(401).json({ error: 'Unauthorized' });
        } else {
            res.redirect('/login.html');
        }
    }
};

// Public Routes
app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/auth/login', (req, res) => {
    const { password } = req.body;
    if (password === process.env.APP_PASSWORD) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'รหัสผ่านไม่ถูกต้อง' });
    }
});

app.get('/api/auth/check', (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
});

app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Protect all other routes
app.use('/uploads', checkAuth, express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// Routes
const apiRouter = express.Router();
apiRouter.use('/floors', require('./routes/floors'));
apiRouter.use('/rooms', require('./routes/rooms'));
apiRouter.use('/meters', require('./routes/meters'));
apiRouter.use('/bills', require('./routes/bills'));
apiRouter.use('/tenants', require('./routes/tenants'));
apiRouter.use('/settings', require('./routes/settings'));

// API Protection
app.use('/api', (req, res, next) => {
    if (req.path.startsWith('/auth/')) return next();
    checkAuth(req, res, next);
});
app.use('/api', apiRouter);

// Static Protection
app.use('/uploads', checkAuth, express.static(path.join(__dirname, 'uploads')));
app.use('/', (req, res, next) => {
    if (req.path === '/login.html') return next();
    checkAuth(req, res, next);
});
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all other routes (SPA)
app.get('*', checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' });
});

app.listen(PORT, () => {
    console.log(`🏠 Room Management Server running at http://localhost:${PORT}`);
});
