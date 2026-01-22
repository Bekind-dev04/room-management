// ============================================
// Room Management System - Main Application
// ============================================

const API_BASE = '/api';
let currentPage = 'rooms';
let floorsData = [];
let roomsData = [];
let tenantsData = [];
let settings = {};

// ============ Initialization ============
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    // Check Auth
    await checkAuthStatus();

    // Set current date
    updateCurrentDate();

    // Setup navigation
    setupNavigation();

    // Setup year selectors
    setupYearSelectors();

    // Setup Inactivity Timer
    setupInactivityTimer();

    // Set current month
    const now = new Date();
    document.getElementById('meter-month').value = now.getMonth() + 1;
    document.getElementById('bill-month').value = now.getMonth() + 1;

    // Load initial data
    await loadSettings();
    await loadFloorsAndRooms();
}

let inactivityTimeout;
function setupInactivityTimer() {
    const resetTimer = () => {
        clearTimeout(inactivityTimeout);
        inactivityTimeout = setTimeout(logout, 15 * 60 * 1000); // 15 minutes
    };

    // Events that reset the timer
    window.onload = resetTimer;
    window.onmousemove = resetTimer;
    window.onmousedown = resetTimer;
    window.ontouchstart = resetTimer;
    window.onclick = resetTimer;
    window.onkeydown = resetTimer;
}

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/auth/check');
        const data = await res.json();
        if (!data.authenticated) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        window.location.href = '/login.html';
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login.html';
    } catch (error) {
        window.location.href = '/login.html';
    }
}

function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = now.toLocaleDateString('th-TH', options);
}

function setupNavigation() {
    // Nav Items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.classList.contains('logout-link')) return; // Let logout handle itself

            e.preventDefault();
            const page = item.dataset.page;
            navigateTo(page);

            // Close sidebar on mobile
            if (window.innerWidth <= 1024) {
                toggleSidebar(false);
            }
        });
    });

    // Mobile Menu Toggles
    const mobileBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('sidebar-overlay');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => toggleSidebar(true));
    }

    if (overlay) {
        overlay.addEventListener('click', () => toggleSidebar(false));
    }
}

function toggleSidebar(show) {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    if (show) {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    } else {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

function navigateTo(page) {
    // Update nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    // Update pages
    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `page-${page}`);
    });

    currentPage = page;

    // Load page-specific data
    switch (page) {
        case 'rooms':
            loadFloorsAndRooms();
            break;
        case 'meters':
            // Data loaded on button click
            break;
        case 'bills':
            // Data loaded on button click
            break;
        case 'tenants':
            loadTenants();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

function setupYearSelectors() {
    const currentYear = new Date().getFullYear() + 543; // Buddhist year
    const meterYear = document.getElementById('meter-year');
    const billYear = document.getElementById('bill-year');

    for (let y = currentYear; y >= currentYear - 5; y--) {
        meterYear.innerHTML += `<option value="${y - 543}">${y}</option>`;
        billYear.innerHTML += `<option value="${y - 543}">${y}</option>`;
    }
}

// ============ API Helpers ============
async function apiGet(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (res.status === 401) window.location.href = '/login.html';
    if (!res.ok) throw new Error('API Error');
    return res.json();
}

async function apiPost(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.status === 401) window.location.href = '/login.html';
    if (!res.ok) throw new Error('API Error');
    return res.json();
}

async function apiPut(endpoint, data) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.status === 401) window.location.href = '/login.html';
    if (!res.ok) throw new Error('API Error');
    return res.json();
}

async function apiDelete(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE' });
    if (res.status === 401) window.location.href = '/login.html';
    if (!res.ok) throw new Error('API Error');
    return res.json();
}

