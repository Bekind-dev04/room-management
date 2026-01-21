const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Generate bills for a month
router.get('/generate/:month/:year', async (req, res) => {
    try {
        const { month, year } = req.params;

        // Get settings
        const [settings] = await db.query('SELECT * FROM settings');
        const settingsMap = {};
        settings.forEach(s => settingsMap[s.setting_key] = s.setting_value);
        const waterRate = parseFloat(settingsMap.water_rate) || 18;
        const electricRate = parseFloat(settingsMap.electric_rate) || 8;

        // Get rooms with meter readings
        const [rooms] = await db.query(`
            SELECT 
                r.id as room_id, r.room_number, r.room_price,
                r.water_calculation_type, r.water_fixed_amount,
                r.electric_calculation_type, r.electric_fixed_amount,
                f.name as floor_name,
                m.water_previous, m.water_current, m.water_units,
                m.electric_previous, m.electric_current, m.electric_units,
                t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone
            FROM rooms r
            JOIN floors f ON r.floor_id = f.id
            LEFT JOIN meter_readings m ON r.id = m.room_id 
                AND m.reading_month = ? AND m.reading_year = ?
            LEFT JOIN tenants t ON t.room_id = r.id AND t.is_active = 1
            WHERE m.id IS NOT NULL OR r.is_occupied = 1
            ORDER BY f.sort_order ASC, r.room_number ASC
        `, [month, year]);

        const bills = rooms.map(room => {
            // Calculate water
            let waterAmount = 0;
            let waterUnits = room.water_units || 0;
            if (room.water_calculation_type === 'fixed') {
                waterAmount = room.water_fixed_amount;
            } else {
                waterAmount = waterUnits * waterRate;
            }

            // Calculate electric
            let electricAmount = 0;
            let electricUnits = room.electric_units || 0;
            if (room.electric_calculation_type === 'fixed') {
                electricAmount = room.electric_fixed_amount;
            } else {
                electricAmount = electricUnits * electricRate;
            }

            const total = (room.room_price || 0) + waterAmount + electricAmount;

            return {
                room_id: room.room_id,
                room_number: room.room_number,
                floor_name: room.floor_name,
                tenant_name: room.tenant_name || '-',
                tenant_phone: room.tenant_phone || '-',
                room_price: room.room_price,
                water_previous: room.water_previous,
                water_current: room.water_current,
                water_units: waterUnits,
                water_rate: room.water_calculation_type === 'unit' ? waterRate : null,
                water_amount: waterAmount,
                water_type: room.water_calculation_type,
                electric_previous: room.electric_previous,
                electric_current: room.electric_current,
                electric_units: electricUnits,
                electric_rate: room.electric_calculation_type === 'unit' ? electricRate : null,
                electric_amount: electricAmount,
                electric_type: room.electric_calculation_type,
                total_amount: total,
                bill_month: parseInt(month),
                bill_year: parseInt(year)
            };
        });

        res.json(bills);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถสร้างบิลได้' });
    }
});

// Get saved bills
router.get('/:month/:year', async (req, res) => {
    try {
        const { month, year } = req.params;
        const [rows] = await db.query(`
            SELECT b.*, r.room_number, f.name as floor_name, t.name as tenant_name
            FROM bills b
            JOIN rooms r ON b.room_id = r.id
            JOIN floors f ON r.floor_id = f.id
            LEFT JOIN tenants t ON b.tenant_id = t.id
            WHERE b.bill_month = ? AND b.bill_year = ?
            ORDER BY f.sort_order ASC, r.room_number ASC
        `, [month, year]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลบิลได้' });
    }
});

// Save bill
router.post('/', async (req, res) => {
    try {
        const {
            room_id, tenant_id, bill_month, bill_year,
            room_price, water_units, water_rate, water_amount,
            electric_units, electric_rate, electric_amount,
            other_amount, other_description, total_amount
        } = req.body;

        const [existing] = await db.query(
            'SELECT id FROM bills WHERE room_id = ? AND bill_month = ? AND bill_year = ?',
            [room_id, bill_month, bill_year]
        );

        if (existing.length > 0) {
            await db.query(
                `UPDATE bills SET 
                tenant_id = ?, room_price = ?, water_units = ?, water_rate = ?, water_amount = ?,
                electric_units = ?, electric_rate = ?, electric_amount = ?,
                other_amount = ?, other_description = ?, total_amount = ?
                WHERE id = ?`,
                [tenant_id, room_price, water_units, water_rate, water_amount,
                    electric_units, electric_rate, electric_amount,
                    other_amount, other_description, total_amount, existing[0].id]
            );
            res.json({ id: existing[0].id, updated: true });
        } else {
            const [result] = await db.query(
                `INSERT INTO bills 
                (room_id, tenant_id, bill_month, bill_year, room_price, water_units, water_rate, water_amount,
                 electric_units, electric_rate, electric_amount, other_amount, other_description, total_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [room_id, tenant_id, bill_month, bill_year, room_price, water_units, water_rate, water_amount,
                    electric_units, electric_rate, electric_amount, other_amount, other_description, total_amount]
            );
            res.status(201).json({ id: result.insertId, created: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถบันทึกบิลได้' });
    }
});

// Mark bill as paid
router.put('/:id/pay', async (req, res) => {
    try {
        await db.query(
            'UPDATE bills SET is_paid = 1, paid_date = CURDATE() WHERE id = ?',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถอัพเดทสถานะได้' });
    }
});

module.exports = router;
