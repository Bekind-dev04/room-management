const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const floorsRoutes = require('./routes/floors');
const roomsRoutes = require('./routes/rooms');
const metersRoutes = require('./routes/meters');
const billsRoutes = require('./routes/bills');
const tenantsRoutes = require('./routes/tenants');
const settingsRoutes = require('./routes/settings');

app.use('/api/floors', floorsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/meters', metersRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/tenants', tenantsRoutes);
app.use('/api/settings', settingsRoutes);

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
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
