const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

// Setup multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads', 'tenants');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('รองรับเฉพาะไฟล์ JPG, PNG, PDF'));
        }
    }
});

// Get all tenants
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, r.room_number, f.name as floor_name
            FROM tenants t
            LEFT JOIN rooms r ON t.room_id = r.id
            LEFT JOIN floors f ON r.floor_id = f.id
            ORDER BY t.is_active DESC, t.name ASC
        `);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลผู้เช่าได้' });
    }
});

// Get tenant by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT t.*, r.room_number, f.name as floor_name
            FROM tenants t
            LEFT JOIN rooms r ON t.room_id = r.id
            LEFT JOIN floors f ON r.floor_id = f.id
            WHERE t.id = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'ไม่พบผู้เช่านี้' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถดึงข้อมูลได้' });
    }
});

// Create tenant
router.post('/', async (req, res) => {
    try {
        const { room_id, name, phone, id_number, address, move_in_date } = req.body;

        const [result] = await db.query(
            `INSERT INTO tenants (room_id, name, phone, id_number, address, move_in_date) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [room_id || null, name, phone, id_number, address, move_in_date || null]
        );

        // Update room occupied status
        if (room_id) {
            await db.query('UPDATE rooms SET is_occupied = 1 WHERE id = ?', [room_id]);
        }

        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถเพิ่มผู้เช่าได้' });
    }
});

// Update tenant
router.put('/:id', async (req, res) => {
    try {
        const { room_id, name, phone, id_number, address, move_in_date, move_out_date, is_active } = req.body;

        // Get old room_id
        const [oldTenant] = await db.query('SELECT room_id FROM tenants WHERE id = ?', [req.params.id]);
        const oldRoomId = oldTenant[0]?.room_id;

        await db.query(
            `UPDATE tenants SET 
            room_id = ?, name = ?, phone = ?, id_number = ?, address = ?, 
            move_in_date = ?, move_out_date = ?, is_active = ?
            WHERE id = ?`,
            [room_id || null, name, phone, id_number, address, move_in_date, move_out_date, is_active, req.params.id]
        );

        // Update room occupied status
        if (oldRoomId && oldRoomId !== room_id) {
            await db.query('UPDATE rooms SET is_occupied = 0 WHERE id = ?', [oldRoomId]);
        }
        if (room_id && is_active) {
            await db.query('UPDATE rooms SET is_occupied = 1 WHERE id = ?', [room_id]);
        }
        if (room_id && !is_active) {
            await db.query('UPDATE rooms SET is_occupied = 0 WHERE id = ?', [room_id]);
        }

        res.json({ id: req.params.id, ...req.body });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถแก้ไขข้อมูลได้' });
    }
});

// Upload files
router.post('/:id/upload', upload.fields([
    { name: 'id_card', maxCount: 1 },
    { name: 'contract', maxCount: 1 }
]), async (req, res) => {
    try {
        const updates = [];
        const values = [];

        if (req.files.id_card) {
            updates.push('id_card_image = ?');
            values.push('/uploads/tenants/' + req.files.id_card[0].filename);
        }
        if (req.files.contract) {
            updates.push('contract_image = ?');
            values.push('/uploads/tenants/' + req.files.contract[0].filename);
        }

        if (updates.length > 0) {
            values.push(req.params.id);
            await db.query(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({
            success: true,
            id_card_image: req.files.id_card ? '/uploads/tenants/' + req.files.id_card[0].filename : null,
            contract_image: req.files.contract ? '/uploads/tenants/' + req.files.contract[0].filename : null
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถอัพโหลดไฟล์ได้' });
    }
});

// Delete tenant
router.delete('/:id', async (req, res) => {
    try {
        const [tenant] = await db.query('SELECT room_id FROM tenants WHERE id = ?', [req.params.id]);
        await db.query('DELETE FROM tenants WHERE id = ?', [req.params.id]);

        // Update room occupied status
        if (tenant[0]?.room_id) {
            await db.query('UPDATE rooms SET is_occupied = 0 WHERE id = ?', [tenant[0].room_id]);
        }

        res.json({ message: 'ลบผู้เช่าเรียบร้อย' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'ไม่สามารถลบผู้เช่าได้' });
    }
});

module.exports = router;
