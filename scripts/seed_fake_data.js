/**
 * Room Management System - Fake Data Seeder
 * Period: May 2568 - Jan 2569 (BE)
 */

const pool = require('../config/database');

async function seed() {
    console.log('🚀 Starting Data Seeding...');

    try {
        // 1. Get Settings
        const [settingsRows] = await pool.query('SELECT setting_key, setting_value FROM settings');
        const settings = {};
        settingsRows.forEach(row => settings[row.setting_key] = row.setting_value);

        const waterRate = parseFloat(settings.water_rate || 18);
        const electricRate = parseFloat(settings.electric_rate || 8);
        const trashFee = parseFloat(settings.trash_fee || 30);

        // 2. Get Rooms
        const [rooms] = await pool.query('SELECT * FROM rooms');
        if (rooms.length === 0) {
            console.error('❌ No rooms found. Please add floors and rooms first.');
            return;
        }

        // 3. Ensure Tenants exist for each room
        for (const room of rooms) {
            const [tenants] = await pool.query('SELECT id FROM tenants WHERE room_id = ? AND is_active = 1', [room.id]);
            if (tenants.length === 0) {
                const fakeNames = ['สมชาย ใจดี', 'สมศรี มีสุข', 'วิชัย รักรัก', 'นภา แจ่มใส', 'ธนา พารวย'];
                const fakeName = fakeNames[Math.floor(Math.random() * fakeNames.length)] + ' (จำลอง)';
                const [result] = await pool.query(
                    'INSERT INTO tenants (room_id, name, phone, move_in_date, is_active) VALUES (?, ?, ?, ?, ?)',
                    [room.id, fakeName, '0812345678', '2025-01-01', true]
                );
                await pool.query('UPDATE rooms SET is_occupied = 1 WHERE id = ?', [room.id]);
                console.log(`👤 Created tenant for Room ${room.room_number}`);
            }
        }

        // 4. Generate Readings and Bills
        // Months: May 2568 - Jan 2569 (BE) -> 2025-05 to 2026-01 (AD)
        const period = [
            { month: 5, year: 2025 },
            { month: 6, year: 2025 },
            { month: 7, year: 2025 },
            { month: 8, year: 2025 },
            { month: 9, year: 2025 },
            { month: 10, year: 2025 },
            { month: 11, year: 2025 },
            { month: 12, year: 2025 },
            { month: 1, year: 2026 }
        ];

        // Base readings for each room (to ensure continuity)
        const currentReadings = {};

        for (const { month, year } of period) {
            console.log(`📅 Seeding Period: ${month}/${year + 543}`);

            for (const room of rooms) {
                // Get latest reading to continue from
                if (!currentReadings[room.id]) {
                    currentReadings[room.id] = {
                        water: Math.floor(Math.random() * 100),
                        electric: Math.floor(Math.random() * 500)
                    };
                }

                const prevWater = currentReadings[room.id].water;
                const prevElectric = currentReadings[room.id].electric;

                // Add usage
                const waterUnits = Math.floor(Math.random() * 10) + 2; // 2-12 units
                const electricUnits = Math.floor(Math.random() * 150) + 50; // 50-200 units

                const currWater = prevWater + waterUnits;
                const currElectric = prevElectric + electricUnits;

                currentReadings[room.id].water = currWater;
                currentReadings[room.id].electric = currElectric;

                // A. Insert Meter Reading
                try {
                    await pool.query(
                        `INSERT INTO meter_readings (room_id, reading_month, reading_year, water_previous, water_current, electric_previous, electric_current, reading_date) 
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                         ON DUPLICATE KEY UPDATE water_current = VALUES(water_current), electric_current = VALUES(electric_current)`,
                        [room.id, month, year + 543, prevWater, currWater, prevElectric, currElectric, `${year}-${month.toString().padStart(2, '0')}-01`]
                    );
                } catch (e) {
                    console.log(`   Readings update failed for Room ${room.room_number} (Month ${month}): ${e.message}`);
                }

                // B. Generate Bill
                const [tenantRow] = await pool.query('SELECT id FROM tenants WHERE room_id = ? AND is_active = 1', [room.id]);
                if (tenantRow.length > 0) {
                    const tenantId = tenantRow[0].id;
                    const waterAmount = waterUnits * waterRate;
                    const electricAmount = electricUnits * electricRate;
                    const total = room.room_price + waterAmount + electricAmount + trashFee;
                    const invoiceNo = `INV-${(year + 543).toString().substring(2)}${month.toString().padStart(2, '0')}-${room.room_number}`;

                    try {
                        await pool.query(
                            `INSERT INTO bills (invoice_no, room_id, tenant_id, bill_month, bill_year, room_price, water_units, water_rate, water_amount, electric_units, electric_rate, electric_amount, trash_fee, total_amount, is_paid)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                             ON DUPLICATE KEY UPDATE total_amount = VALUES(total_amount)`,
                            [invoiceNo, room.id, tenantId, month, year + 543, room.room_price, waterUnits, waterRate, waterAmount, electricUnits, electricRate, electricAmount, trashFee, total, true]
                        );
                    } catch (e) {
                        console.log(`   Bill update failed for Room ${room.room_number}: ${e.message}`);
                    }
                }
            }
        }

        console.log('✅ Seeding Completed Successfully!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding Failed:', error);
        process.exit(1);
    }
}

seed();
