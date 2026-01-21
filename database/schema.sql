-- Room Management System Database Schema
-- MariaDB/MySQL

CREATE DATABASE IF NOT EXISTS room_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE room_management;

-- ตารางตั้งค่าระบบ
CREATE TABLE settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(50) NOT NULL UNIQUE,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ค่าเริ่มต้น
INSERT INTO settings (setting_key, setting_value) VALUES
('water_rate', '18'),
('electric_rate', '8'),
('default_calculation_type', 'unit');

-- ตารางชั้น
CREATE TABLE floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ตารางห้อง
CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_id INT NOT NULL,
    room_number VARCHAR(20) NOT NULL,
    room_price DECIMAL(10,2) DEFAULT 0,
    water_calculation_type ENUM('unit', 'fixed') DEFAULT 'unit',
    water_fixed_amount DECIMAL(10,2) DEFAULT 0,
    electric_calculation_type ENUM('unit', 'fixed') DEFAULT 'unit',
    electric_fixed_amount DECIMAL(10,2) DEFAULT 0,
    is_occupied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_room (floor_id, room_number)
);

-- ตารางผู้เช่า
CREATE TABLE tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    id_number VARCHAR(20),
    address TEXT,
    id_card_image VARCHAR(255),
    contract_image VARCHAR(255),
    move_in_date DATE,
    move_out_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- ตารางบันทึกมิเตอร์
CREATE TABLE meter_readings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    reading_month INT NOT NULL,
    reading_year INT NOT NULL,
    water_previous DECIMAL(10,2) DEFAULT 0,
    water_current DECIMAL(10,2) DEFAULT 0,
    water_units DECIMAL(10,2) GENERATED ALWAYS AS (water_current - water_previous) STORED,
    electric_previous DECIMAL(10,2) DEFAULT 0,
    electric_current DECIMAL(10,2) DEFAULT 0,
    electric_units DECIMAL(10,2) GENERATED ALWAYS AS (electric_current - electric_previous) STORED,
    reading_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    UNIQUE KEY unique_reading (room_id, reading_month, reading_year)
);

-- ตารางบิล
CREATE TABLE bills (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    tenant_id INT,
    bill_month INT NOT NULL,
    bill_year INT NOT NULL,
    room_price DECIMAL(10,2) DEFAULT 0,
    water_units DECIMAL(10,2) DEFAULT 0,
    water_rate DECIMAL(10,2) DEFAULT 0,
    water_amount DECIMAL(10,2) DEFAULT 0,
    electric_units DECIMAL(10,2) DEFAULT 0,
    electric_rate DECIMAL(10,2) DEFAULT 0,
    electric_amount DECIMAL(10,2) DEFAULT 0,
    other_amount DECIMAL(10,2) DEFAULT 0,
    other_description TEXT,
    total_amount DECIMAL(10,2) DEFAULT 0,
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    UNIQUE KEY unique_bill (room_id, bill_month, bill_year)
);

-- ข้อมูลตัวอย่าง
INSERT INTO floors (name, sort_order) VALUES 
('ชั้น 1', 1),
('ชั้น 2', 2),
('ชั้น 3', 3);

INSERT INTO rooms (floor_id, room_number, room_price) VALUES
(1, '101', 3500),
(1, '102', 3500),
(1, '103', 3500),
(2, '201', 4000),
(2, '202', 4000),
(2, '203', 4000),
(3, '301', 4500),
(3, '302', 4500),
(3, '303', 4500);
