const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all settings
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM settings');
        const settings = {};
        rows.forEach(row => {
            settings[row.setting_key] = row.setting_value;
        });
        res.json(settings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลการตั้งค่าได้' });
    }
});

// Update setting
router.put('/:key', async (req, res) => {
    try {
        const { value } = req.body;
        const [existing] = await db.query('SELECT id FROM settings WHERE setting_key = ?', [req.params.key]);

        if (existing.length > 0) {
            await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, req.params.key]);
        } else {
            await db.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [req.params.key, value]);
        }

        res.json({ [req.params.key]: value });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถบันทึกการตั้งค่าได้' });
    }
});

// Bulk update settings
router.post('/bulk', async (req, res) => {
    try {
        const { settings } = req.body;

        for (const [key, value] of Object.entries(settings)) {
            const [existing] = await db.query('SELECT id FROM settings WHERE setting_key = ?', [key]);

            if (existing.length > 0) {
                await db.query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [value, key]);
            } else {
                await db.query('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
            }
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถบันทึกการตั้งค่าได้' });
    }
});

module.exports = router;
