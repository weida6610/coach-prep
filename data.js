// ============================================
// Data Layer — Firestore + In-memory Cache
// ============================================

const GAS_SYNC_URL = 'https://script.google.com/macros/s/AKfycbzvPNPcwRNTnVPsnxJOU3__pOGYEnw7851tV78IK-ucb0AHAvUHBJXtS4SPGiW9MGtZfw/exec';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #00e5a0, #00b4d8)',
  'linear-gradient(135deg, #6c5ce7, #a855f7)',
  'linear-gradient(135deg, #f97316, #fbbf24)',
  'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  'linear-gradient(135deg, #74b9ff, #0984e3)',
  'linear-gradient(135deg, #fd79a8, #e84393)',
];

// ============================================
// Firebase 設定
// ============================================
const firebaseConfig = {
  apiKey: 'AIzaSyBGZFWML4XFJ49HBr66aJmnQsC9TYWZpvc',
  authDomain: 'rbtc-coach-prep.firebaseapp.com',
  projectId: 'rbtc-coach-prep',
  storageBucket: 'rbtc-coach-prep.firebasestorage.app',
  messagingSenderId: '905088928318',
  appId: '1:905088928318:web:1a455820caed5c41b5df6f'
};
firebase.initializeApp(firebaseConfig);
const _fsdb = firebase.firestore();

// 匿名登入：Firestore 規則要求 request.auth != null（測試模式已到期）
const _authReady = firebase.auth().signInAnonymously()
  .then(() => console.log('✅ 匿名登入成功'))
  .catch(err => console.error('❌ 匿名登入失敗:', err));

// 啟用離線持久化：斷網/手機沒電時仍能讀取本地快取，不會誤判為空資料庫
_fsdb.enablePersistence({ synchronizeTabs: true }).catch(err => {
  console.warn('Firestore persistence 未啟用:', err.code);
});

// ============================================
// Dashboard 自動重畫（debounce 300ms，避免 GAS 連續寫入造成多次 re-render）
// 只在使用者停留於 dashboard 且無 modal 開啟時觸發
// ============================================
let _dashRefreshTimer = null;
function _scheduleDashboardRefresh() {
  if (_dashRefreshTimer) clearTimeout(_dashRefreshTimer);
  _dashRefreshTimer = setTimeout(() => {
    _dashRefreshTimer = null;
    if (typeof navigationStack === 'undefined' || !navigationStack.length) return;
    const curr = navigationStack[navigationStack.length - 1];
    if (curr.view !== 'dashboard') return;
    if (document.querySelector('.modal-overlay.active')) return;
    if (typeof renderView === 'function') renderView('dashboard');
  }, 300);
}

