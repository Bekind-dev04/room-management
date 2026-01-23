const pool = require('../config/database');

async function check() {
    try {
        const [readings] = await pool.query('SELECT COUNT(*) as count FROM meter_readings');
        console.log('Meter Readings Count:', readings[0].count);

        const [sample] = await pool.query('SELECT * FROM meter_readings LIMIT 5');
        console.log('Sample Readings:', sample);

        const [tenants] = await pool.query('SELECT COUNT(*) as count FROM tenants');
        console.log('Tenants Count:', tenants[0].count);

        const [rooms] = await pool.query('SELECT COUNT(*) as count FROM rooms WHERE is_occupied = 1');
        console.log('Occupied Rooms Count:', rooms[0].count);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
