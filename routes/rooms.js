const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all rooms
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, f.name as floor_name, t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone
            FROM rooms r
            LEFT JOIN floors f ON r.floor_id = f.id
            LEFT JOIN tenants t ON t.room_id = r.id AND t.is_active = 1
            ORDER BY f.sort_order ASC, r.room_number ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลห้องได้' });
    }
});

// Get room by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, f.name as floor_name, t.id as tenant_id, t.name as tenant_name, t.phone as tenant_phone
            FROM rooms r
            LEFT JOIN floors f ON r.floor_id = f.id
            LEFT JOIN tenants t ON t.room_id = r.id AND t.is_active = 1
            WHERE r.id = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบห้องนี้' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// Create room
router.post('/', async (req, res) => {
    try {
        const {
            floor_id, room_number, room_price,
            water_calculation_type, water_fixed_amount,
            electric_calculation_type, electric_fixed_amount
        } = req.body;

        const [result] = await db.query(
            `INSERT INTO rooms 
            (floor_id, room_number, room_price, water_calculation_type, water_fixed_amount, electric_calculation_type, electric_fixed_amount) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [floor_id, room_number, room_price || 0,
                water_calculation_type || 'unit', water_fixed_amount || 0,
                electric_calculation_type || 'unit', electric_fixed_amount || 0]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error(error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'หมายเลขห้องซ้ำ' });
        } else {
            res.status(500).json({ error: 'ไม่สามารถสร้างห้องได้' });
        }
    }
});

// Update room
router.put('/:id', async (req, res) => {
    try {
        const {
            floor_id, room_number, room_price,
            water_calculation_type, water_fixed_amount,
            electric_calculation_type, electric_fixed_amount,
            is_occupied
        } = req.body;

        await db.query(
            `UPDATE rooms SET 
            floor_id = ?, room_number = ?, room_price = ?,
            water_calculation_type = ?, water_fixed_amount = ?,
            electric_calculation_type = ?, electric_fixed_amount = ?,
            is_occupied = ?
            WHERE id = ?`,
            [floor_id, room_number, room_price,
                water_calculation_type, water_fixed_amount,
                electric_calculation_type, electric_fixed_amount,
                is_occupied, req.params.id]
        );
        res.json({ id: req.params.id, ...req.body });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถแก้ไขห้องได้' });
    }
});

// Delete room
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
        res.json({ message: 'ลบห้องเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถลบห้องได้' });
    }
});

module.exports = router;
