// Chuck's Chicken - Employee Portal
// Firebase-powered scheduling and management app

// Firebase Configuration (same as Command Center)
const firebaseConfig = {
    apiKey: "AIzaSyA2YSjOktRbinbKMjIy1pbd_Bkbwp3ruRY",
    authDomain: "vega-payne-command-center.firebaseapp.com",
    projectId: "vega-payne-command-center",
    storageBucket: "vega-payne-command-center.firebasestorage.app",
    messagingSenderId: "325061344708",
    appId: "1:325061344708:web:397bff2f1776308a997891",
    measurementId: "G-JHR2MYTHM1"
};

// Initialize Firebase
let auth, db;
let currentUser = null;

// Manager emails - these accounts get admin access
const MANAGER_EMAILS = ['kristyn.a.payne@gmail.com', 'jcvega805@gmail.com'];

// Caregiver/Employee ID
const EMPLOYEE_ID = 'kayden';

// State
const state = {
    isManager: false,
    shifts: [],
    hours: [],
    timeOffRequests: [],
    tasks: [],
    notes: [],
    contracts: [],
    unsubscribers: [],
    // Calendar state
    calendarView: 'week', // 'week' or 'month'
    currentDate: new Date(),
    editingShiftId: null
};

// Utility Functions
const utils = {
    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    },
    
    formatTime(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}:${minutes} ${ampm}`;
    },
    
    getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    getMonthName(num) {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
        return months[parseInt(num) - 1];
    },
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },
    
    linkifyText(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s<]+)/g;
        const escaped = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return escaped.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    },
    
    formatTimeShort(time) {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'p' : 'a';
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayHour}${minutes !== '00' ? ':' + minutes : ''}${ampm}`;
    },
    
    dateToString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    
    getWeekDates(date) {
        const d = new Date(date.getTime()); // Clone the date
        const day = d.getDay();
        d.setDate(d.getDate() - day); // Go to Sunday
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const current = new Date(d.getTime());
            current.setDate(d.getDate() + i);
            dates.push(current);
        }
        return dates;
    },
    
    getMonthDates(date) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        
        const dates = [];
        
        // Days from previous month
        const startPadding = firstDay.getDay();
        for (let i = startPadding - 1; i >= 0; i--) {
            const d = new Date(year, month, -i);
            dates.push({ date: d, otherMonth: true });
        }
        
        // Days of current month
        for (let i = 1; i <= lastDay.getDate(); i++) {
            dates.push({ date: new Date(year, month, i), otherMonth: false });
        }
        
        // Days from next month
        const endPadding = 6 - lastDay.getDay();
        for (let i = 1; i <= endPadding; i++) {
            dates.push({ date: new Date(year, month + 1, i), otherMonth: true });
        }
        
        return dates;
    },
    
    getWeekLabel(date) {
        const dates = this.getWeekDates(date);
        if (!dates || dates.length < 7) return 'Week';
        
        const start = dates[0];
        const end = dates[6];
        const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
        const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
        
        if (startMonth === endMonth) {
            return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
        } else {
            return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
        }
    },
    
    getMonthLabel(date) {
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
};

