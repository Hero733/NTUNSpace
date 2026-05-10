const ADMIN_EMAILS = ['ntun21933@ntun.ac.th'];
const SESSION_KEY = 'ntunUserSession';
let currentUser = null;
let activeRoom = null;

// --- ตั้งค่า Firebase (กุญแจหลังบ้าน) ---
const firebaseConfig = {
    apiKey: "AIzaSyAlaTyhtXf-d6qDSD5AeWR33Hg3VCn55o8",
    authDomain: "ntunspace.firebaseapp.com",
    projectId: "ntunspace",
    storageBucket: "ntunspace.firebasestorage.app",
    messagingSenderId: "952526844615",
    appId: "1:952526844615:web:d1f78ba8e3b44c24ee84e2",
    measurementId: "G-33DZ6EX79H"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let classroomsDB = {};

// --- ระบบ Real-time ดึงข้อมูลจาก Firebase ---
db.collection("spaces").doc("classroomsData").onSnapshot((doc) => {
    if (doc.exists) {
        classroomsDB = doc.data();
    } else {
        classroomsDB = {};
    }
    
    // อัปเดตหน้าจออัตโนมัติเมื่อข้อมูลหลังบ้านเปลี่ยน
    if (currentUser) {
        if (activeRoom && document.getElementById('dragArea')) {
            renderSeatMap();
        } else if (currentUser.isAdmin && !activeRoom && document.getElementById('teacherRoomsList')) {
            renderTeacherRoomsList();
        }
    }
});

// ฟังก์ชันเซฟข้อมูลขึ้น Firebase
function saveDB() { 
    db.collection("spaces").doc("classroomsData").set(classroomsDB)
      .catch(err => console.error("Error saving to Firebase: ", err));
}

function saveSession() {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: currentUser,
        expiry: Date.now() + (24 * 60 * 60 * 1000)
    }));
}

// --- ระบบล็อคอิน Google ---
function handleGoogleLogin(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        const email = payload.email;
        const isAdmin = ADMIN_EMAILS.includes(email);
        
        if (!email.endsWith('@ntun.ac.th') && !isAdmin) {
            return Swal.fire('ไม่อนุญาต', 'ใช้อีเมล @ntun.ac.th เท่านั้น', 'error');
        }
        
        currentUser = { 
            email: email, 
            name: isAdmin ? "แอดมินสูงสุด" : payload.name, 
            isAdmin: isAdmin,
            joinedRooms: [] 
        };
        
        saveSession();
        showMainApp();
    } catch (e) {
        console.error("Login Error:", e);
        Swal.fire('ผิดพลาด', 'ไม่สามารถอ่านข้อมูลชื่อจาก Google ได้', 'error');
    }
}

// เช็ค Session
const sessionData = JSON.parse(localStorage.getItem(SESSION_KEY));
if (sessionData && sessionData.expiry > Date.now()) {
    currentUser = sessionData.user;
    if (!currentUser.joinedRooms) currentUser.joinedRooms = [];
    showMainApp();
}

// --- ระบบ UI ควบคุมหน้าบ้าน ---
function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userEmailDisplay').innerText = currentUser.email;
    
    const badge = document.getElementById('roleBadge');
    badge.innerText = currentUser.isAdmin ? 'Admin' : 'Student';
    badge.className = `px-4 py-1.5 rounded-xl text-xs font-extrabold shadow-sm ${currentUser.isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`;
    
    setTimeout(() => { renderDashboard(); }, 500);
}

function logout() { 
    localStorage.removeItem(SESSION_KEY);
    location.reload(); 
}

