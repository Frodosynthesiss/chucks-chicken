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

// Manager email - UPDATE THIS to your email
const MANAGER_EMAIL = 'kristynvp@gmail.com';

// Caregiver/Employee ID
const EMPLOYEE_ID = 'kayden';

// State
const state = {
    isManager: false,
    shifts: [],
    hours: [],
    timeOffRequests: [],
    chores: [],
    notes: [],
    contracts: [],
    unsubscribers: []
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
    
    // Chores
    async addChore(data) {
        return await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('chores').add({
                ...data,
                completed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
    },
    
    async updateChore(id, data) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('chores').doc(id).update(data);
    },
    
    async deleteChore(id) {
        await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('chores').doc(id).delete();
    },
    
    async resetChores() {
        const snapshot = await db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('chores').get();
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { completed: false });
        });
        await batch.commit();
    },
    
    listenToChores(callback) {
        return db.collection('caregivers').doc(EMPLOYEE_ID)
            .collection('chores')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                const chores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(chores);
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
            .orderBy('year', 'desc')
            .orderBy('month', 'desc')
            .onSnapshot(snapshot => {
                const contracts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(contracts);
            });
    }
};

// UI Rendering
const ui = {
    renderShifts(shifts) {
        const container = document.getElementById('shiftsList');
        
        // Filter to upcoming shifts (today and future)
        const today = utils.getTodayString();
        const upcomingShifts = shifts.filter(s => s.date >= today);
        
        if (upcomingShifts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📅</div>
                    <div class="empty-state-text">No upcoming shifts scheduled</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = upcomingShifts.map(shift => `
            <div class="shift-card" data-id="${shift.id}">
                <div class="shift-date">${utils.formatDate(shift.date)}</div>
                <div class="shift-time">${utils.formatTime(shift.startTime)} - ${utils.formatTime(shift.endTime)}</div>
                ${shift.notes ? `<div class="shift-notes">${shift.notes}</div>` : ''}
                ${state.isManager ? `
                    <div class="manager-actions">
                        <button class="action-btn delete" data-action="deleteShift" data-id="${shift.id}">Delete</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
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
    
    renderChores(chores) {
        const container = document.getElementById('choresList');
        
        if (chores.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <div class="empty-state-text">No chores assigned</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = chores.map(chore => `
            <div class="chore-card ${chore.completed ? 'completed' : ''}" data-id="${chore.id}">
                <input type="checkbox" class="chore-checkbox" data-id="${chore.id}" ${chore.completed ? 'checked' : ''}>
                <div class="chore-info">
                    <div class="chore-title">${chore.title}</div>
                    <div class="chore-frequency">${chore.frequency}</div>
                </div>
                ${state.isManager ? `
                    <button class="action-btn delete" data-action="deleteChore" data-id="${chore.id}" style="flex: 0;">×</button>
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
    
    // === SHIFTS ===
    document.getElementById('addShiftBtn')?.addEventListener('click', () => {
        document.getElementById('shiftForm').style.display = 'block';
        document.getElementById('shiftDate').value = utils.getTodayString();
    });
    
    document.getElementById('cancelShiftBtn').addEventListener('click', () => {
        document.getElementById('shiftForm').style.display = 'none';
    });
    
    document.getElementById('saveShiftBtn').addEventListener('click', async () => {
        const date = document.getElementById('shiftDate').value;
        const startTime = document.getElementById('shiftStart').value;
        const endTime = document.getElementById('shiftEnd').value;
        const notes = document.getElementById('shiftNotes').value.trim();
        
        if (!date || !startTime || !endTime) {
            utils.showToast('Please fill in all required fields', 'error');
            return;
        }
        
        await db_ops.addShift({ date, startTime, endTime, notes });
        document.getElementById('shiftForm').style.display = 'none';
        document.getElementById('shiftNotes').value = '';
        utils.showToast('Shift added! 🐔', 'success');
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
    
    // === CHORES ===
    document.getElementById('addChoreBtn')?.addEventListener('click', () => {
        document.getElementById('choreForm').style.display = 'block';
    });
    
    document.getElementById('cancelChoreBtn').addEventListener('click', () => {
        document.getElementById('choreForm').style.display = 'none';
    });
    
    document.getElementById('saveChoreBtn').addEventListener('click', async () => {
        const title = document.getElementById('choreTitle').value.trim();
        const frequency = document.getElementById('choreFrequency').value;
        
        if (!title) {
            utils.showToast('Please enter a chore', 'error');
            return;
        }
        
        await db_ops.addChore({ title, frequency });
        document.getElementById('choreForm').style.display = 'none';
        document.getElementById('choreTitle').value = '';
        utils.showToast('Chore added! 🧹', 'success');
    });
    
    document.getElementById('resetChoresBtn')?.addEventListener('click', async () => {
        if (confirm('Reset all chores to incomplete?')) {
            await db_ops.resetChores();
            utils.showToast('Chores reset for the week!', 'success');
        }
    });
    
    // Chore checkbox
    document.getElementById('choresList').addEventListener('change', async (e) => {
        if (e.target.classList.contains('chore-checkbox')) {
            const id = e.target.dataset.id;
            await db_ops.updateChore(id, { completed: e.target.checked });
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
            case 'deleteChore':
                await db_ops.deleteChore(id);
                utils.showToast('Chore removed', 'success');
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
            state.isManager = user.email === MANAGER_EMAIL;
            
            // Update UI for role
            document.getElementById('userRole').textContent = state.isManager ? '👔 Manager' : '🐔 Team';
            
            // Show/hide manager controls
            if (state.isManager) {
                document.getElementById('managerShiftControls').style.display = 'block';
                document.getElementById('managerChoreControls').style.display = 'block';
                document.getElementById('managerNoteControls').style.display = 'block';
                document.getElementById('managerContractControls').style.display = 'block';
            }
            
            // Show app
            document.getElementById('signInScreen').style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            
            // Setup listeners
            state.unsubscribers.push(db_ops.listenToShifts(shifts => {
                state.shifts = shifts;
                ui.renderShifts(shifts);
            }));
            
            state.unsubscribers.push(db_ops.listenToHours(hours => {
                state.hours = hours;
                ui.renderHours(hours);
            }));
            
            state.unsubscribers.push(db_ops.listenToTimeOff(requests => {
                state.timeOffRequests = requests;
                ui.renderTimeOff(requests);
            }));
            
            state.unsubscribers.push(db_ops.listenToChores(chores => {
                state.chores = chores;
                ui.renderChores(chores);
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