// Database Operations
const db_ops = {
    // Shifts
    async getShifts() {
        const snapshot = await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('shifts')
            .orderBy('date', 'asc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },
    
    async addShift(data) {
        return await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('shifts').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    async deleteShift(id) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('shifts').doc(id).delete();
    },
    
    async updateShift(id, data) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('shifts').doc(id).update({
                ...data,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    listenToShifts(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('shifts')
            .orderBy('date', 'asc')
            .onSnapshot(snapshot => {
                const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(shifts);
            });
    },
    
    // Hours
    async addHours(data) {
        return await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('hours').add({
                ...data,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    async updateHoursStatus(id, status) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('hours').doc(id).update({ status });
    },
    
    listenToHours(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('hours')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const hours = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(hours);
            });
    },
    
    // Time Off
    async addTimeOff(data) {
        return await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('timeOff').add({
                ...data,
                status: 'pending',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    async updateTimeOffStatus(id, status) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('timeOff').doc(id).update({ status });
    },
    
    listenToTimeOff(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('timeOff')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(requests);
            });
    },
    
    // Tasks (formerly Chores)
    async addTask(data) {
        return await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('tasks').add({
                ...data,
                completed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    async updateTask(id, data) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('tasks').doc(id).update(data);
    },
    
    async deleteTask(id) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('tasks').doc(id).delete();
    },
    
    async resetTasks() {
        const snapshot = await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('tasks').get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { completed: false });
        });
        await batch.commit();
    },
    
    listenToTasks(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('tasks')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(tasks);
            });
    },
    
    // Notes
    async addNote(data) {
        return await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('notes').add({
                ...data,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    async updateNote(id, data) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('notes').doc(id).update(data);
    },
    
    async deleteNote(id) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('notes').doc(id).delete();
    },
    
    listenToNotes(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('notes')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(notes);
            });
    },
    
    // Contracts
    async addContract(data) {
        const contractId = `${data.year}-${String(data.month).padStart(2, '0')}`;
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('contracts').doc(contractId).set({
                ...data,
                employeeSigned: false,
                managerSigned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        return contractId;
    },
    
    async signContract(id, role) {
        const field = role === 'employee' ? 'employeeSigned' : 'managerSigned';
        const dateField = role === 'employee' ? 'employeeSignedAt' : 'managerSignedAt';
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('contracts').doc(id).update({
                [field]: true,
                [dateField]: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    listenToContracts(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('contracts')
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(contracts);
            }, error => {
                console.error('Error listening to contracts:', error);
                callback([]);
            });
    }
};

// UI Rendering
const ui = {
    renderCalendar() {
        const container = document.getElementById('calendarView');
        const label = document.getElementById('periodLabel');
        
        if (!container || !label) {
            console.error('Calendar elements not found');
            return;
        }
        
        try {
            if (state.calendarView === 'week') {
                label.textContent = utils.getWeekLabel(state.currentDate);
                this.renderWeekView(container);
            } else {
                label.textContent = utils.getMonthLabel(state.currentDate);
                this.renderMonthView(container);
            }
        } catch (error) {
            console.error('Error rendering calendar:', error);
            container.innerHTML = '<div class="empty-state-text">Error loading calendar</div>';
        }
    },
    
    renderWeekView(container) {
        const dates = utils.getWeekDates(state.currentDate);
        const today = utils.getTodayString();
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        let html = '<div class="week-view">';
        
        dates.forEach((date, i) => {
            const dateStr = utils.dateToString(date);
            const isToday = dateStr === today;
            const dayShifts = state.shifts.filter(s => s.date === dateStr);
            
            html += `
                <div class="week-day">
                    <div class="day-label ${isToday ? 'today' : ''}">
                        ${dayNames[i]}
                        <span class="day-date">${date.getDate()}</span>
                    </div>
                    <div class="day-shifts" data-date="${dateStr}">
                        ${dayShifts.length > 0 ? dayShifts.map(s => `
                            <span class="shift-pill" data-id="${s.id}" data-action="editShift">
                                ${utils.formatTimeShort(s.startTime)}-${utils.formatTimeShort(s.endTime)}
                            </span>
                        `).join('') : '<span class="no-shifts">—</span>'}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    renderMonthView(container) {
        const dates = utils.getMonthDates(state.currentDate);
        const today = utils.getTodayString();
        const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
        
        let html = '<div class="month-view">';
        
        // Header row
        dayNames.forEach(name => {
            html += `<div class="month-header">${name}</div>`;
        });
        
        // Date cells
        dates.forEach(({ date, otherMonth }) => {
            const dateStr = utils.dateToString(date);
            const isToday = dateStr === today;
            const dayShifts = state.shifts.filter(s => s.date === dateStr);
            
            html += `
                <div class="month-day ${otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <div class="month-day-num">${date.getDate()}</div>
                    ${dayShifts.map(s => `
                        <div class="month-shift" data-id="${s.id}" data-action="editShift">
                            ${utils.formatTimeShort(s.startTime)}
                        </div>
                    `).join('')}
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },
    
    renderHours(hours) {
        const container = document.getElementById('hoursList');
        
        if (hours.length === 0) {
            container.innerHTML = `<div class="empty-state-text">No hours submitted yet</div>`;
            return;
        }
        
        container.innerHTML = hours.map(h => `
            <div class="hours-card" data-id="${h.id}">
                <div class="hours-date">${utils.formatDate(h.date)}</div>
                <div class="hours-amount">${h.hours} hours (${h.type})</div>
                ${h.notes ? `<div class="hours-notes">${h.notes}</div>` : ''}
                <span class="status-badge status-${h.status}">${h.status}</span>
                ${state.isManager && h.status === 'pending' ? `
                    <div class="manager-actions">
                        <button class="action-btn approve" data-action="approveHours" data-id="${h.id}">Approve</button>
                        <button class="action-btn deny" data-action="denyHours" data-id="${h.id}">Deny</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    },
    
    renderTimeOff(requests) {
        const container = document.getElementById('timeOffList');
        
        if (requests.length === 0) {
            container.innerHTML = `<div class="empty-state-text">No time off requests</div>`;
            return;
        }
        
        container.innerHTML = requests.map(req => `
            <div class="time-off-card" data-id="${req.id}">
                <div class="time-off-dates">${utils.formatDate(req.startDate)} - ${utils.formatDate(req.endDate)}</div>
                <div class="time-off-reason">${req.reason}</div>
                <span class="status-badge status-${req.status}">${req.status}</span>
                ${state.isManager && req.status === 'pending' ? `
                    <div class="manager-actions">
                        <button class="action-btn approve" data-action="approveTimeOff" data-id="${req.id}">Approve</button>
                        <button class="action-btn deny" data-action="denyTimeOff" data-id="${req.id}">Deny</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    },
    
    renderTasks(tasks) {
        const container = document.getElementById('tasksList');
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <div class="empty-state-text">No tasks assigned</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasks.map(task => `
            <div class="task-card ${task.completed ? 'completed' : ''}" data-id="${task.id}">
                <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-frequency">${task.frequency}</div>
                </div>
                ${state.isManager ? `
                    <button class="action-btn delete" data-action="deleteTask" data-id="${task.id}" style="flex: 0;">×</button>
                ` : ''}
            </div>
        `).join('');
    },
    
    renderNotes(notes) {
        const container = document.getElementById('notesList');
        
        if (notes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📋</div>
                    <div class="empty-state-text">No notes yet</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = notes.map(note => `
            <div class="note-card" data-id="${note.id}">
                <div class="note-title">${note.title}</div>
                <div class="note-content">${utils.linkifyText(note.content)}</div>
                ${state.isManager ? `
                    <div class="manager-actions">
                        <button class="action-btn delete" data-action="deleteNote" data-id="${note.id}">Delete</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    },
    
    renderContracts(contracts) {
        const currentContainer = document.getElementById('currentContract');
        const pastContainer = document.getElementById('pastContracts');
        
        if (contracts.length === 0) {
            currentContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📝</div>
                    <div class="empty-state-text">No contract yet</div>
                </div>
            `;
            pastContainer.innerHTML = '';
            return;
        }
        
        // Current contract is the most recent one
        const current = contracts[0];
        const past = contracts.slice(1);
        
        const bothSigned = current.employeeSigned && current.managerSigned;
        const statusClass = bothSigned ? 'status-approved' : 'status-pending';
        const statusText = bothSigned ? 'Active' : 'Pending Signatures';
        
        currentContainer.innerHTML = `
            <div class="contract-header">
                <div class="contract-title">${utils.getMonthName(current.month)} ${current.year}</div>
                <span class="contract-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="contract-section">
                <div class="contract-label">Hourly Rate</div>
                <div class="contract-value">$${parseFloat(current.rate).toFixed(2)}</div>
            </div>
            
            <div class="contract-section">
                <div class="contract-label">Expected Hours/Week</div>
                <div class="contract-value">${current.expectedHours} hours</div>
            </div>
            
            <div class="contract-section">
                <div class="contract-label">Primary Duties</div>
                <div class="contract-value contract-duties">${current.duties || 'Not specified'}</div>
            </div>
            
            ${current.terms ? `
                <div class="contract-section">
                    <div class="contract-label">Additional Terms</div>
                    <div class="contract-value contract-terms">${current.terms}</div>
                </div>
            ` : ''}
            
            <div class="contract-signatures">
                <div class="signature-row">
                    <span class="signature-label">Employee Signature:</span>
                    <span class="signature-status ${current.employeeSigned ? 'signed' : 'pending'}">
                        ${current.employeeSigned ? '✓ Signed' : 'Pending'}
                    </span>
                </div>
                <div class="signature-row">
                    <span class="signature-label">Manager Signature:</span>
                    <span class="signature-status ${current.managerSigned ? 'signed' : 'pending'}">
                        ${current.managerSigned ? '✓ Signed' : 'Pending'}
                    </span>
                </div>
            </div>
            
            <div class="contract-actions">
                ${!current.employeeSigned && !state.isManager ? `
                    <button class="primary-btn full-width" data-action="signContract" data-id="${current.id}" data-role="employee">
                        Sign Contract
                    </button>
                ` : ''}
                ${!current.managerSigned && state.isManager ? `
                    <button class="primary-btn full-width" data-action="signContract" data-id="${current.id}" data-role="manager">
                        Manager Sign
                    </button>
                ` : ''}
            </div>
        `;
        
        // Past contracts
        if (past.length === 0) {
            pastContainer.innerHTML = '<div class="empty-state-text">No past contracts</div>';
        } else {
            pastContainer.innerHTML = past.map(c => `
                <div class="past-contract-item" data-id="${c.id}">
                    <span>${utils.getMonthName(c.month)} ${c.year}</span>
                    <span class="status-badge ${c.employeeSigned && c.managerSigned ? 'status-approved' : 'status-pending'}">
                        ${c.employeeSigned && c.managerSigned ? 'Completed' : 'Incomplete'}
                    </span>
                </div>
            `).join('');
        }
    }
};

// Event Handlers Setup
function setupEventHandlers() {
    // Tab navigation
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });
    
    // Sign out
    document.getElementById('signOutBtn').addEventListener('click', () => {
        auth.signOut();
    });
    
    // === CALENDAR VIEW TOGGLE ===
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.calendarView = btn.dataset.view;
            ui.renderCalendar();
        });
    });
    
    // Calendar navigation
    document.getElementById('prevPeriod').addEventListener('click', () => {
        if (state.calendarView === 'week') {
            state.currentDate.setDate(state.currentDate.getDate() - 7);
        } else {
            state.currentDate.setMonth(state.currentDate.getMonth() - 1);
        }
        ui.renderCalendar();
    });
    
    document.getElementById('nextPeriod').addEventListener('click', () => {
        if (state.calendarView === 'week') {
            state.currentDate.setDate(state.currentDate.getDate() + 7);
        } else {
            state.currentDate.setMonth(state.currentDate.getMonth() + 1);
        }
        ui.renderCalendar();
    });
    
    // === SHIFTS ===
    document.getElementById('addShiftBtn').addEventListener('click', () => {
        state.editingShiftId = null;
        document.getElementById('shiftFormTitle').textContent = 'Add Shift';
        document.getElementById('shiftForm').style.display = 'block';
        document.getElementById('shiftDate').value = utils.getTodayString();
        document.getElementById('shiftStart').value = '';
        document.getElementById('shiftEnd').value = '';
        document.getElementById('shiftNotes').value = '';
    });
    
    document.getElementById('cancelShiftBtn')?.addEventListener('click', () => {
        document.getElementById('shiftForm').style.display = 'none';
        state.editingShiftId = null;
    });
    
    document.getElementById('saveShiftBtn')?.addEventListener('click', async () => {
        const date = document.getElementById('shiftDate').value;
        const startTime = document.getElementById('shiftStart').value;
        const endTime = document.getElementById('shiftEnd').value;
        const notes = document.getElementById('shiftNotes').value.trim();
        
        if (!date || !startTime || !endTime) {
            utils.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            if (state.editingShiftId) {
                await db_ops.updateShift(state.editingShiftId, { date, startTime, endTime, notes });
                utils.showToast('Shift updated! 🐔', 'success');
            } else {
                await db_ops.addShift({ date, startTime, endTime, notes });
                utils.showToast('Shift added! 🐔', 'success');
            }
            
            document.getElementById('shiftForm').style.display = 'none';
            state.editingShiftId = null;
        } catch (error) {
            console.error('Error saving shift:', error);
            utils.showToast('Failed to save shift: ' + error.message, 'error');
        }
    });
    
    // Click on shift to edit
    document.getElementById('calendarView').addEventListener('click', (e) => {
        const shiftEl = e.target.closest('[data-action="editShift"]');
        if (shiftEl) {
            const id = shiftEl.dataset.id;
            const shift = state.shifts.find(s => s.id === id);
            if (shift) {
                state.editingShiftId = id;
                document.getElementById('shiftFormTitle').textContent = 'Edit Shift';
                document.getElementById('shiftForm').style.display = 'block';
                document.getElementById('shiftDate').value = shift.date;
                document.getElementById('shiftStart').value = shift.startTime;
                document.getElementById('shiftEnd').value = shift.endTime;
                document.getElementById('shiftNotes').value = shift.notes || '';
            }
        }
    });
    
    // === HOURS ===
    document.getElementById('hoursDate').value = utils.getTodayString();
    
    document.getElementById('submitHoursBtn').addEventListener('click', async () => {
        const date = document.getElementById('hoursDate').value;
        const hours = parseFloat(document.getElementById('hoursWorked').value);
        const type = document.getElementById('hoursType').value;
        const notes = document.getElementById('hoursNotes').value.trim();
        
        if (!date || !hours) {
            utils.showToast('Please enter date and hours', 'error');
            return;
        }
        
        await db_ops.addHours({ date, hours, type, notes });
        document.getElementById('hoursWorked').value = '';
        document.getElementById('hoursNotes').value = '';
        utils.showToast('Hours submitted! ⏱️', 'success');
    });
    
    // === TIME OFF ===
    document.getElementById('submitTimeOffBtn').addEventListener('click', async () => {
        const startDate = document.getElementById('timeOffStart').value;
        const endDate = document.getElementById('timeOffEnd').value;
        const reason = document.getElementById('timeOffReason').value.trim();
        
        if (!startDate || !endDate) {
            utils.showToast('Please select dates', 'error');
            return;
        }
        
        await db_ops.addTimeOff({ startDate, endDate, reason });
        document.getElementById('timeOffStart').value = '';
        document.getElementById('timeOffEnd').value = '';
        document.getElementById('timeOffReason').value = '';
        utils.showToast('Request submitted! 🏖️', 'success');
    });
    
    // === TASKS ===
    document.getElementById('addTaskBtn')?.addEventListener('click', () => {
        document.getElementById('taskForm').style.display = 'block';
    });
    
    document.getElementById('cancelTaskBtn')?.addEventListener('click', () => {
        document.getElementById('taskForm').style.display = 'none';
    });
    
    document.getElementById('saveTaskBtn')?.addEventListener('click', async () => {
        const title = document.getElementById('taskTitle').value.trim();
        const frequency = document.getElementById('taskFrequency').value;
        
        if (!title) {
            utils.showToast('Please enter a task', 'error');
            return;
        }
        
        try {
            await db_ops.addTask({ title, frequency });
            document.getElementById('taskForm').style.display = 'none';
            document.getElementById('taskTitle').value = '';
            utils.showToast('Task added! ✓', 'success');
        } catch (error) {
            console.error('Error adding task:', error);
            utils.showToast('Failed to add task: ' + error.message, 'error');
        }
    });
    
    document.getElementById('resetTasksBtn')?.addEventListener('click', async () => {
        if (confirm('Reset all tasks to incomplete?')) {
            await db_ops.resetTasks();
            utils.showToast('Tasks reset for the week!', 'success');
        }
    });
    
    // Task checkbox
    document.getElementById('tasksList').addEventListener('change', async (e) => {
        if (e.target.classList.contains('task-checkbox')) {
            const id = e.target.dataset.id;
            await db_ops.updateTask(id, { completed: e.target.checked });
        }
    });
    
    // === NOTES ===
    document.getElementById('addNoteBtn')?.addEventListener('click', () => {
        document.getElementById('noteForm').style.display = 'block';
    });
    
    document.getElementById('cancelNoteBtn').addEventListener('click', () => {
        document.getElementById('noteForm').style.display = 'none';
    });
    
    document.getElementById('saveNoteBtn').addEventListener('click', async () => {
        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();
        
        if (!title) {
            utils.showToast('Please enter a title', 'error');
            return;
        }
        
        await db_ops.addNote({ title, content });
        document.getElementById('noteForm').style.display = 'none';
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteContent').value = '';
        utils.showToast('Note added! 📋', 'success');
    });
    
    // === CONTRACT ===
    document.getElementById('newContractBtn')?.addEventListener('click', () => {
        document.getElementById('contractForm').style.display = 'block';
        // Set current month
        const now = new Date();
        document.getElementById('contractMonth').value = now.getMonth() + 1;
        document.getElementById('contractYear').value = now.getFullYear();
    });
    
    document.getElementById('cancelContractBtn').addEventListener('click', () => {
        document.getElementById('contractForm').style.display = 'none';
    });
    
    document.getElementById('saveContractBtn').addEventListener('click', async () => {
        const month = parseInt(document.getElementById('contractMonth').value);
        const year = parseInt(document.getElementById('contractYear').value);
        const rate = parseFloat(document.getElementById('contractRate').value);
        const expectedHours = parseInt(document.getElementById('contractHours').value);
        const duties = document.getElementById('contractDuties').value.trim();
        const terms = document.getElementById('contractTerms').value.trim();
        
        if (!rate || !expectedHours) {
            utils.showToast('Please fill in rate and hours', 'error');
            return;
        }
        
        await db_ops.addContract({ month, year, rate, expectedHours, duties, terms });
        document.getElementById('contractForm').style.display = 'none';
        utils.showToast('Contract created! 📝', 'success');
    });
    
    // === ACTION BUTTONS (event delegation) ===
    document.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        const id = e.target.dataset.id;
        
        if (!action) return;
        
        switch (action) {
            case 'deleteShift':
                if (confirm('Delete this shift?')) {
                    await db_ops.deleteShift(id);
                    utils.showToast('Shift deleted', 'success');
                }
                break;
            case 'approveHours':
                await db_ops.updateHoursStatus(id, 'approved');
                utils.showToast('Hours approved! ✓', 'success');
                break;
            case 'denyHours':
                await db_ops.updateHoursStatus(id, 'denied');
                utils.showToast('Hours denied', 'warning');
                break;
            case 'approveTimeOff':
                await db_ops.updateTimeOffStatus(id, 'approved');
                utils.showToast('Time off approved! ✓', 'success');
                break;
            case 'denyTimeOff':
                await db_ops.updateTimeOffStatus(id, 'denied');
                utils.showToast('Time off denied', 'warning');
                break;
            case 'deleteTask':
                await db_ops.deleteTask(id);
                utils.showToast('Task removed', 'success');
                break;
            case 'deleteNote':
                if (confirm('Delete this note?')) {
                    await db_ops.deleteNote(id);
                    utils.showToast('Note deleted', 'success');
                }
                break;
            case 'signContract':
                const role = e.target.dataset.role;
                await db_ops.signContract(id, role);
                utils.showToast('Contract signed! ✍️', 'success');
                break;
        }
    });
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            state.isManager = MANAGER_EMAILS.includes(user.email);
            
            // Update UI for role
            document.getElementById('userRole').textContent = state.isManager ? '👔 Manager' : '🐔 Team';
            
            // Show/hide manager controls
            if (state.isManager) {
                document.getElementById('managerTaskControls').style.display = 'block';
                document.getElementById('managerNoteControls').style.display = 'block';
                document.getElementById('managerContractControls').style.display = 'block';
            }
            
            // Show app
            document.getElementById('signInScreen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            // Setup listeners
            state.unsubscribers.push(db_ops.listenToShifts(shifts => {
                state.shifts = shifts;
                ui.renderCalendar();
            }));
            
            state.unsubscribers.push(db_ops.listenToHours(hours => {
                state.hours = hours;
                ui.renderHours(hours);
            }));
            
            state.unsubscribers.push(db_ops.listenToTimeOff(requests => {
                state.timeOffRequests = requests;
                ui.renderTimeOff(requests);
            }));
            
            state.unsubscribers.push(db_ops.listenToTasks(tasks => {
                state.tasks = tasks;
                ui.renderTasks(tasks);
            }));
            
            state.unsubscribers.push(db_ops.listenToNotes(notes => {
                state.notes = notes;
                ui.renderNotes(notes);
            }));
            
            state.unsubscribers.push(db_ops.listenToContracts(contracts => {
                state.contracts = contracts;
                ui.renderContracts(contracts);
            }));
            
            // Setup event handlers
            if (!window.handlersSetup) {
                setupEventHandlers();
                window.handlersSetup = true;
            }
            
        } else {
            // Show sign in
            document.getElementById('signInScreen').style.display = 'flex';
            document.getElementById('app').style.display = 'none';
            
            // Cleanup
            state.unsubscribers.forEach(unsub => unsub());
            state.unsubscribers = [];
        }
    });
    
    // Sign in button
    document.getElementById('signInBtn').addEventListener('click', async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
        } catch (error) {
            console.error('Sign in error:', error);
            utils.showToast('Sign in failed', 'error');
        }
    });
});
