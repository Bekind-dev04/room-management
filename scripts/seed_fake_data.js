/**
 * Room Management System - Refined Fake Data Seeder v2
 * Period: May 2568 - Jan 2569 (BE)
 * Logic: ONLY generate data for occupied rooms per user request.
 */

const pool = require('../config/database');

const FIRST_NAMES = [
    'สมชาย', 'สมศรี', 'วิชัย', 'นภา', 'ธนา', 'เกียรติ', 'อารี', 'มานะ', 'ชูชาติ', 'ดารณี',
    'ประเสริฐ', 'ประคอง', 'อำนาจ', 'รัตนา', 'ยุพา', 'ศิริ', 'บุญเลิศ', 'นิธิ', 'กมล', 'จินตนา',
    'เกรียงไกร', 'พงษ์ศักดิ์', 'สุรฉัตร', 'กฤษณา', 'วิไลลักษณ์', 'สัญชัย', 'วัฒนา', 'วรรณา', 'สุชาติ', 'นงนุช',
    'อนุสรณ์', 'นฤมล', 'เฉลิม', 'พจนา', 'อภิชาติ', 'เบญจมาศ', 'จรูญ', 'ดวงใจ', 'สุวรรณ', 'มาลี'
];

const LAST_NAMES = [
    'ใจดี', 'มีสุข', 'รักธรรม', 'แจ่มใส', 'พารวย', 'ศรีสุวรรณ', 'วงศ์วาน', 'มั่นคง', 'เรืองรอง', 'นุ่มนวล',
    'ยอดเยี่ยม', 'กล้าหาญ', 'สายชล', 'ทองคำ', 'เจริญสุข', 'บุญชู', 'ดวงดารา', 'สว่างวงศ์', 'สมบัติ', 'ทวีสิน',
    'เกษตรกร', 'ประสิทธิชัย', 'แก้ววิจิตร', 'พินิจกุล', 'พงษ์พานิช', 'เลิศล้ำ', 'ศิริสวัสดิ์', 'นรากูล', 'บุญเหลือ', 'ศิริโรจน์'
];

function getRandomName() {
    const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return `${f} ${l}`;
}

async function seed() {
    console.log('🚀 Starting Refined Data Seeding v2...');

    try {
        // 1. Cleanup
        console.log('🧹 Clearing old data...');
        await pool.query('DELETE FROM bills');
        await pool.query('DELETE FROM meter_readings');
        await pool.query('UPDATE rooms SET is_occupied = 0');
        await pool.query('DELETE FROM tenants');

        // 2. Settings
        const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        settingsRows.forEach(row => settings[row.setting_key] = row.setting_value);

        const waterRate = parseFloat(settings.water_rate || 18);
        const electricRate = parseFloat(settings.electric_rate || 8);
        const trashFee = parseFloat(settings.trash_fee || 30);

        // 3. Rooms
        const [rooms] = await pool.query('SELECT * FROM rooms');
        if (rooms.length === 0) return console.error('❌ No rooms found');

        // 4. Occupancy Logic (65-70%)
        const occupancyRate = 0.65 + (Math.random() * 0.05);
        const targetOccupied = Math.floor(rooms.length * occupancyRate);
        const shuffledRooms = [...rooms].sort(() => Math.random() - 0.5);
        const occupiedRooms = shuffledRooms.slice(0, targetOccupied);

        console.log(`🏠 Occupying ${targetOccupied}/${rooms.length} rooms (~${(occupancyRate * 100).toFixed(1)}%)`);

        const tenantsMap = new Map();
        for (const room of occupiedRooms) {
            const name = getRandomName();
            const [result] = await pool.query(
                'INSERT INTO tenants (room_id, name, phone, move_in_date, is_active) VALUES (?, ?, ?, ?, ?)',
                [room.id, name, `08${Math.floor(10000000 + Math.random() * 90000000)}`, '2025-01-01', true]
            );
            tenantsMap.set(room.id, result.insertId);
            await pool.query('UPDATE rooms SET is_occupied = 1 WHERE id = ?', [room.id]);
        }

        // 5. Generate Data ONLY for Occupied Rooms
        const period = [
            { m: 5, y: 2025 }, { m: 6, y: 2025 }, { m: 7, y: 2025 }, { m: 8, y: 2025 },
            { m: 9, y: 2025 }, { m: 10, y: 2025 }, { m: 11, y: 2025 }, { m: 12, y: 2025 }, { m: 1, y: 2026 }
        ];

        const readingCache = {};

        for (const { m, y } of period) {
            console.log(`📅 Period: ${m}/${y + 543}`);

            for (const room of occupiedRooms) {
                if (!readingCache[room.id]) {
                    readingCache[room.id] = {
                        water: Math.floor(Math.random() * 50),
                        electric: Math.floor(Math.random() * 200)
                    };
                }

                const prevW = readingCache[room.id].water;
                const prevE = readingCache[room.id].electric;
                const waterUsage = Math.floor(Math.random() * 8 + 2);
                const electricUsage = Math.floor(Math.random() * 120 + 30);
                const currW = prevW + waterUsage;
                const currE = prevE + electricUsage;

                readingCache[room.id].water = currW;
                readingCache[room.id].electric = currE;

                // Reading
                await pool.query(
                    `INSERT INTO meter_readings (room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current, reading_date) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [room.id, m, y + 543, prevW, currW, prevE, currE, `${y}-${m.toString().padStart(2, '0')}-01`]
                );

                // Bill
                const tenantId = tenantsMap.get(room.id);
                const invoiceNo = `INV-${(y + 543).toString().substring(2)}${m.toString().padStart(2, '0')}-${room.room_number}`;
                const wAmt = waterUsage * waterRate;
                const eAmt = electricUsage * electricRate;
                const total = room.room_price + wAmt + eAmt + trashFee;

                await pool.query(
                    `INSERT INTO bills (invoice_no, room_id, tenant_id, bill_month, bill_year, room_price, water_units, water_rate, water_amount, electric_units, electric_rate, electric_amount, trash_fee, total_amount, is_paid)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [invoiceNo, room.id, tenantId, m, y + 543, room.room_price, waterUsage, waterRate, wAmt, electricUsage, electricRate, eAmt, trashFee, total, true]
                );
            }
        }

        console.log('✅ Refined Seeding v2 Completed!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

seed();
