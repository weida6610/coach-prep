// ============================================
// App Core — Router, Events, Utilities
// ============================================

let navigationStack = [];
let sessionTimerInterval = null;

// ============================================
// Utilities
// ============================================
function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth()+1}/${d.getDate()} (${['日','一','二','三','四','五','六'][d.getDay()]})`;
}

function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

// ============================================
// Navigation / Router
// ============================================
function navigate(view, param) {
  navigationStack.push({ view, param });
  renderView(view, param);
}

function goBack() {
  navigationStack.pop(); // current
  const prev = navigationStack.pop();
  if (prev) navigate(prev.view, prev.param);
  else navigate('dashboard');
}

function renderView(view, param) {
  const content = document.getElementById('app-content');
  const backBtn = document.getElementById('btn-back');
  const title = document.getElementById('header-title');
  const actionBtn = document.getElementById('btn-header-action');
  const nav = document.getElementById('bottom-nav');

  // Clear timer if leaving session
  if (view !== 'session' && sessionTimerInterval) {
    clearInterval(sessionTimerInterval);
    sessionTimerInterval = null;
  }

  // Update nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navTarget = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navTarget) navTarget.classList.add('active');

  // Defaults
  backBtn.style.display = 'none';
  actionBtn.style.display = 'none';
  nav.style.display = 'flex';

  switch (view) {
    case 'dashboard':
      title.textContent = '今日課程';
      content.innerHTML = renderDashboard();
      break;

    case 'students':
      title.textContent = '學員管理';
      actionBtn.style.display = 'flex';
      actionBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      actionBtn.onclick = () => navigate('add-student');
      content.innerHTML = renderStudents();
      break;

    case 'student-detail':
      backBtn.style.display = 'flex';
      title.textContent = '學員資料';
      content.innerHTML = renderStudentDetail(param);
      break;

    case 'add-student':
      backBtn.style.display = 'flex';
      title.textContent = '新增學員';
      content.innerHTML = renderAddStudent();
      break;

    case 'edit-student':
      backBtn.style.display = 'flex';
      title.textContent = '編輯學員';
      content.innerHTML = renderAddStudent(param);
      break;

    case 'prep':
      backBtn.style.display = 'flex';
      title.textContent = '備課';
      currentSessionState = null;
      content.innerHTML = renderPrep(param);
      break;

    case 'session':
      backBtn.style.display = 'none';
      title.textContent = '上課中';
      nav.style.display = 'none';
      content.innerHTML = renderSession(param);
      startTimer();
      break;

    case 'session-detail':
      backBtn.style.display = 'flex';
      title.textContent = '課程紀錄';
      content.innerHTML = renderSessionDetail(param);
      break;

    case 'exercises':
      title.textContent = '動作庫';
      actionBtn.style.display = 'flex';
      actionBtn.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      actionBtn.onclick = () => navigate('add-exercise');
      content.innerHTML = renderExercises();
      break;

    case 'add-exercise':
      backBtn.style.display = 'flex';
      title.textContent = '新增動作';
      content.innerHTML = renderAddExercise();
      break;

    case 'history':
      title.textContent = '訓練紀錄';
      content.innerHTML = renderHistory();
      break;

    default:
      content.innerHTML = renderDashboard();
  }

  // Scroll to top
  content.scrollTop = 0;
  window.scrollTo(0, 0);
}

// ============================================
// Student Functions
// ============================================
function filterStudents(query) {
  const cards = document.querySelectorAll('.student-card');
  cards.forEach(card => {
    const name = card.dataset.name || '';
    card.style.display = name.includes(query) ? '' : 'none';
  });
}

function saveStudentForm(existingId) {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { showToast('❌ 請輸入姓名'); return; }

  const student = existingId ? { ...DB.getStudent(existingId) } : {};
  student.name = name;
  student.age = parseInt(document.getElementById('f-age').value) || '';
  student.phone = document.getElementById('f-phone').value.trim();
  student.goals = document.getElementById('f-goals').value.trim();
  student.medicalHistory = document.getElementById('f-medical').value.trim();
  student.nktFindings = document.getElementById('f-nkt').value.trim();
  student.currentPhase = document.getElementById('f-phase').value;
  student.notes = document.getElementById('f-notes').value.trim();

  if (existingId) student.id = existingId;
  DB.saveStudent(student);
  showToast(existingId ? '✅ 學員資料已更新' : '✅ 學員已新增');
  goBack();
}

// ============================================
// Exercise Functions
// ============================================
function filterExercises(query) {
  const cards = document.querySelectorAll('.exercise-lib-card');
  cards.forEach(card => {
    const name = card.dataset.name || '';
    card.style.display = name.includes(query) ? '' : 'none';
  });
}

function selectExerciseCategory(category) {
  document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  const cards = document.querySelectorAll('.exercise-lib-card');
  cards.forEach(card => {
    if (category === '全部') { card.style.display = ''; return; }
    card.style.display = card.dataset.category === category ? '' : 'none';
  });
}

function saveExerciseForm() {
  const name = document.getElementById('fe-name').value.trim();
  if (!name) { showToast('❌ 請輸入動作名稱'); return; }

  DB.saveExercise({
    name,
    category: document.getElementById('fe-category').value,
    target: document.getElementById('fe-target').value.trim(),
    defaultSets: parseInt(document.getElementById('fe-sets').value) || 3,
    defaultReps: document.getElementById('fe-reps').value.trim() || '10',
    cues: document.getElementById('fe-cues').value.trim()
  });
  showToast('✅ 動作已新增');
  goBack();
}

// ============================================
// Prep Functions
// ============================================
function removePrepExercise(idx) {
  currentPrepPlan.splice(idx, 1);
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
}

function showExercisePicker(studentId) {
  const exercises = DB.getExercises();
  const catEmojis = { '暖身':'🏃', 'NKT檢測':'🔬', '矯正動作':'🔧', '肌力訓練':'🏋️' };

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">選擇動作</div></div>
    <div style="padding:0 16px 8px">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="搜尋動作..." oninput="filterModalExercises(this.value)">
      </div>
    </div>
    <div style="padding:0 16px 24px;max-height:50vh;overflow-y:auto" id="modal-exercise-list">
      ${exercises.map(e => `
        <div class="exercise-lib-card" data-name="${e.name}" onclick="addExerciseToPrep('${e.id}','${studentId}')">
          <div class="exercise-icon ${e.category === '暖身' ? 'warmup' : e.category === '矯正動作' ? 'corrective' : e.category === 'NKT檢測' ? 'nkt' : 'strength'}">${catEmojis[e.category] || '💪'}</div>
          <div class="exercise-lib-info">
            <div class="exercise-lib-name">${e.name}</div>
            <div class="exercise-lib-meta">${e.target} · ${e.defaultSets}×${e.defaultReps}</div>
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

