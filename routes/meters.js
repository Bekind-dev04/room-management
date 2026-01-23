const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get meter readings by month/year
router.get('/:month/:year', async (req, res) => {
    try {
        const { month, year } = req.params;
        const [rows] = await db.query(`
            SELECT m.*, r.room_number, f.name as floor_name, f.id as floor_id
            FROM meter_readings m
            JOIN rooms r ON m.room_id = r.id
            JOIN floors f ON r.floor_id = f.id
            WHERE m.reading_month = ? AND m.reading_year = ?
            ORDER BY f.sort_order ASC, r.room_number ASC
        `, [month, year]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลมิเตอร์ได้' });
    }
});

// Get rooms with latest meter reading for a month
router.get('/rooms/:month/:year', async (req, res) => {
    try {
        const { month, year } = req.params;
        const prevMonth = month == 1 ? 12 : parseInt(month) - 1;
        const prevYear = month == 1 ? parseInt(year) - 1 : parseInt(year);

        const [rows] = await db.query(`
            SELECT 
                r.id as room_id, r.room_number, r.room_price, r.is_occupied,
                r.water_calculation_type, r.water_fixed_amount,
                r.electric_calculation_type, r.electric_fixed_amount,
                f.id as floor_id, f.name as floor_name,
                curr.water_previous, curr.water_current, curr.electric_previous, curr.electric_current,
                curr.id as reading_id,
                prev.water_current as prev_water, prev.electric_current as prev_electric
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            LEFT JOIN meter_readings curr ON r.id = curr.room_id 
                AND curr.reading_month = ? AND curr.reading_year = ?
            LEFT JOIN meter_readings prev ON prev.id = (
                SELECT id FROM meter_readings pm
                WHERE pm.room_id = r.id 
                AND (pm.reading_year < ? OR (pm.reading_year = ? AND pm.reading_month < ?))
                AND (pm.water_current > 0 OR pm.electric_current > 0)
                ORDER BY pm.reading_year DESC, pm.reading_month DESC
                LIMIT 1
            )
            ORDER BY f.sort_order ASC, r.room_number ASC
        `, [month, year, year, year, month]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// Save meter reading (upsert)
router.post('/', async (req, res) => {
    try {
        const { room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current } = req.body;

        const [existing] = await db.query(
            'SELECT id FROM meter_readings WHERE room_id = ? AND reading_month = ? AND reading_year = ?',
            [room_id, reading_month, reading_year]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE meter_readings SET 
                water_previous = ?, water_current = ?, 
                electric_previous = ?, electric_current = ?,
                reading_date = CURDATE()
                WHERE id = ?`,
                [water_previous, water_current, electric_previous, electric_current, existing[0].id]
            );
            res.json({ id: existing[0].id, updated: true });
        } else {
            const [result] = await db.query(
                `INSERT INTO meter_readings 
                (room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current, reading_date) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
                [room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current]
            );
            res.status(201).json({ id: result.insertId, created: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถบันทึกมิเตอร์ได้' });
    }
});

// Bulk save meter readings
router.post('/bulk', async (req, res) => {
    try {
        const { readings } = req.body;
        const results = [];

        for (const reading of readings) {
            const { room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current } = reading;

            const [existing] = await db.query(
                'SELECT id FROM meter_readings WHERE room_id = ? AND reading_month = ? AND reading_year = ?',
                [room_id, reading_month, reading_year]
            );

            if (existing.length > 0) {
                await db.query(
                    `UPDATE meter_readings SET 
                    water_previous = ?, water_current = ?, 
                    electric_previous = ?, electric_current = ?,
                    reading_date = CURDATE()
                    WHERE id = ?`,
                    [water_previous, water_current, electric_previous, electric_current, existing[0].id]
                );
                results.push({ room_id, updated: true });
            } else {
                const [result] = await db.query(
                    `INSERT INTO meter_readings 
                    (room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current, reading_date) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())`,
                    [room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current]
                );
                results.push({ room_id, created: true, id: result.insertId });
            }
        }

        res.json({ success: true, results });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถบันทึกมิเตอร์ได้' });
    }
});

module.exports = router;