function renderDashboard() {
    document.getElementById('headerTitle').innerText = "หน้าหลัก";
    activeRoom = null;
    const content = document.getElementById('mainContent');
    
    if (currentUser.isAdmin) {
        content.innerHTML = `
            <div class="glass-panel p-6 rounded-[32px] mb-6 shadow-sm">
                <h3 class="font-extrabold text-lg text-gray-800 mb-4 flex items-center gap-2"><i class='bx bxs-layer-plus text-purple-600 text-2xl'></i> สร้างชั้นเรียน</h3>
                <input type="text" id="roomName" placeholder="ชื่อห้อง" class="w-full p-4 bg-white/70 border border-white rounded-2xl mb-3 focus:ring-2 focus:ring-purple-400 font-medium">
                <input type="number" id="seatCount" placeholder="จำนวนที่นั่ง" class="w-full p-4 bg-white/70 border border-white rounded-2xl mb-4 focus:ring-2 focus:ring-purple-400 font-medium">
                <button onclick="createRoom()" class="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg">สร้างห้อง</button>
            </div>
            <div id="teacherRoomsList" class="flex flex-col gap-4"></div>`;
        renderTeacherRoomsList();
    } else {
        let joinedRoomsHTML = '';
        if (currentUser.joinedRooms && currentUser.joinedRooms.length > 0) {
            joinedRoomsHTML = `<div class="mt-8 text-left w-full"><h4 class="font-bold text-gray-700 mb-3 px-2">ประวัติห้องเรียน</h4><div class="flex flex-col gap-3">`;
            currentUser.joinedRooms.forEach(code => {
                const room = classroomsDB[code];
                if (room) {
                    joinedRoomsHTML += `
                        <div class="glass-panel p-4 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/40 shadow-sm" onclick="joinRoom('${code}')">
                            <div><h5 class="font-bold text-gray-800">${room.name}</h5><span class="text-xs text-blue-600 font-bold">รหัส: ${code}</span></div>
                            <div class="bg-blue-50 p-2 rounded-full"><i class='bx bx-chevron-right text-xl text-blue-500'></i></div>
                        </div>`;
                }
            });
            joinedRoomsHTML += `</div></div>`;
        }

        content.innerHTML = `
            <div class="glass-panel p-8 rounded-[32px] text-center mt-6">
                <div class="w-20 h-20 bg-blue-500 text-white rounded-[24px] flex items-center justify-center mx-auto mb-6"><i class='bx bx-door-open text-4xl'></i></div>
                <h3 class="font-extrabold text-2xl mb-2 text-gray-800">เข้าร่วมชั้นเรียน</h3>
                <p class="text-sm text-gray-500 mb-6 font-medium">กรุณากรอกรหัสห้องเรียน 6 หลักเพื่อเข้าใช้งาน</p>
                <input type="text" id="roomCodeInput" maxlength="6" placeholder="______" class="w-full text-center tracking-[8px] uppercase font-mono font-bold text-3xl p-4 bg-white/70 border border-white rounded-2xl mb-6">
                <button onclick="joinRoom()" class="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-4 rounded-2xl shadow-lg">เข้าร่วม (Join)</button>
                ${joinedRoomsHTML}
            </div>`;
    }
}

function createRoom() {
    const name = document.getElementById('roomName').value.trim(), count = parseInt(document.getElementById('seatCount').value);
    if (!name || isNaN(count)) return Swal.fire('ผิดพลาด', 'กรอกข้อมูลให้ครบ', 'warning');
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    classroomsDB[code] = { name: name, maxSeats: count, isBookingOpen: true, seats: generateSeatData(count) };
    saveDB(); renderTeacherRoomsList(); Swal.fire('สำเร็จ', 'รหัสห้อง: ' + code, 'success');
}

function renderTeacherRoomsList() {
    let html = '';
    for (const [code, r] of Object.entries(classroomsDB)) {
        html += `
            <div class="glass-panel p-5 rounded-[24px] flex justify-between items-center cursor-pointer hover:bg-white/40 transition" onclick="activeRoom='${code}'; renderSeatMap();">
                <div><h4 class="font-extrabold text-gray-800">${r.name}</h4><p class="text-xs text-blue-600 font-bold mt-1">Code: ${code} <span class="text-gray-400 font-normal ml-2">(${r.seats.length} โต๊ะ)</span></p></div>
                <button onclick="event.stopPropagation(); deleteRoom('${code}')" class="bg-red-100 text-red-600 p-3 rounded-xl"><i class='bx bx-trash text-xl'></i></button>
            </div>`;
    }
    const listEl = document.getElementById('teacherRoomsList');
    if (listEl) listEl.innerHTML = html;
}