function filterModalExercises(query) {
  document.querySelectorAll('#modal-exercise-list .exercise-lib-card').forEach(card => {
    card.style.display = (card.dataset.name || '').includes(query) ? '' : 'none';
  });
}

function addExerciseToPrep(exerciseId, studentId) {
  const ex = DB.getExercises().find(e => e.id === exerciseId);
  if (ex) {
    currentPrepPlan.push({
      exerciseId: ex.id, name: ex.name, category: ex.category,
      sets: ex.defaultSets, reps: ex.defaultReps, weight: '-', cues: ex.cues || ''
    });
    closeModal();
    showToast(`✅ 已加入 ${ex.name}`);
    // Re-render prep
    navigationStack.pop();
    navigate('prep', studentId);
  }
}

// ============================================
// Session Functions
// ============================================
function startSession(studentId) {
  currentSessionState = null;
  navigate('session', studentId);
}

function startQuickSession() {
  const students = DB.getStudents();
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">選擇學員</div></div>
    <div style="padding:0 16px 24px">
      ${students.map(s => `
        <div class="student-card" onclick="closeModal();navigate('prep','${s.id}');" style="margin-bottom:8px">
          <div class="student-avatar" style="background:${s.avatarColor}">${s.name.charAt(0)}</div>
          <div class="student-info">
            <div class="student-name">${s.name}</div>
            <div class="student-meta">${s.currentPhase} · ${s.goals}</div>
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

function startTimer() {
  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  const startTime = currentSessionState?.startTime || Date.now();
  sessionTimerInterval = setInterval(() => {
    const el = document.getElementById('session-timer');
    if (!el) return;
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const min = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const sec = String(elapsed % 60).padStart(2, '0');
    el.textContent = `${min}:${sec}`;
  }, 1000);
}

function toggleSet(idx) {
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  ex.completedSets[idx] = !ex.completedSets[idx];
  const cards = document.querySelectorAll('.set-card');
  cards[idx]?.classList.toggle('completed');
  const repsEl = cards[idx]?.querySelector('.set-reps');
  if (repsEl) repsEl.textContent = ex.completedSets[idx] ? '✅' : ex.reps;
}

function setQuality(q) {
  currentSessionState.exercises[currentSessionState.currentExIdx].quality = q;
  document.querySelectorAll('.quality-btn').forEach(b => {
    b.classList.toggle('selected', b.textContent.includes(q));
  });
}

function updateExerciseNote(val) {
  currentSessionState.exercises[currentSessionState.currentExIdx].notes = val;
}

function adjustWeight(delta) {
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  const match = ex.actualWeight.match(/(\d+)/);
  if (match) {
    const newVal = Math.max(0, parseInt(match[1]) + delta * 2);
    ex.actualWeight = ex.actualWeight.replace(match[1], String(newVal));
    const el = document.getElementById('current-weight');
    if (el) el.textContent = ex.actualWeight;
  }
}

function toggleCondition(c) {
  const idx = currentSessionState.conditions.indexOf(c);
  if (idx >= 0) currentSessionState.conditions.splice(idx, 1);
  else currentSessionState.conditions.push(c);
  // Re-render just the tag
  event.target.classList.toggle('selected');
}

function nextExercise() {
  if (currentSessionState.currentExIdx < currentSessionState.exercises.length - 1) {
    currentSessionState.currentExIdx++;
    renderView('session', currentSessionState.studentId);
  }
}

function prevExercise() {
  if (currentSessionState.currentExIdx > 0) {
    currentSessionState.currentExIdx--;
    renderView('session', currentSessionState.studentId);
  }
}

function saveSession() {
  const state = currentSessionState;
  const session = {
    studentId: state.studentId,
    date: getTodayStr(),
    sessionType: determineSessionType(state.exercises),
    exercises: state.exercises.map(e => ({
      exerciseId: e.exerciseId, name: e.name,
      sets: e.sets, reps: e.reps, weight: e.actualWeight,
      completed: e.completedSets, quality: e.quality || '未評',
      notes: e.notes
    })),
    conditionNotes: state.conditions.join('、'),
    coachNotes: state.overallNotes,
    nextSuggestion: ''
  };

  DB.saveSession(session);
  currentSessionState = null;
  currentPrepPlan = [];
  if (sessionTimerInterval) { clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
  showToast('✅ 課程紀錄已儲存！');
  navigationStack = [];
  navigate('dashboard');
}

function determineSessionType(exercises) {
  const cats = exercises.map(e => e.category);
  if (cats.includes('NKT檢測')) return 'NKT檢測';
  const hasCorrectiveex = cats.includes('矯正動作');
  const hasStrength = cats.includes('肌力訓練');
  if (hasCorrectiveex && hasStrength) return '混合';
  if (hasCorrectiveex) return '矯正訓練';
  if (hasStrength) return '肌力訓練';
  return '其他';
}

// ============================================
// Modal & Action Sheet
// ============================================
function closeModal(e) {
  if (e && e.target !== document.getElementById('modal-overlay')) return;
  document.getElementById('modal-overlay').classList.remove('active');
}

function showQuickAction() {
  document.getElementById('action-sheet').classList.add('active');
}

function closeActionSheet(e) {
  if (e && e.target !== document.getElementById('action-sheet')) return;
  document.getElementById('action-sheet').classList.remove('active');
}

// ============================================
// PWA Registration
// ============================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.log('SW:', err));
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  navigate('dashboard');
});