// ============================================
// DB — Firestore + In-memory Cache
// ============================================
const DB = {
  _cache: { students: [], sessions: [], exercises: [], schedule: [], bodyData: [], prepPlans: {} },

  // ── 初始化：從 Firestore 載入資料，設定即時監聽 ──
  async init() {
    try {
      await _authReady;  // 等匿名登入完成，才符合 Firestore rules
      const [studSnap, sesSnap, exSnap, schSnap, bdSnap, ppSnap] = await Promise.all([
        _fsdb.collection('students').get(),
        _fsdb.collection('sessions').get(),
        _fsdb.collection('exercises').get(),
        _fsdb.collection('schedule').get(),
        _fsdb.collection('body_data').get(),
        _fsdb.collection('prep_plans').get(),
      ]);

      this._cache.students  = studSnap.docs.map(d => d.data());
      this._cache.sessions  = sesSnap.docs.map(d => d.data());
      this._cache.exercises = exSnap.docs.map(d => d.data());
      this._cache.schedule  = schSnap.docs.map(d => d.data());
      this._cache.bodyData  = bdSnap.docs.map(d => d.data());
      this._cache.prepPlans = {};
      ppSnap.docs.forEach(d => { this._cache.prepPlans[d.id] = d.data(); });

      // 即時監聽：其他裝置有更動時自動同步
      _fsdb.collection('students').onSnapshot(snap => {
        this._cache.students = snap.docs.map(d => d.data());
      });
      _fsdb.collection('sessions').onSnapshot(snap => {
        this._cache.sessions = snap.docs.map(d => d.data());
      });
      _fsdb.collection('exercises').onSnapshot(snap => {
        this._cache.exercises = snap.docs.map(d => d.data());
      });
      _fsdb.collection('schedule').onSnapshot(snap => {
        this._cache.schedule = snap.docs.map(d => d.data());
        _scheduleDashboardRefresh();
      });
      _fsdb.collection('body_data').onSnapshot(snap => {
        this._cache.bodyData = snap.docs.map(d => d.data());
      });
      _fsdb.collection('prep_plans').onSnapshot(snap => {
        snap.docChanges().forEach(chg => {
          if (chg.type === 'removed') delete this._cache.prepPlans[chg.doc.id];
          else this._cache.prepPlans[chg.doc.id] = chg.doc.data();
        });
      });
    } catch(e) {
      console.error('Firebase 初始化失敗', e);
    }
  },

  // ── 舊有 GAS 同步：不再需要，保留空實作避免 app.js 報錯 ──
  async syncFromCloud() { return false; },

  // ── 學員 ──
  getStudents() {
    return [...this._cache.students];
  },

  getStudent(id) {
    return this._cache.students.find(s => s.id === id);
  },

  saveStudent(student) {
    const idx = this._cache.students.findIndex(s => s.id === student.id);
    if (idx >= 0) {
      this._cache.students[idx] = student;
    } else {
      if (!student.id) {
        student.id = 'S' + Date.now();
        student.avatarColor = AVATAR_COLORS[this._cache.students.length % AVATAR_COLORS.length];
        student.totalSessions = student.totalSessions || 0;
      }
      this._cache.students.push(student);
    }
    _fsdb.collection('students').doc(student.id).set(student);
    return student;
  },

  deleteStudent(id) {
    const idx = this._cache.students.findIndex(s => s.id === id);
    if (idx < 0) return false;
    this._cache.students.splice(idx, 1);
    _fsdb.collection('students').doc(id).delete();
    // 同步刪除該學員的訓練紀錄
    const relatedSessions = this._cache.sessions.filter(s => s.studentId === id);
    this._cache.sessions = this._cache.sessions.filter(s => s.studentId !== id);
    relatedSessions.forEach(s => _fsdb.collection('sessions').doc(s.id).delete());
    return true;
  },

  // ── 訓練紀錄 ──
  getSessions(studentId) {
    return this._cache.sessions
      .filter(s => !studentId || s.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getSession(id) {
    return this._cache.sessions.find(s => s.id === id);
  },

  saveSession(session) {
    if (!session.id) {
      session.id = `LOG-${session.date.replace(/-/g,'')}-${session.studentId}`;
    }
    const idx = this._cache.sessions.findIndex(s => s.id === session.id);
    const isNew = idx < 0;
    if (isNew) {
      this._cache.sessions.push(session);
    } else {
      this._cache.sessions[idx] = session;
    }
    // 更新學員堂數
    if (isNew) {
      const student = this._cache.students.find(s => s.id === session.studentId);
      if (student) {
        student.totalSessions = (student.totalSessions || 0) + 1;
        const remaining = parseInt(student.remainingCourseSessions, 10);
        if (Number.isFinite(remaining) && remaining > 0) {
          student.remainingCourseSessions = remaining - 1;
        }
        _fsdb.collection('students').doc(student.id).set(student);
      }
    }
    _fsdb.collection('sessions').doc(session.id).set(session);
    return session;
  },

  deleteSession(id) {
    const idx = this._cache.sessions.findIndex(s => s.id === id);
    if (idx < 0) return false;
    const session = this._cache.sessions[idx];
    this._cache.sessions.splice(idx, 1);
    _fsdb.collection('sessions').doc(id).delete();
    // 遞減學員堂數
    const student = this._cache.students.find(s => s.id === session.studentId);
    if (student && student.totalSessions > 0) {
      student.totalSessions--;
      const remaining = parseInt(student.remainingCourseSessions, 10);
      if (Number.isFinite(remaining)) {
        student.remainingCourseSessions = remaining + 1;
      }
      _fsdb.collection('students').doc(student.id).set(student);
    }
    // 同步刪除同日身體數據
    const bdId = `BD-${session.studentId}-${session.date}`;
    const bdIdx = this._cache.bodyData.findIndex(d => d.id === bdId);
    if (bdIdx >= 0) {
      this._cache.bodyData.splice(bdIdx, 1);
      _fsdb.collection('body_data').doc(bdId).delete();
    }
    return true;
  },

  // ── 動作庫 ──
  getExercises(category) {
    const exs = [...this._cache.exercises];
    return category && category !== '全部' ? exs.filter(e => e.category === category) : exs;
  },

  saveExercise(exercise) {
    if (!exercise.id) exercise.id = 'E' + Date.now();
    const idx = this._cache.exercises.findIndex(e => e.id === exercise.id);
    if (idx >= 0) this._cache.exercises[idx] = exercise;
    else this._cache.exercises.push(exercise);
    _fsdb.collection('exercises').doc(exercise.id).set(exercise);
    return exercise;
  },

  deleteExercise(id) {
    const idx = this._cache.exercises.findIndex(e => e.id === id);
    if (idx < 0) return false;
    this._cache.exercises.splice(idx, 1);
    _fsdb.collection('exercises').doc(id).delete();
    return true;
  },

  // ── 今日課表 ──
  getSchedule() {
    return [...this._cache.schedule].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  },

  saveScheduleItem(item) {
    if (!item.id) item.id = 'SCH-' + Date.now();
    const idx = this._cache.schedule.findIndex(s => s.id === item.id);
    if (idx >= 0) this._cache.schedule[idx] = item;
    else this._cache.schedule.push(item);
    _fsdb.collection('schedule').doc(item.id).set(item);
    return item;
  },

  deleteScheduleItem(id) {
    const idx = this._cache.schedule.findIndex(s => s.id === id);
    if (idx < 0) return false;
    this._cache.schedule.splice(idx, 1);
    _fsdb.collection('schedule').doc(id).delete();
    return true;
  },

  // ── 身體數據 ──
  getBodyData(studentId) {
    return this._cache.bodyData
      .filter(d => d.studentId === studentId)
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  saveBodyData(record) {
    // id = studentId + date，同一天只存一筆（覆蓋）
    if (!record.id) record.id = `BD-${record.studentId}-${record.date}`;
    const idx = this._cache.bodyData.findIndex(d => d.id === record.id);
    if (idx >= 0) this._cache.bodyData[idx] = record;
    else this._cache.bodyData.push(record);
    _fsdb.collection('body_data').doc(record.id).set(record);
    return record;
  },

  // ── 備課計畫（跨裝置同步）──
  // Firestore doc id = studentId。本地 localStorage 作為離線 fallback
  getPrepPlan(studentId) {
    const cloud = this._cache.prepPlans[studentId];
    if (cloud) return cloud;
    try {
      const local = localStorage.getItem(`prep_${studentId}`);
      return local ? JSON.parse(local) : null;
    } catch(e) { return null; }
  },

  savePrepPlan(studentId, data) {
    const record = {
      studentId,
      exercises: data.exercises || [],
      notes: data.notes || '',
      updatedAt: Date.now(),
    };
    this._cache.prepPlans[studentId] = record;
    try { localStorage.setItem(`prep_${studentId}`, JSON.stringify({ exercises: record.exercises, notes: record.notes })); } catch(e) {}
    _fsdb.collection('prep_plans').doc(studentId).set(record);
    return record;
  },

  deletePrepPlan(studentId) {
    delete this._cache.prepPlans[studentId];
    try { localStorage.removeItem(`prep_${studentId}`); } catch(e) {}
    _fsdb.collection('prep_plans').doc(studentId).delete();
  },
};