function deleteRoom(code) {
    Swal.fire({title: 'ลบห้องนี้?', icon: 'warning', showCancelButton: true}).then(r => {
        if (r.isConfirmed) { delete classroomsDB[code]; saveDB(); renderTeacherRoomsList(); }
    });
}

function joinRoom(directCode = null) {
    const code = directCode || document.getElementById('roomCodeInput').value.trim().toUpperCase();
    if (classroomsDB[code]) { 
        activeRoom = code; 
        if (!currentUser.isAdmin) {
            if (!currentUser.joinedRooms.includes(code)) { currentUser.joinedRooms.push(code); saveSession(); }
        }
        renderSeatMap(); 
    } else Swal.fire('ไม่พบห้อง', 'รหัสไม่ถูกต้อง', 'error');
}

function applyDefaultLayout(seats) {
    const colX = [0, 85, 170,  295, 380, 465,  590, 675]; 
    let row = 0, colIndex = 0;
    seats.forEach(seat => { seat.x = colX[colIndex]; seat.y = row * 110; colIndex++; if (colIndex >= 8) { colIndex = 0; row++; } });
    return seats;
}

function generateSeatData(count) {
    let seats = [];
    for(let i=1; i<=count; i++) { seats.push({ id: i, bookedBy: null, name: null }); }
    return applyDefaultLayout(seats);
}

function renderSeatMap() {
    const room = classroomsDB[activeRoom];
    if(!room) return;
    
    document.getElementById('headerTitle').innerText = room.name;
    const areaHeight = (Math.ceil(room.seats.length / 8) * 110) + 100; 
    
    let html = `
        <div class="glass-panel p-4 md:p-6 rounded-[32px] mt-6 relative shadow-sm">
            <div class="flex flex-wrap gap-2 justify-center mb-6 border-b border-gray-200 pb-4">
                ${currentUser.isAdmin ? `
                    <button onclick="toggleBooking()" class="text-xs font-bold px-4 py-2 rounded-xl ${room.isBookingOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${room.isBookingOpen ? 'เปิดจองอยู่' : 'ปิดจองแล้ว'}</button>
                    <button onclick="resetSeatLayout()" class="text-xs font-bold bg-gray-200 text-gray-700 px-4 py-2 rounded-xl">รีเซ็ตแผนผัง</button>
                ` : `
                    <span class="text-xs font-bold px-4 py-2 rounded-full ${room.isBookingOpen ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${room.isBookingOpen ? 'เปิดรับจองที่นั่ง' : 'ปิดรับจองแล้ว'}</span>
                `}
            </div>
            <div class="map-container">
                <div class="whiteboard w-[300px] h-8 mx-auto rounded-lg mb-8 flex items-center justify-center border border-gray-300 shadow-sm"><span class="text-[10px] font-bold text-gray-400 tracking-widest">หน้ากระดานเรียน</span></div>
                <div id="dragArea" style="height: ${areaHeight}px;">
                    ${room.seats.map(s => generateSeatHTML(s)).join('')}
                </div>
            </div>
        </div>`;
    document.getElementById('mainContent').innerHTML = html;
}

function generateSeatHTML(seat) {
    const isBooked = seat.bookedBy !== null;
    const isMine = seat.bookedBy === currentUser.email;
    const nameLabel = isBooked ? `<span class="seat-name ${isMine?'border border-blue-500 text-blue-600':''}">${isMine?'คุณ':seat.name}</span>` : `<span class="seat-name text-gray-300">${seat.id}</span>`;
    return `<div id="seat-${seat.id}" class="seat ${isBooked?'booked':''}" style="left: ${seat.x}px; top: ${seat.y}px;" onmousedown="initDrag(event, ${seat.id})" ontouchstart="initDrag(event, ${seat.id})">
        <svg viewBox="0 0 100 100" class="desk-svg"><rect x="25" y="55" width="50" height="35" rx="8" class="desk-chair" /><path d="M 5 50 L 95 50 L 95 65 L 5 65 Z" class="desk-edge" /><path d="M 15 10 L 85 10 L 95 50 L 5 50 Z" class="desk-top" /></svg>
        ${nameLabel}
    </div>`;
}

