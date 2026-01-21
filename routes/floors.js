const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all floors
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM floors ORDER BY sort_order ASC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลชั้นได้' });
    }
});

// Get floor with rooms
router.get('/:id/rooms', async (req, res) => {
    try {
        const [floor] = await db.query('SELECT * FROM floors WHERE id = ?', [req.params.id]);
        if (floor.length === 0) {
            return res.status(404).json({ error: 'ไม่พบชั้นนี้' });
        }
        const [rooms] = await db.query('SELECT * FROM rooms WHERE floor_id = ? ORDER BY room_number ASC', [req.params.id]);
        res.json({ ...floor[0], rooms });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// Create floor
router.post('/', async (req, res) => {
    try {
        const { name, sort_order } = req.body;
        const [result] = await db.query(
            'INSERT INTO floors (name, sort_order) VALUES (?, ?)',
            [name, sort_order || 0]
        );
        res.status(201).json({ id: result.insertId, name, sort_order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถสร้างชั้นได้' });
    }
});

// Update floor
router.put('/:id', async (req, res) => {
    try {
        const { name, sort_order } = req.body;
        await db.query(
            'UPDATE floors SET name = ?, sort_order = ? WHERE id = ?',
            [name, sort_order, req.params.id]
        );
        res.json({ id: req.params.id, name, sort_order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถแก้ไขชั้นได้' });
    }
});

// Delete floor
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM floors WHERE id = ?', [req.params.id]);
        res.json({ message: 'ลบชั้นเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถลบชั้นได้' });
    }
});

module.exports = router;