// ============ Settings ============
async function loadSettings() {
    try {
        settings = await apiGet('/settings');
        document.getElementById('setting-water-rate').value = settings.water_rate || 18;
        document.getElementById('setting-electric-rate').value = settings.electric_rate || 8;
        document.getElementById('setting-trash-fee').value = settings.trash_fee || 30;
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    try {
        const water_rate = document.getElementById('setting-water-rate').value;
        const electric_rate = document.getElementById('setting-electric-rate').value;
        const trash_fee = document.getElementById('setting-trash-fee').value;

        await apiPost('/settings/bulk', {
            settings: { water_rate, electric_rate, trash_fee }
        });

        settings.water_rate = water_rate;
        settings.electric_rate = electric_rate;
        settings.trash_fee = trash_fee;

        showToast('บันทึกการตั้งค่าเรียบร้อย', 'success');
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

// ============ Floors & Rooms ============
async function loadFloorsAndRooms() {
    try {
        floorsData = await apiGet('/floors');
        roomsData = await apiGet('/rooms');
        renderFloorsAndRooms();
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('floors-container').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>ไม่สามารถโหลดข้อมูลได้</h3>
                <p>กรุณาตรวจสอบการเชื่อมต่อฐานข้อมูล</p>
            </div>
        `;
    }
}

function renderFloorsAndRooms() {
    const container = document.getElementById('floors-container');

    if (floorsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-building"></i>
                <h3>ยังไม่มีข้อมูลชั้น</h3>
                <p>คลิก "เพิ่มชั้น" เพื่อเริ่มต้นใช้งาน</p>
            </div>
        `;
        return;
    }

    container.innerHTML = floorsData.map(floor => {
        const floorRooms = roomsData.filter(r => r.floor_id === floor.id);
        return `
            <div class="floor-card" data-floor-id="${floor.id}">
                <div class="floor-header">
                    <div class="floor-name">
                        <i class="fas fa-layer-group"></i>
                        ${floor.name}
                    </div>
                    <div class="floor-actions">
                        <button class="btn btn-sm btn-primary" onclick="showAddRoomModal(${floor.id}, '${floor.name}')">
                            <i class="fas fa-plus"></i> เพิ่มห้อง
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="showEditFloorModal(${floor.id}, '${floor.name}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteFloor(${floor.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="rooms-grid">
                    ${floorRooms.length === 0 ?
                '<div class="empty-state"><p>ยังไม่มีห้องในชั้นนี้</p></div>' :
                floorRooms.map(room => `
                            <div class="room-card ${room.is_occupied ? 'occupied' : 'empty'}" onclick="showRoomDetail(${room.id})">
                                <div class="room-status ${room.is_occupied ? 'occupied' : 'empty'}"></div>
                                <div class="room-number">${room.room_number}</div>
                                <div class="room-price">฿${formatNumber(room.room_price)}/เดือน</div>
                                ${room.tenant_name ?
                        `<div class="room-tenant"><i class="fas fa-user"></i> ${room.tenant_name}</div>` :
                        `<div class="room-tenant"><i class="fas fa-user-slash"></i> ว่าง</div>`
                    }
                            </div>
                        `).join('')
            }
                </div>
            </div>
        `;
    }).join('');
}

// Floor Modals
function showAddFloorModal() {
    openModal('เพิ่มชั้นใหม่', `
        <form id="add-floor-form" onsubmit="submitAddFloor(event)">
            <div class="form-group">
                <label>ชื่อชั้น</label>
                <input type="text" class="form-control" name="name" placeholder="เช่น ชั้น 1, อาคาร A" required>
            </div>
            <div class="form-group">
                <label>ลำดับการแสดง</label>
                <input type="number" class="form-control" name="sort_order" value="${floorsData.length + 1}" min="1">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `);
}

async function submitAddFloor(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        sort_order: parseInt(form.sort_order.value) || 0
    };

    try {
        await apiPost('/floors', data);
        closeModal();
        showToast('เพิ่มชั้นเรียบร้อย', 'success');
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

function showEditFloorModal(id, name) {
    const floor = floorsData.find(f => f.id === id);
    openModal('แก้ไขชั้น', `
        <form id="edit-floor-form" onsubmit="submitEditFloor(event, ${id})">
            <div class="form-group">
                <label>ชื่อชั้น</label>
                <input type="text" class="form-control" name="name" value="${floor.name}" required>
            </div>
            <div class="form-group">
                <label>ลำดับการแสดง</label>
                <input type="number" class="form-control" name="sort_order" value="${floor.sort_order}" min="1">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `);
}

async function submitEditFloor(e, id) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        sort_order: parseInt(form.sort_order.value) || 0
    };

    try {
        await apiPut(`/floors/${id}`, data);
        closeModal();
        showToast('แก้ไขเรียบร้อย', 'success');
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

async function deleteFloor(id) {
    if (!confirm('ต้องการลบชั้นนี้ใช่หรือไม่? ห้องทั้งหมดในชั้นนี้จะถูกลบด้วย')) return;

    try {
        await apiDelete(`/floors/${id}`);
        showToast('ลบชั้นเรียบร้อย', 'success');
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

// Room Modals
function showAddRoomModal(floorId, floorName) {
    openModal(`เพิ่มห้องใน ${floorName}`, `
        <form id="add-room-form" onsubmit="submitAddRoom(event, ${floorId})">
            <div class="form-group">
                <label>หมายเลขห้อง</label>
                <input type="text" class="form-control" name="room_number" placeholder="เช่น 101, A-01" required>
            </div>
            <div class="form-group">
                <label>ค่าเช่าห้อง (บาท/เดือน)</label>
                <input type="number" class="form-control" name="room_price" value="3000" min="0" step="100">
            </div>
            <div class="form-group">
                <label>การคำนวณค่าน้ำ</label>
                <select class="form-control" name="water_calculation_type" onchange="toggleWaterFixed(this.value)">
                    <option value="unit">ตามหน่วย (Unit)</option>
                    <option value="fixed">เหมาจ่าย (Fixed)</option>
                </select>
            </div>
            <div class="form-group" id="water-fixed-group" style="display:none;">
                <label>ค่าน้ำเหมาจ่าย (บาท)</label>
                <input type="number" class="form-control" name="water_fixed_amount" value="100" min="0">
            </div>
            <div class="form-group">
                <label>การคำนวณค่าไฟ</label>
                <select class="form-control" name="electric_calculation_type" onchange="toggleElectricFixed(this.value)">
                    <option value="unit">ตามหน่วย (Unit)</option>
                    <option value="fixed">เหมาจ่าย (Fixed)</option>
                </select>
            </div>
            <div class="form-group" id="electric-fixed-group" style="display:none;">
                <label>ค่าไฟเหมาจ่าย (บาท)</label>
                <input type="number" class="form-control" name="electric_fixed_amount" value="200" min="0">
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `);
}

function toggleWaterFixed(type) {
    document.getElementById('water-fixed-group').style.display = type === 'fixed' ? 'block' : 'none';
}

function toggleElectricFixed(type) {
    document.getElementById('electric-fixed-group').style.display = type === 'fixed' ? 'block' : 'none';
}

async function submitAddRoom(e, floorId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        floor_id: floorId,
        room_number: form.room_number.value,
        room_price: parseFloat(form.room_price.value) || 0,
        water_calculation_type: form.water_calculation_type.value,
        water_fixed_amount: parseFloat(form.water_fixed_amount.value) || 0,
        electric_calculation_type: form.electric_calculation_type.value,
        electric_fixed_amount: parseFloat(form.electric_fixed_amount.value) || 0
    };

    try {
        await apiPost('/rooms', data);
        closeModal();
        showToast('เพิ่มห้องเรียบร้อย', 'success');
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('หมายเลขห้องซ้ำ หรือเกิดข้อผิดพลาด', 'error');
    }
}

async function showRoomDetail(roomId) {
    const room = roomsData.find(r => r.id === roomId);
    if (!room) return;

    let tenantSection = '';
    let actionButtons = '';

    if (room.is_occupied && room.tenant_id) {
        tenantSection = `
            <div class="card" style="margin-top:20px; border-color:var(--success);">
                <div class="card-header" style="margin-bottom:0; border-bottom:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <div>
                            <div style="font-size:0.9rem; color:var(--text-muted);">ผู้เช่าปัจจุบัน</div>
                            <div style="font-size:1.1rem; font-weight:600;">${room.tenant_name}</div>
                            <div style="font-size:0.9rem;"><i class="fas fa-phone"></i> ${room.tenant_phone || '-'}</div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="btn btn-sm btn-secondary" onclick="showEditTenantModal(${room.tenant_id})">
                                <i class="fas fa-user-edit"></i> ข้อมูล
                            </button>
                            <button type="button" class="btn btn-sm btn-warning" onclick="moveOutTenant(${room.tenant_id})" style="color:white;">
                                <i class="fas fa-sign-out-alt"></i> ย้ายออก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        actionButtons = `
            <button type="button" class="btn btn-success" onclick="showAddTenantModal(${room.id})" style="margin-right:auto;">
                <i class="fas fa-user-plus"></i> เพิ่มผู้เช่า
            </button>
        `;
    }

    openModal(`ห้อง ${room.room_number}`, `
        <form id="edit-room-form" onsubmit="submitEditRoom(event, ${roomId})">
            <div class="form-group">
                <label>หมายเลขห้อง</label>
                <input type="text" class="form-control" name="room_number" value="${room.room_number}" required>
            </div>
            <div class="form-group">
                <label>ค่าเช่าห้อง (บาท/เดือน)</label>
                <input type="number" class="form-control" name="room_price" value="${room.room_price}" min="0" step="100">
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                <div>
                    <div class="form-group">
                        <label>การคำนวณค่าน้ำ</label>
                        <select class="form-control" name="water_calculation_type" onchange="toggleWaterFixed(this.value)">
                            <option value="unit" ${room.water_calculation_type === 'unit' ? 'selected' : ''}>ตามหน่วย</option>
                            <option value="fixed" ${room.water_calculation_type === 'fixed' ? 'selected' : ''}>เหมาจ่าย</option>
                        </select>
                    </div>
                    <div class="form-group" id="water-fixed-group" style="display:${room.water_calculation_type === 'fixed' ? 'block' : 'none'};">
                        <label>ค่าน้ำเหมาจ่าย</label>
                        <input type="number" class="form-control" name="water_fixed_amount" value="${room.water_fixed_amount}" min="0">
                    </div>
                </div>
                <div>
                    <div class="form-group">
                        <label>การคำนวณค่าไฟ</label>
                        <select class="form-control" name="electric_calculation_type" onchange="toggleElectricFixed(this.value)">
                            <option value="unit" ${room.electric_calculation_type === 'unit' ? 'selected' : ''}>ตามหน่วย</option>
                            <option value="fixed" ${room.electric_calculation_type === 'fixed' ? 'selected' : ''}>เหมาจ่าย</option>
                        </select>
                    </div>
                    <div class="form-group" id="electric-fixed-group" style="display:${room.electric_calculation_type === 'fixed' ? 'block' : 'none'};">
                        <label>ค่าไฟเหมาจ่าย</label>
                        <input type="number" class="form-control" name="electric_fixed_amount" value="${room.electric_fixed_amount}" min="0">
                    </div>
                </div>
            </div>

            <input type="hidden" name="floor_id" value="${room.floor_id}">
            <input type="hidden" name="is_occupied" value="${room.is_occupied ? 1 : 0}">
            
            ${tenantSection}

            <div class="modal-footer" style="margin-top:20px;">
                ${actionButtons}
                <button type="button" class="btn btn-danger" onclick="deleteRoom(${roomId})" ${actionButtons ? '' : 'style="margin-right:auto;"'}>
                    <i class="fas fa-trash"></i> ลบห้อง
                </button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `);
}

async function submitEditRoom(e, roomId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        floor_id: parseInt(form.floor_id.value),
        room_number: form.room_number.value,
        room_price: parseFloat(form.room_price.value) || 0,
        water_calculation_type: form.water_calculation_type.value,
        water_fixed_amount: parseFloat(form.water_fixed_amount.value) || 0,
        electric_calculation_type: form.electric_calculation_type.value,
        electric_fixed_amount: parseFloat(form.electric_fixed_amount.value) || 0,
        is_occupied: form.is_occupied.value === '1'
    };

    try {
        await apiPut(`/rooms/${roomId}`, data);
        closeModal();
        showToast('แก้ไขห้องเรียบร้อย', 'success');
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

async function deleteRoom(roomId) {
    if (!confirm('ต้องการลบห้องนี้ใช่หรือไม่?')) return;

    try {
        await apiDelete(`/rooms/${roomId}`);
        closeModal();
        showToast('ลบห้องเรียบร้อย', 'success');
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

// ============ Meters ============
let meterData = [];

async function loadMeterData() {
    const month = document.getElementById('meter-month').value;
    const year = document.getElementById('meter-year').value;

    try {
        meterData = await apiGet(`/meters/rooms/${month}/${year}`);
        renderMeterData(month, year);
        document.getElementById('meter-action-bar').style.display = 'flex';
    } catch (error) {
        console.error('Error loading meter data:', error);
        showToast('ไม่สามารถโหลดข้อมูลได้', 'error');
    }
}

function renderMeterData(month, year) {
    const container = document.getElementById('meters-container');

    if (meterData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-tachometer-alt"></i>
                <h3>ไม่มีข้อมูลห้อง</h3>
                <p>กรุณาเพิ่มห้องในผังห้องเช่าก่อน</p>
            </div>
        `;
        return;
    }

    // Group by floor
    const floors = {};
    meterData.forEach(room => {
        if (!floors[room.floor_id]) {
            floors[room.floor_id] = {
                name: room.floor_name,
                rooms: []
            };
        }
        floors[room.floor_id].rooms.push(room);
    });

    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    container.innerHTML = Object.values(floors).map(floor => `
        <div class="meter-floor-section">
            <div class="meter-floor-header">
                <i class="fas fa-layer-group"></i>
                ${floor.name} - ${monthNames[month - 1]} ${parseInt(year) + 543}
            </div>
            <div class="table-responsive">
                <table class="meters-table">
                <thead>
                    <tr>
                        <th rowspan="2" style="width: 100px;">ห้อง</th>
                        <th colspan="3" class="meter-label water border-right-separator"><i class="fas fa-tint"></i> มิเตอร์น้ำ</th>
                        <th colspan="3" class="meter-label electric"><i class="fas fa-bolt"></i> มิเตอร์ไฟ</th>
                    </tr>
                    <tr>
                        <th>เลขก่อนหน้า</th>
                        <th>เลขปัจจุบัน</th>
                        <th class="border-right-separator">หน่วยที่ใช้</th>
                        <th>เลขก่อนหน้า</th>
                        <th>เลขปัจจุบัน</th>
                        <th>หน่วยที่ใช้</th>
                    </tr>
                </thead>
                <tbody>
                    ${floor.rooms.map(room => {
        const waterPrev = parseFloat(room.water_previous) || parseFloat(room.prev_water) || 0;
        const waterCurr = parseFloat(room.water_current) || 0;
        // Only show usage if current reading is entered (> 0)
        const waterUsageVal = waterCurr - waterPrev;
        const waterUsage = (waterCurr > 0) ? waterUsageVal.toFixed(2) : '-';
        const waterClass = (waterCurr > 0) ? (waterUsageVal < 0 ? 'negative' : 'positive') : '';

        const electricPrev = parseFloat(room.electric_previous) || parseFloat(room.prev_electric) || 0;
        const electricCurr = parseFloat(room.electric_current) || 0;
        // Only show usage if current reading is entered (> 0)
        const electricUsageVal = electricCurr - electricPrev;
        const electricUsage = (electricCurr > 0) ? electricUsageVal.toFixed(2) : '-';
        const electricClass = (electricCurr > 0) ? (electricUsageVal < 0 ? 'negative' : 'positive') : '';

        return `
                        <tr data-room-id="${room.room_id}">
                            <td><strong>${room.room_number}</strong></td>
                            <!-- Water -->
                            <td>
                                <input type="number" class="water-prev form-control" 
                                       value="${waterPrev}" 
                                       step="0.01" min="0" readonly>
                            </td>
                            <td>
                                <input type="number" class="water-curr form-control" 
                                       value="${room.water_current || ''}" 
                                       step="0.01" min="0" 
                                       oninput="calculateUsage(this, ${waterPrev}, 'water-usage-${room.room_id}')">
                            </td>
                            <td class="usage-cell border-right-separator">
                                <span id="water-usage-${room.room_id}" class="usage-badge ${waterClass}">
                                    ${waterUsage}
                                </span>
                            </td>
                            
                            <!-- Electric -->
                            <td>
                                <input type="number" class="electric-prev form-control" 
                                       value="${electricPrev}" 
                                       step="0.01" min="0" readonly>
                            </td>
                            <td>
                                <input type="number" class="electric-curr form-control" 
                                       value="${room.electric_current || ''}" 
                                       step="0.01" min="0"
                                       oninput="calculateUsage(this, ${electricPrev}, 'electric-usage-${room.room_id}')">
                            </td>
                            <td class="usage-cell">
                                <span id="electric-usage-${room.room_id}" class="usage-badge ${electricClass}">
                                    ${electricUsage}
                                </span>
                            </td>
                        </tr>
                        `;
    }).join('')}
                </tbody>
                </tbody>
                </table>
            </div>
        </div>
    `).join('');
}

function calculateUsage(input, prevVal, displayId) {
    const currVal = parseFloat(input.value);
    const displayElement = document.getElementById(displayId);

    // If input is empty or 0, reset display
    if (isNaN(currVal) || currVal === 0) {
        displayElement.textContent = '-';
        displayElement.className = 'usage-badge';
        return;
    }

    const usage = currVal - prevVal;
    displayElement.textContent = usage.toFixed(2);

    if (usage < 0) {
        displayElement.className = 'usage-badge negative';
    } else {
        displayElement.className = 'usage-badge positive';
    }
}

async function saveAllMeters() {
    const month = document.getElementById('meter-month').value;
    const year = document.getElementById('meter-year').value;
    const readings = [];

    document.querySelectorAll('.meters-table tbody tr').forEach(row => {
        const roomId = row.dataset.roomId;
        readings.push({
            room_id: parseInt(roomId),
            reading_month: parseInt(month),
            reading_year: parseInt(year),
            water_previous: parseFloat(row.querySelector('.water-prev').value) || 0,
            water_current: parseFloat(row.querySelector('.water-curr').value) || 0,
            electric_previous: parseFloat(row.querySelector('.electric-prev').value) || 0,
            electric_current: parseFloat(row.querySelector('.electric-curr').value) || 0
        });
    });

    try {
        await apiPost('/meters/bulk', { readings });
        showToast('บันทึกมิเตอร์เรียบร้อย', 'success');
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

// ============ Bills ============
let billsData = [];

async function generateBills() {
    const month = document.getElementById('bill-month').value;
    const year = document.getElementById('bill-year').value;

    try {
        billsData = await apiGet(`/bills/generate/${month}/${year}`);
        renderBills(month, year);
    } catch (error) {
        console.error('Error generating bills:', error);
        showToast('ไม่สามารถสร้างบิลได้', 'error');
    }
}

function renderBills(month, year) {
    const container = document.getElementById('bills-container');
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    if (billsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice"></i>
                <h3>ไม่มีข้อมูลบิล</h3>
                <p>กรุณาจดมิเตอร์ก่อนสร้างบิล</p>
            </div>
        `;
        return;
    }

    // Group bills by floor
    const groupedBills = {};
    billsData.forEach(bill => {
        if (!groupedBills[bill.floor_name]) {
            groupedBills[bill.floor_name] = [];
        }
        groupedBills[bill.floor_name].push(bill);
    });

    container.innerHTML = Object.entries(groupedBills).map(([floorName, bills]) => `
        <div class="bill-floor-section">
            <h2 class="floor-title">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span><i class="fas fa-layer-group"></i> ${floorName}</span>
                    <button class="btn btn-sm btn-secondary" onclick="printFloorBills('${floorName}')">
                        <i class="fas fa-print"></i> พิมพ์ทั้งชั้น
                    </button>
                </div>
            </h2>
            <div class="bills-grid">
                ${bills.map(bill => `
                    <div class="bill-card ${bill.is_occupied ? 'occupied' : 'vacant'}" data-room-id="${bill.room_id}">
                        <div class="bill-header">
                            <div>
                                <div class="bill-room">
                                    ห้อง ${bill.room_number}
                                    <span class="room-status-badge ${bill.is_occupied ? 'occupied' : 'vacant'}">
                                        ${bill.is_occupied ? 'มีผู้เช่า' : 'ห้องว่าง'}
                                    </span>
                                </div>
                                <div class="bill-tenant">${bill.tenant_name}</div>
                                <div class="bill-invoice">#${bill.invoice_no || ''}</div>
                            </div>
                            <div style="text-align:right;font-size:0.9rem;color:#4b5563;">
                                ${monthNames[bill.bill_month - 1]} ${bill.bill_year + 543}
                            </div>
                        </div>
                        <div class="bill-body">
                            <div class="bill-row">
                                <span class="bill-label">ค่าเช่าห้อง</span>
                                <span class="bill-value">฿${formatNumber(bill.room_price)}</span>
                            </div>
                            <div class="bill-row">
                                <span class="bill-label">
                                    ค่าน้ำ ${bill.water_type === 'unit' ?
            `(${bill.water_units} หน่วย × ฿${bill.water_rate})` :
            '(เหมาจ่าย)'}
                                </span>
                                <span class="bill-value">฿${formatNumber(bill.water_amount)}</span>
                            </div>
                            <div class="bill-row">
                                <span class="bill-label">
                                    ค่าไฟ ${bill.electric_type === 'unit' ?
            `(${bill.electric_units} หน่วย × ฿${bill.electric_rate})` :
            '(เหมาจ่าย)'}
                                </span>
                                <span class="bill-value">฿${formatNumber(bill.electric_amount)}</span>
                            </div>
                            <div class="bill-row">
                                <span class="bill-label">ค่าขยะ</span>
                                <span class="bill-value">${bill.trash_fee > 0 ? `฿${formatNumber(bill.trash_fee)}` : ''}</span>
                            </div>
                             <div class="bill-row">
                                <span class="bill-label">เบ็ดเตล็ด</span>
                                <span class="bill-value">฿${formatNumber(bill.other_amount || 0)}</span>
                            </div>
                            <div class="bill-row total">
                                <span>รวมทั้งสิ้น</span>
                                <span>฿${formatNumber(bill.total_amount)}</span>
                            </div>
                        </div>
                        <div class="bill-footer">
                            <button class="btn btn-sm btn-primary" style="background-color: var(--accent-primary); border-color: var(--accent-primary);" onclick="editBill(${bill.room_id})">
                                <i class="fas fa-edit"></i> แก้ไข
                            </button>
                            <button class="btn btn-sm btn-secondary" onclick="printBill(${bill.room_id})">
                                <i class="fas fa-print"></i> พิมพ์
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

// Helper to get Bill HTML for printing
function generateBillPrintHTML(bill) {
    const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

    const dateStr = new Date().toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const billingPeriod = `${monthNames[bill.bill_month - 1]} ${bill.bill_year + 543}`;

    const getSharedBlock = (type, badgeClass) => `
        <div class="bill-section">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                <div style="flex: 1;"></div>
                <div style="flex: 3; text-align: center; margin-top: 5px;">
                    <h2 style="font-size: 26px; font-weight: bold; margin: 0; border: none; padding: 0;">ใบแจ้งค่าเช่าห้องพัก</h2>
                    <p style="font-size: 19px; margin: 3px 0 0 0;">ประจำเดือน ${billingPeriod}</p>
                </div>
                <div style="flex: 1; text-align: right;">
                    <span class="${badgeClass}" style="display: inline-block; margin-bottom: 4px; padding: 2px 10px;">${type}</span>
                    <p class="text-sm font-bold" style="margin: 0;">เลขที่: ${bill.invoice_no}</p>
                </div>
            </div>
            
            <div class="info-row text-sm" style="margin-top: 8px;">
                <div>
                    <p>ชื่อผู้เช่า: <span class="input-line" style="min-width: 150px;">${bill.tenant_name}</span></p>
                    <p class="mt-1">ห้องเลขที่: <span class="input-line" style="min-width: 60px;">${bill.room_number}</span> โทร: <span class="input-line" style="min-width: 120px;">${bill.tenant_phone}</span></p>
                </div>
                <div class="text-right">
                    <p>วันที่: ${dateStr}</p>
                </div>
            </div>
            
            <table class="bill-table text-sm">
                <thead>
                    <tr>
                        <th style="width: 32px;">ลำดับ</th>
                        <th>รายการ</th>
                        <th style="width: 80px;">เลขเดิม</th>
                        <th style="width: 80px;">เลขใหม่</th>
                        <th style="width: 64px;">หน่วย</th>
                        <th style="width: 80px;">ราคา/หน่วย</th>
                        <th style="width: 96px;">จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>1</td>
                        <td class="text-left pl-2">ค่าห้องพัก</td>
                        <td colspan="4"></td>
                        <td>${formatNumber(bill.room_price)}</td>
                    </tr>
                    <tr>
                        <td>2</td>
                        <td class="text-left pl-2">ค่าน้ำประปา</td>
                        <td>${bill.water_type === 'unit' ? formatNumber(bill.water_previous) : ''}</td>
                        <td>${bill.water_type === 'unit' ? formatNumber(bill.water_current) : ''}</td>
                        <td>${bill.water_type === 'unit' ? formatNumber(bill.water_units) : '1'}</td>
                        <td>${bill.water_type === 'unit' ? formatNumber(bill.water_rate) : formatNumber(bill.water_amount)}</td>
                        <td>${formatNumber(bill.water_amount)}</td>
                    </tr>
                    <tr>
                        <td>3</td>
                        <td class="text-left pl-2">ค่าไฟฟ้า</td>
                        <td>${bill.electric_type === 'unit' ? formatNumber(bill.electric_previous) : ''}</td>
                        <td>${bill.electric_type === 'unit' ? formatNumber(bill.electric_current) : ''}</td>
                        <td>${bill.electric_type === 'unit' ? formatNumber(bill.electric_units) : '1'}</td>
                        <td>${bill.electric_type === 'unit' ? formatNumber(bill.electric_rate) : formatNumber(bill.electric_amount)}</td>
                        <td>${formatNumber(bill.electric_amount)}</td>
                    </tr>
                    <tr>
                        <td>4</td>
                        <td class="text-left pl-2">ค่าขยะ</td>
                        <td colspan="4"></td>
                        <td>${bill.trash_fee > 0 ? formatNumber(bill.trash_fee) : ''}</td>
                    </tr>
                    <tr>
                        <td>5</td>
                        <td class="text-left pl-2">ค่าเบ็ดเตล็ด</td>
                        <td colspan="4"></td>
                        <td>${bill.other_amount > 0 ? formatNumber(bill.other_amount) : ''}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr class="font-bold">
                        <td colspan="6" class="text-right pr-2">รวมทั้งสิ้น</td>
                        <td>${formatNumber(bill.total_amount)}</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="signature-section text-sm" style="margin-top: 15px;">
                <div style="flex: 2; color: #4b5563;">
                    <p>กรุณาชำระภายในวันที่ <span class="font-semibold" style="color: #dc2626;">5</span> ของทุกเดือน</p>
                    <p class="text-xs mt-1">หากเกินกำหนดจะมีค่าปรับตามเงื่อนไขที่ตกลงกัน</p>
                </div>
                <div class="signature-box" style="flex: 1;">
                    <p style="margin-bottom: 25px;">ลงชื่อผู้รับเงิน</p>
                    <p class="signature-line">(.......................................)</p>
                </div>
            </div>
        </div>
    `;

    return `
        <div class="bill-container">
            ${getSharedBlock('สำเนา', 'copy-badge')}
            <div class="dashed-line"></div>
            ${getSharedBlock('ต้นฉบับ', 'original-badge')}
        </div>
    `;
}

function printBill(roomId) {
    const bill = billsData.find(b => b.room_id === roomId);
    if (!bill) return;

    document.getElementById('print-container').innerHTML = generateBillPrintHTML(bill);

    setTimeout(() => {
        window.print();
    }, 500);
}

async function printFloorBills(floorName) {
    const floorBills = billsData.filter(b => b.floor_name === floorName);
    if (floorBills.length === 0) return;

    let html = '';
    floorBills.forEach((bill, index) => {
        html += generateBillPrintHTML(bill);
        if (index < floorBills.length - 1) {
            html += '<div class="page-break"></div>';
        }
    });

    document.getElementById('print-container').innerHTML = html;

    setTimeout(() => {
        window.print();
    }, 800);
}


function editBill(roomId) {
    const bill = billsData.find(b => b.room_id === roomId);
    if (!bill) return;

    const content = `
        <div class="edit-bill-modal">
            <div class="modal-body" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group">
                    <label>เลขที่บิล</label>
                    <input type="text" id="edit-invoice-no" class="form-control" value="${bill.invoice_no}">
                </div>
                <div class="form-group">
                    <label>ชื่อผู้เช่า</label>
                    <input type="text" id="edit-tenant-name" class="form-control" value="${bill.tenant_name}">
                </div>
                <div class="form-group">
                    <label>ค่าเช่าห้อง (฿)</label>
                    <input type="number" id="edit-room-price" class="form-control" value="${bill.room_price}">
                </div>
                <div class="form-group">
                    <label>ค่าน้ำ (฿)</label>
                    <input type="number" id="edit-water-amount" class="form-control" value="${bill.water_amount}">
                </div>
                <div class="form-group">
                    <label>ค่าไฟ (฿)</label>
                    <input type="number" id="edit-electric-amount" class="form-control" value="${bill.electric_amount}">
                </div>
                <div class="form-group">
                    <label>ค่าขยะ (฿)</label>
                    <input type="number" id="edit-trash-fee" class="form-control" value="${bill.trash_fee}">
                </div>
                <div class="form-group">
                    <label>เบ็ดเตล็ด (฿)</label>
                    <input type="number" id="edit-other-amount" class="form-control" value="${bill.other_amount || 0}">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label><strong>รวมเงินทั้งสิ้น (฿)</strong></label>
                    <input type="number" id="edit-total-amount" class="form-control" value="${bill.total_amount}" readonly style="background: #f8f9fa; font-weight: bold; border: 2px solid var(--accent-primary);">
                </div>
            </div>
            <div class="modal-footer" style="padding: 15px 0 0 0; display: flex; justify-content: flex-end; gap: 10px;">
                <button class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
                <button class="btn btn-primary" onclick="saveEditedBill(${roomId})">บันทึก</button>
            </div>
        </div>
    `;

    openModal(`แก้ไขข้อมูลบิล ห้อง ${bill.room_number}`, content);

    // Auto-calculate total
    setTimeout(() => {
        const modalContainer = document.getElementById('modal-body');
        const inputs = modalContainer.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            if (input.id !== 'edit-total-amount') {
                input.addEventListener('input', () => {
                    const roomPrice = parseFloat(document.getElementById('edit-room-price').value) || 0;
                    const waterAmount = parseFloat(document.getElementById('edit-water-amount').value) || 0;
                    const electricAmount = parseFloat(document.getElementById('edit-electric-amount').value) || 0;
                    const trashFee = parseFloat(document.getElementById('edit-trash-fee').value) || 0;
                    const otherAmount = parseFloat(document.getElementById('edit-other-amount').value) || 0;

                    document.getElementById('edit-total-amount').value = (roomPrice + waterAmount + electricAmount + trashFee + otherAmount).toFixed(2);
                });
            }
        });
    }, 200);
}

function saveEditedBill(roomId) {
    const billIndex = billsData.findIndex(b => b.room_id === roomId);
    if (billIndex === -1) return;

    const editedBill = {
        ...billsData[billIndex],
        invoice_no: document.getElementById('edit-invoice-no').value,
        tenant_name: document.getElementById('edit-tenant-name').value,
        room_price: parseFloat(document.getElementById('edit-room-price').value) || 0,
        water_amount: parseFloat(document.getElementById('edit-water-amount').value) || 0,
        electric_amount: parseFloat(document.getElementById('edit-electric-amount').value) || 0,
        trash_fee: parseFloat(document.getElementById('edit-trash-fee').value) || 0,
        other_amount: parseFloat(document.getElementById('edit-other-amount').value) || 0,
        total_amount: parseFloat(document.getElementById('edit-total-amount').value) || 0
    };

    billsData[billIndex] = editedBill;
    closeModal();

    // Refresh the UI to show changes
    const currentMonth = document.getElementById('bill-month').value;
    const currentYear = document.getElementById('bill-year').value;
    renderBills(currentMonth, currentYear);
}


function downloadBill(roomId, month, year) {
    // For now, use print as download (users can save as PDF)
    printBill(roomId, month, year);
    showToast('กรุณาเลือก "Save as PDF" ในหน้าพิมพ์', 'warning');
}

// ============ Tenants ============
async function loadTenants() {
    try {
        tenantsData = await apiGet('/tenants');
        renderTenants();
    } catch (error) {
        console.error('Error loading tenants:', error);
    }
}

function renderTenants() {
    const container = document.getElementById('tenants-container');

    if (tenantsData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>ยังไม่มีข้อมูลผู้เช่า</h3>
                <p>คลิก "เพิ่มผู้เช่า" เพื่อเริ่มต้น</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>ชื่อ-นามสกุล</th>
                        <th>ห้อง</th>
                        <th>เบอร์โทร</th>
                        <th>สถานะ</th>
                        <th>จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                ${tenantsData.map(tenant => `
                    <tr>
                        <td><strong>${tenant.name}</strong></td>
                        <td>${tenant.room_number || '-'}</td>
                        <td>${tenant.phone || '-'}</td>
                        <td>
                            <span class="tenant-status ${tenant.is_active ? 'active' : 'inactive'}">
                                <i class="fas fa-circle" style="font-size:0.5rem;"></i>
                                ${tenant.is_active ? 'เช่าอยู่' : 'ย้ายออก'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-icon btn-secondary" onclick="showEditTenantModal(${tenant.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            ${tenant.is_active ? `
                                <button class="btn btn-icon btn-warning" onclick="moveOutTenant(${tenant.id})" title="ย้ายออก">
                                    <i class="fas fa-sign-out-alt"></i>
                                </button>
                            ` : ''}
                            <button class="btn btn-icon btn-danger" onclick="deleteTenant(${tenant.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

async function moveOutTenant(tenantId) {
    if (!confirm('ยืนยันแจ้งย้ายออกผู้เช่านี้?')) return;

    // Get current tenant info first
    try {
        const tenant = tenantsData.find(t => t.id === tenantId) || (await apiGet(`/tenants/${tenantId}`));

        await apiPut(`/tenants/${tenantId}`, {
            ...tenant,
            is_active: false,
            move_out_date: new Date().toISOString().split('T')[0]
        });

        closeModal();
        showToast('แจ้งย้ายออกเรียบร้อย', 'success');
        await loadTenants();
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

function showAddTenantModal(preselectedRoomId = null) {
    const roomOptions = roomsData
        .filter(r => !r.is_occupied || r.id === preselectedRoomId)
        .map(r => `<option value="${r.id}" ${r.id === preselectedRoomId ? 'selected' : ''}>${r.room_number} (${r.floor_name})</option>`)
        .join('');

    openModal('เพิ่มผู้เช่าใหม่', `
        <form id="add-tenant-form" onsubmit="submitAddTenant(event)">
            <div class="form-group">
                <label>ชื่อ-นามสกุล *</label>
                <input type="text" class="form-control" name="name" required>
            </div>
            <div class="form-group">
                <label>ห้องที่เช่า</label>
                <select class="form-control" name="room_id">
                    <option value="">-- เลือกห้อง --</option>
                    ${roomOptions}
                </select>
            </div>
            <div class="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input type="tel" class="form-control" name="phone">
            </div>
            <div class="form-group">
                <label>เลขบัตรประชาชน</label>
                <input type="text" class="form-control" name="id_number" maxlength="13">
            </div>
            <div class="form-group">
                <label>ที่อยู่</label>
                <textarea class="form-control" name="address" rows="2"></textarea>
            </div>
            <div class="form-group">
                <label>วันที่เข้าพัก</label>
                <input type="date" class="form-control" name="move_in_date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <label>รูปบัตรประชาชน</label>
                <div class="upload-btn-row">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('add-id-card-input').click()">
                        <i class="fas fa-cloud-upload-alt"></i> คลิกเพื่ออัพโหลดรูปบัตรประชาชน
                    </button>
                    <span id="add-id-card-label" class="file-name-display"></span>
                    <input type="file" id="add-id-card-input" name="id_card" accept="image/*,.pdf" style="display:none;" onchange="updateFileLabel(this, 'add-id-card-label')">
                </div>
            </div>
            <div class="form-group">
                <label>สัญญาเช่า</label>
                <div class="upload-btn-row">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('add-contract-input').click()">
                        <i class="fas fa-cloud-upload-alt"></i> คลิกเพื่ออัพโหลดสัญญาเช่า
                    </button>
                    <span id="add-contract-label" class="file-name-display"></span>
                    <input type="file" id="add-contract-input" name="contract" accept="image/*,.pdf" style="display:none;" onchange="updateFileLabel(this, 'add-contract-label')">
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `);
}

function updateFileLabel(input, labelId) {
    const label = document.getElementById(labelId);
    if (input.files && input.files[0]) {
        label.textContent = '✓ ' + input.files[0].name;
    }
}

async function submitAddTenant(e) {
    e.preventDefault();
    const form = e.target;

    // Get room_number from selected option text
    const roomSelect = form.room_id;
    const selectedRoomId = roomSelect.value;
    const selectedRoom = roomsData.find(r => r.id === parseInt(selectedRoomId));
    const roomNumber = selectedRoom ? selectedRoom.room_number : 'unknown';

    const data = {
        name: form.name.value,
        room_id: selectedRoomId || null,
        phone: form.phone.value,
        id_number: form.id_number.value,
        address: form.address.value,
        move_in_date: form.move_in_date.value || null
    };

    try {
        const result = await apiPost('/tenants', data);
        const tenantId = result.id;

        // Upload files if selected
        const idCardFile = document.getElementById('add-id-card-input').files[0];
        const contractFile = document.getElementById('add-contract-input').files[0];

        if (idCardFile || contractFile) {
            const formData = new FormData();
            // IMPORTANT: room_number must be first so multer can access it during filename generation
            formData.append('room_number', roomNumber);
            if (idCardFile) formData.append('id_card', idCardFile);
            if (contractFile) formData.append('contract', contractFile);

            await fetch(`${API_BASE}/tenants/${tenantId}/upload`, {
                method: 'POST',
                body: formData
            });
        }

        closeModal();
        showToast('เพิ่มผู้เช่าเรียบร้อย', 'success');
        await loadTenants();
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

async function showEditTenantModal(tenantId) {
    const tenant = tenantsData.find(t => t.id === tenantId);
    if (!tenant) return;

    const roomOptions = roomsData
        .filter(r => !r.is_occupied || r.id === tenant.room_id)
        .map(r => `<option value="${r.id}" ${r.id === tenant.room_id ? 'selected' : ''}>${r.room_number} (${r.floor_name})</option>`)
        .join('');

    openModal(`แก้ไขข้อมูล ${tenant.name}`, `
        <form id="edit-tenant-form" onsubmit="submitEditTenant(event, ${tenantId})">
            <div class="form-group">
                <label>ชื่อ-นามสกุล *</label>
                <input type="text" class="form-control" name="name" value="${tenant.name}" required>
            </div>
            <div class="form-group">
                <label>ห้องที่เช่า</label>
                <select class="form-control" name="room_id">
                    <option value="">-- ไม่มีห้อง --</option>
                    ${roomOptions}
                </select>
            </div>
            <div class="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input type="tel" class="form-control" name="phone" value="${tenant.phone || ''}">
            </div>
            <div class="form-group">
                <label>เลขบัตรประชาชน</label>
                <input type="text" class="form-control" name="id_number" value="${tenant.id_number || ''}" maxlength="13">
            </div>
            <div class="form-group">
                <label>ที่อยู่</label>
                <textarea class="form-control" name="address" rows="2">${tenant.address || ''}</textarea>
            </div>
            <div class="form-group">
                <label>วันที่เข้าพัก</label>
                <input type="date" class="form-control" name="move_in_date" value="${tenant.move_in_date ? tenant.move_in_date.split('T')[0] : ''}">
            </div>
            <div class="form-group">
                <label>วันที่ย้ายออก</label>
                <input type="date" class="form-control" name="move_out_date" value="${tenant.move_out_date ? tenant.move_out_date.split('T')[0] : ''}">
            </div>
            <div class="form-group">
                <label>สถานะ</label>
                <select class="form-control" name="is_active">
                    <option value="1" ${tenant.is_active ? 'selected' : ''}>เช่าอยู่</option>
                    <option value="0" ${!tenant.is_active ? 'selected' : ''}>ย้ายออกแล้ว</option>
                </select>
            </div>
            
            <!-- File Uploads -->
            <div class="form-group">
                <label>รูปบัตรประชาชน</label>
                ${tenant.id_card_image ?
            `<div class="file-preview"><div class="file-preview-item"><img src="${tenant.id_card_image}" alt="ID Card"></div></div>` :
            ''}
                <div class="upload-btn-row">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('id-card-input').click()">
                        <i class="fas fa-cloud-upload-alt"></i> คลิกเพื่ออัพโหลดรูปบัตรประชาชน
                    </button>
                    <input type="file" id="id-card-input" accept="image/*,.pdf" style="display:none;" onchange="uploadTenantFile(${tenantId}, 'id_card', this.files[0])">
                </div>
            </div>
            <div class="form-group">
                <label>สัญญาเช่า</label>
                ${tenant.contract_image ?
            `<div class="file-preview"><div class="file-preview-item"><img src="${tenant.contract_image}" alt="Contract"></div></div>` :
            ''}
                <div class="upload-btn-row">
                    <button type="button" class="btn btn-secondary" onclick="document.getElementById('contract-input').click()">
                        <i class="fas fa-cloud-upload-alt"></i> คลิกเพื่ออัพโหลดสัญญาเช่า
                    </button>
                    <input type="file" id="contract-input" accept="image/*,.pdf" style="display:none;" onchange="uploadTenantFile(${tenantId}, 'contract', this.files[0])">
                </div>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">ยกเลิก</button>
                <button type="submit" class="btn btn-primary">บันทึก</button>
            </div>
        </form>
    `);
}

async function submitEditTenant(e, tenantId) {
    e.preventDefault();
    const form = e.target;
    const data = {
        name: form.name.value,
        room_id: form.room_id.value || null,
        phone: form.phone.value,
        id_number: form.id_number.value,
        address: form.address.value,
        move_in_date: form.move_in_date.value || null,
        move_out_date: form.move_out_date.value || null,
        is_active: form.is_active.value === '1'
    };

    try {
        await apiPut(`/tenants/${tenantId}`, data);
        closeModal();
        showToast('แก้ไขข้อมูลเรียบร้อย', 'success');
        await loadTenants();
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

async function uploadTenantFile(tenantId, type, file) {
    if (!file) return;

    // Find tenant to get room_number
    const tenant = tenantsData.find(t => t.id === tenantId);
    const roomNumber = tenant?.room_number || 'unknown';

    const formData = new FormData();
    // IMPORTANT: room_number must be first so multer can access it during filename generation
    formData.append('room_number', roomNumber);
    formData.append(type, file);

    try {
        const res = await fetch(`${API_BASE}/tenants/${tenantId}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) throw new Error('Upload failed');

        showToast('อัพโหลดไฟล์เรียบร้อย', 'success');

        // Refresh tenant data
        await loadTenants();
        showEditTenantModal(tenantId);
    } catch (error) {
        showToast('อัพโหลดไฟล์ล้มเหลว', 'error');
    }
}

async function deleteTenant(tenantId) {
    if (!confirm('ต้องการลบผู้เช่านี้ใช่หรือไม่?')) return;

    try {
        await apiDelete(`/tenants/${tenantId}`);
        showToast('ลบผู้เช่าเรียบร้อย', 'success');
        await loadTenants();
        await loadFloorsAndRooms();
    } catch (error) {
        showToast('เกิดข้อผิดพลาด', 'error');
    }
}

// ============ Modal Helpers ============
function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Close modal on overlay click
document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') {
        closeModal();
    }
});

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// ============ Toast Notifications ============
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle'
    };

    toast.innerHTML = `
        <i class="fas ${icons[type] || 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlide 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ Utility Functions ============
function formatNumber(num) {
    return new Intl.NumberFormat('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num || 0);
}