function handleSeatClick(roomId, seatId) {
    const room = classroomsDB[roomId], seat = room.seats.find(s => s.id === seatId);
    if (currentUser.isAdmin) {
        if (seat.bookedBy) {
            Swal.fire({ title: 'ลบการจอง?', text: `ต้องการลบ "${seat.name}" ออก?`, icon: 'warning', showCancelButton: true }).then(r => { if(r.isConfirmed) { seat.bookedBy = null; seat.name = null; saveDB(); renderSeatMap(); }});
        } else {
            Swal.fire({ title: 'เพิ่มชื่อนักเรียน', input: 'text', showCancelButton: true }).then(r => { if(r.isConfirmed && r.value) { seat.bookedBy = 'manual'; seat.name = r.value; saveDB(); renderSeatMap(); }});
        }
    } else {
        if (!room.isBookingOpen) return Swal.fire('ปิดจอง', 'ครูปิดรับจองแล้ว', 'warning');
        if (seat.bookedBy === currentUser.email) {
            Swal.fire({ title: 'ยกเลิกที่นั่ง?', showCancelButton: true }).then(r => { if(r.isConfirmed) { seat.bookedBy = null; seat.name = null; saveDB(); renderSeatMap(); }});
        } else if (!seat.bookedBy) {
            if (room.seats.some(s => s.bookedBy === currentUser.email)) return Swal.fire('จองได้ที่เดียว', '', 'error');
            Swal.fire({ title: 'จองที่นั่งนี้?', showCancelButton: true }).then(r => { if(r.isConfirmed) { seat.bookedBy = currentUser.email; seat.name = currentUser.name; saveDB(); renderSeatMap(); }});
        }
    }
}

// --- ระบบลากโต๊ะ (Drag) ---
let activeSeatId = null, isDragging = false, startX, startY, initialLeft, initialTop;
function initDrag(e, seatId) {
    activeSeatId = seatId; isDragging = false;
    startX = e.clientX || (e.touches && e.touches[0].clientX);
    startY = e.clientY || (e.touches && e.touches[0].clientY);
    const el = document.getElementById('seat-' + seatId);
    initialLeft = parseInt(el.style.left) || 0; initialTop = parseInt(el.style.top) || 0;
    el.classList.add('dragging');
}
document.addEventListener('mousemove', handleMove, {passive: false});
document.addEventListener('touchmove', handleMove, {passive: false});
function handleMove(e) {
    if (!activeSeatId || !currentUser.isAdmin) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX);
    const currentY = e.clientY || (e.touches && e.touches[0].clientY);
    const dx = currentX - startX, dy = currentY - startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { isDragging = true; e.preventDefault(); }
    if (isDragging) {
        const el = document.getElementById('seat-' + activeSeatId);
        el.style.left = (initialLeft + dx) + 'px'; el.style.top = (initialTop + dy) + 'px';
    }
}
document.addEventListener('mouseup', handleUp);
document.addEventListener('touchend', handleUp);
function handleUp() {
    if (!activeSeatId) return;
    const el = document.getElementById('seat-' + activeSeatId);
    el.classList.remove('dragging');
    if (isDragging) {
        const seat = classroomsDB[activeRoom].seats.find(s => s.id === activeSeatId);
        seat.x = parseInt(el.style.left); seat.y = parseInt(el.style.top); saveDB();
    } else { handleSeatClick(activeRoom, activeSeatId); }
    activeSeatId = null; isDragging = false;
}

function toggleBooking() { classroomsDB[activeRoom].isBookingOpen = !classroomsDB[activeRoom].isBookingOpen; saveDB(); renderSeatMap(); }
function resetSeatLayout() { applyDefaultLayout(classroomsDB[activeRoom].seats); saveDB(); renderSeatMap(); }

// นำฟังก์ชันที่ใช้ใน HTML (onclick) ผูกเข้ากับ window เพื่อให้ HTML มองเห็น
window.handleGoogleLogin = handleGoogleLogin;
window.renderDashboard = renderDashboard;
window.logout = logout;
window.createRoom = createRoom;
window.deleteRoom = deleteRoom;
window.joinRoom = joinRoom;
window.toggleBooking = toggleBooking;
window.resetSeatLayout = resetSeatLayout;
window.initDrag = initDrag;