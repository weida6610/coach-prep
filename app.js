// ============================================
// App Core — Router, Events, Utilities
// ============================================

let navigationStack = [];
let sessionTimerInterval = null;
let sessionAutoSaveInterval = null;
let modalReturnScrollPosition = null;

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

function getScrollPosition() {
  const content = document.getElementById('app-content');
  const lockedBodyTop = document.body.style.position === 'fixed'
    ? Math.abs(parseFloat(document.body.style.top || '0')) || 0
    : null;
  return {
    contentScrollTop: content ? content.scrollTop : 0,
    windowScrollY: lockedBodyTop ?? (window.scrollY || window.pageYOffset || 0),
    anchor: getVisiblePrepAnchor()
  };
}

function getVisiblePrepAnchor() {
  const anchorCandidates = document.querySelectorAll('[id^="prep-ex-"], #prep-add-exercise-btn, #prep-notes');
  const viewportTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 60;
  const viewportBottom = window.innerHeight || document.documentElement.clientHeight || 0;

  for (const el of anchorCandidates) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom > viewportTop + 8 && rect.top < viewportBottom - 8) {
      return { id: el.id, top: rect.top };
    }
  }
  return null;
}

function restoreVisibleAnchor(anchor) {
  if (!anchor?.id) return false;
  const el = document.getElementById(anchor.id);
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  window.scrollTo(0, (window.scrollY || window.pageYOffset || 0) + rect.top - anchor.top);
  return true;
}

function rememberModalReturnScrollPosition() {
  modalReturnScrollPosition = getScrollPosition();
  return modalReturnScrollPosition;
}

function getModalReturnScrollPosition() {
  return modalReturnScrollPosition || getScrollPosition();
}

function rememberCurrentRouteScrollPosition() {
  const current = navigationStack[navigationStack.length - 1];
  if (current) current.scrollPosition = getScrollPosition();
}

function restoreScrollPosition(position) {
  const pos = position || getScrollPosition();
  const content = document.getElementById('app-content');
  const html = document.documentElement;
  const previousBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';

  const apply = () => {
    if (content) content.scrollTop = pos.contentScrollTop || 0;
    window.scrollTo(0, pos.windowScrollY || 0);
    restoreVisibleAnchor(pos.anchor);
  };

  apply();
  requestAnimationFrame(apply);
  [0, 80, 160, 320].forEach(delay => setTimeout(apply, delay));
  setTimeout(() => {
    apply();
    html.style.scrollBehavior = previousBehavior;
  }, 360);
}

// ============================================
// Navigation / Router
// ============================================
function navigate(view, param) {
  rememberCurrentRouteScrollPosition();
  navigationStack.push({ view, param });
  renderView(view, param);
}

function goBack() {
  navigationStack.pop(); // current
  const prev = navigationStack[navigationStack.length - 1];
  if (prev) {
    const scrollOptions = prev.scrollPosition ? { preserveScroll: true, ...prev.scrollPosition } : {};
    renderView(prev.view, prev.param, scrollOptions);
  }
  else navigate('dashboard');
}

function renderView(view, param, options = {}) {
  const content = document.getElementById('app-content');
  const backBtn = document.getElementById('btn-back');
  const title = document.getElementById('header-title');
  const actionBtn = document.getElementById('btn-header-action');
  const nav = document.getElementById('bottom-nav');
  const preserveScroll = !!options.preserveScroll;
  const previousScroll = {
    contentScrollTop: options.contentScrollTop ?? content.scrollTop,
    windowScrollY: options.windowScrollY ?? (window.scrollY || window.pageYOffset || 0)
  };

  // Clear timer / auto-save if leaving session
  if (view !== 'session') {
    if (sessionTimerInterval) { clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
    if (sessionAutoSaveInterval) { clearInterval(sessionAutoSaveInterval); sessionAutoSaveInterval = null; }
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
      actionBtn.style.display = 'flex';
      actionBtn.innerHTML = '🔑';
      actionBtn.onclick = () => showApiKeyModal();
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
      _initPrepTouchDrag();
      break;

    case 'body-check':
      backBtn.style.display = 'flex';
      title.textContent = '上課前記錄';
      nav.style.display = 'none';
      content.innerHTML = renderBodyCheck(param);
      break;

    case 'session':
      backBtn.style.display = 'none';
      title.textContent = '上課中';
      nav.style.display = 'none';
      content.innerHTML = renderSession(param);
      startTimer();
      startAutoSave();
      break;

    case 'session-detail':
      backBtn.style.display = 'flex';
      title.textContent = '課程紀錄';
      content.innerHTML = renderSessionDetail(param);
      break;

    case 'edit-session':
      backBtn.style.display = 'flex';
      title.textContent = '編輯課程紀錄';
      content.innerHTML = renderEditSession(param);
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

    case 'edit-exercise':
      backBtn.style.display = 'flex';
      title.textContent = '編輯動作';
      content.innerHTML = renderAddExercise(param);
      break;

    case 'history':
      title.textContent = param === 'today' ? '今日紀錄' : '訓練紀錄';
      content.innerHTML = renderHistory(param);
      break;

    default:
      content.innerHTML = renderDashboard();
  }

  if (preserveScroll) {
    restoreScrollPosition(previousScroll);
  } else {
    content.scrollTop = 0;
    window.scrollTo(0, 0);
  }
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

function readOptionalNonNegativeInt(inputId) {
  const raw = document.getElementById(inputId)?.value.trim() || '';
  if (raw === '') return '';
  return Math.max(parseInt(raw, 10) || 0, 0);
}

function saveStudentForm(existingId) {
  const name = document.getElementById('f-name').value.trim();
  if (!name) { showToast('❌ 請輸入姓名'); return; }

  const student = existingId ? { ...DB.getStudent(existingId) } : {};
  student.name = name;
  student.age = parseInt(document.getElementById('f-age').value) || '';
  student.phone = document.getElementById('f-phone').value.trim();
  student.remainingCourseSessions = readOptionalNonNegativeInt('f-remaining-course-sessions');
  student.totalCourseSessions = readOptionalNonNegativeInt('f-total-course-sessions');
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

function deleteSessionHandler(id) {
  if (confirm('確定要永久刪除這筆課程紀錄嗎？這無法復原！')) {
    const session = DB.getSession(id);
    const studentId = session?.studentId;
    if (DB.deleteSession(id)) {
      showToast('🗑️ 課程紀錄已刪除');
      if (studentId) navigate('student-detail', studentId);
      else navigate('dashboard');
    }
  }
}

function saveEditSessionForm(sessionId) {
  const session = { ...DB.getSession(sessionId) };
  session.date = document.getElementById('fe-date').value;
  session.sessionType = document.getElementById('fe-type').value;
  session.conditionNotes = document.getElementById('fe-condition').value.trim();
  session.coachNotes = document.getElementById('fe-notes').value.trim();
  session.nextSuggestion = document.getElementById('fe-next').value.trim();
  DB.saveSession(session);
  showToast('✅ 課程紀錄已更新');
  goBack();
}

function addToScheduleModal() {
  rememberModalReturnScrollPosition();
  const students = DB.getStudents();
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">新增今日課程</div></div>
    <div style="padding:0 16px 24px;display:flex;flex-direction:column;gap:12px">
      <select id="sch-student" class="form-input">
        <option value="">選擇學員</option>
        ${students.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
      </select>
      <input type="time" id="sch-time" class="form-input" value="09:00">
      <select id="sch-type" class="form-input">
        <option>NKT評估</option>
        <option>核心控制</option>
        <option selected>肌力訓練</option>
        <option>混合訓練</option>
        <option>體能訓練</option>
      </select>
      <button class="btn-primary accent" onclick="saveScheduleItemModal()">新增</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

function saveScheduleItemModal() {
  const studentId = document.getElementById('sch-student').value;
  if (!studentId) { showToast('❌ 請選擇學員'); return; }
  const time = document.getElementById('sch-time').value;
  const type = document.getElementById('sch-type').value;
  const hour = parseInt(time.split(':')[0]);
  const period = hour < 12 ? 'AM' : 'PM';
  const scrollPosition = getModalReturnScrollPosition();
  DB.saveScheduleItem({ date: getTodayStr(), studentId, time, period, type, status: 'pending' });
  closeModal();
  showToast('✅ 已加入今日課程');
  renderView('dashboard', undefined, { preserveScroll: true, ...scrollPosition });
}

function syncCalendarNow() {
  const btn = document.getElementById('btn-cal-sync');
  if (btn) { btn.style.animation = 'spin 1s linear infinite'; btn.style.pointerEvents = 'none'; }
  showToast('🔄 同步行事曆中...');

  const callbackName = `calendarSyncCallback_${Date.now()}`;
  const script = document.createElement('script');
  let done = false;

  const cleanup = () => {
    if (btn) { btn.style.animation = ''; btn.style.pointerEvents = ''; }
    try { delete window[callbackName]; } catch(e) { window[callbackName] = undefined; }
    script.remove();
  };

  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    cleanup();
    showToast('⚠️ 同步沒有回應，請稍後再試');
  }, 20000);

  window[callbackName] = (result) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cleanup();

    if (!result || result.status !== 'ok') {
      showToast('❌ 同步失敗，請檢查 GAS');
      return;
    }

    renderView('dashboard');
    if (result.unmatched && result.unmatched.length) {
      const names = result.unmatched.slice(0, 3).map(x => x.cleanName || x.title).join('、');
      showToast(`⚠️ ${result.unmatched.length} 筆找不到學員：${names}`);
      return;
    }
    showToast(`✅ 同步完成：新增 ${result.created || 0}，更新 ${result.updated || 0}`);
  };

  script.onerror = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    cleanup();
    showToast('❌ 同步連線失敗');
  };

  script.src = `${GAS_SYNC_URL}?callback=${encodeURIComponent(callbackName)}&t=${Date.now()}`;
  document.body.appendChild(script);
}

function deleteScheduleItemHandler(id) {
  DB.deleteScheduleItem(id);
  showToast('已移除');
  navigate('dashboard');
}

function deleteStudentHandler(id) {
  if (confirm('確定要永久刪除這位學員嗎？這無法復原喔！')) {
    if (DB.deleteStudent(id)) {
      showToast('🗑️ 學員已刪除');
      goBack();
    }
  }
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

function saveExerciseForm(existingId) {
  const name = document.getElementById('fe-name').value.trim();
  if (!name) { showToast('❌ 請輸入動作名稱'); return; }

  const data = {
    name,
    category: document.getElementById('fe-category').value,
    target: document.getElementById('fe-target').value.trim(),
    defaultSets: parseInt(document.getElementById('fe-sets').value) || 3,
    defaultReps: document.getElementById('fe-reps').value.trim() || '10',
    cues: document.getElementById('fe-cues').value.trim()
  };
  if (existingId) data.id = existingId;
  DB.saveExercise(data);
  showToast(existingId ? '✅ 動作已更新' : '✅ 動作已新增');
  goBack();
}

function deleteExerciseHandler(id, event) {
  event.stopPropagation();
  if (confirm('確定要刪除這個動作嗎？')) {
    if (DB.deleteExercise(id)) {
      showToast('✅ 動作已刪除');
      navigate('exercises');
    }
  }
}

// ============================================
// Prep Functions
// ============================================
function removePrepExercise(idx) {
  currentPrepPlan.splice(idx, 1);
  if (typeof rerenderCurrentViewPreserveScroll === 'function') {
    rerenderCurrentViewPreserveScroll();
    return;
  }
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param, { preserveScroll: true });
}

function escapeHtmlValue(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatExerciseUsageGroups(ex) {
  const groups = typeof getSessionExerciseGroups === 'function'
    ? getSessionExerciseGroups(ex).filter(g => g.count > 0)
    : [];
  const fallbackGroups = groups.length ? groups : [{
    weight: ex.weight && ex.weight !== '-' ? ex.weight : '',
    reps: ex.reps || '10',
    count: parseInt(ex.sets) || 1
  }];

  return fallbackGroups
    .map(g => `${g.weight ? `${g.weight}×` : ''}${g.reps || '?'}×${g.count}組`)
    .join(' / ');
}

function findSessionScheduleTime(session) {
  const schedule = typeof DB?.getSchedule === 'function' ? DB.getSchedule() : [];
  const item = schedule.find(s => s.studentId === session.studentId && s.date === session.date);
  return item?.time || '';
}

function findLatestExerciseUsage(studentId, exercise) {
  if (!studentId || !exercise) return null;
  const exerciseKey = normalizeExerciseName(exercise.name);
  const sessions = DB.getSessions(studentId);
  for (const session of sessions) {
    const matched = (session.exercises || []).find(ex => {
      if (exercise.id && ex.exerciseId && ex.exerciseId === exercise.id) return true;
      return normalizeExerciseName(ex.name) === exerciseKey;
    });
    if (matched) return { session, exercise: matched };
  }
  return null;
}

function renderLatestExerciseUsage(studentId, exercise) {
  const usage = findLatestExerciseUsage(studentId, exercise);
  if (!usage) {
    return '<div class="exercise-last-usage empty">尚無此學員操作紀錄</div>';
  }

  const { session, exercise: used } = usage;
  const dateTime = [session.date, findSessionScheduleTime(session)].filter(Boolean).join(' ');
  const groups = formatExerciseUsageGroups(used);
  const quality = used.quality ? `｜品質：${used.quality}` : '';
  return `<div class="exercise-last-usage">最近 ${escapeHtmlValue(dateTime || '未註明日期')}｜${escapeHtmlValue(groups)}${escapeHtmlValue(quality)}</div>`;
}

function showExercisePicker(studentId) {
  rememberModalReturnScrollPosition();
  const exercises = DB.getExercises();
  const catEmojis = { 'NKT評估':'🔬', '核心控制':'🎯', '上肢推':'💪', '上肢拉':'🏋️', '下肢推':'🦵', '下肢拉':'🍑', '心肺':'❤️', '全身':'⚡' };
  const catIcons  = { 'NKT評估':'nkt', '核心控制':'core', '上肢推':'push', '上肢拉':'pull', '下肢推':'lower-push', '下肢拉':'lower-pull', '心肺':'cardio', '全身':'full' };

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">新增動作至課表</div></div>
    <div style="padding:0 16px 8px">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="搜尋動作..." oninput="filterModalExercises(this.value)">
      </div>
    </div>
    <div style="padding:0 16px 6px">
      <button onclick="showInlineNewExercise('${studentId}')" style="width:100%;background:rgba(0,229,160,0.1);border:1px dashed var(--accent);border-radius:10px;color:var(--accent);padding:10px;font-size:0.85rem;cursor:pointer;font-weight:600">
        ＋ 新增自訂動作並加入資料庫
      </button>
    </div>
    <div style="padding:0 16px 24px;max-height:45vh;overflow-y:auto" id="modal-exercise-list">
      ${exercises.map(e => `
        <div class="exercise-lib-card" data-name="${e.name}" onclick="addExerciseToPrep('${e.id}','${studentId}')">
          <div class="exercise-icon ${catIcons[e.category] || 'full'}">${catEmojis[e.category] || '💪'}</div>
          <div class="exercise-lib-info">
            <div class="exercise-lib-name">${e.name}</div>
            <div class="exercise-lib-meta">${e.target} · ${e.defaultSets}×${e.defaultReps}</div>
            ${renderLatestExerciseUsage(studentId, e)}
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

function showInlineNewExercise(studentId) {
  const cats = ['NKT評估','核心控制','上肢推','上肢拉','下肢推','下肢拉','心肺','全身'];
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">新增自訂動作</div></div>
    <div style="padding:0 16px 24px;display:flex;flex-direction:column;gap:12px">
      <input type="text" id="ni-name" placeholder="動作名稱 *" class="form-input">
      <select id="ni-category" class="form-input">
        ${cats.map(c => `<option value="${c}" ${c==='下肢推'?'selected':''}>${c}</option>`).join('')}
      </select>
      <input type="text" id="ni-target" placeholder="目標肌群" class="form-input">
      <div style="display:flex;gap:8px">
        <input type="number" id="ni-sets" value="3" placeholder="組數" class="form-input" style="flex:1;text-align:center">
        <input type="text" id="ni-reps" value="10" placeholder="次數" class="form-input" style="flex:1;text-align:center">
      </div>
      <textarea id="ni-cues" placeholder="動作提示（選填）" class="form-input" style="min-height:60px"></textarea>
      <button class="btn-primary accent" onclick="saveInlineNewExercise('${studentId}')">➕ 新增並加入課表</button>
      <button class="btn-primary secondary" onclick="showExercisePicker('${studentId}')">← 返回動作庫</button>
    </div>`;
}

function refreshPrepAfterAdd(studentId, scrollPosition = getScrollPosition()) {
  const notes = document.getElementById('prep-notes')?.value || '';
  if (currentPrepPlan) currentPrepPlan._prepNotes = notes;
  if (typeof appendLatestPrepExerciseRow === 'function' && appendLatestPrepExerciseRow()) {
    restoreScrollPosition(scrollPosition);
    return;
  }
  if (typeof rerenderCurrentViewPreserveScroll === 'function') {
    rerenderCurrentViewPreserveScroll(scrollPosition);
  } else {
    renderView('prep', studentId, { preserveScroll: true, ...scrollPosition });
  }
}

window.saveInlineNewExercise = function(studentId) {
  const name = document.getElementById('ni-name').value.trim();
  if (!name) { showToast('❌ 請輸入動作名稱'); return; }
  const ex = DB.saveExercise({
    name,
    category: document.getElementById('ni-category').value,
    target: document.getElementById('ni-target').value.trim(),
    defaultSets: parseInt(document.getElementById('ni-sets').value) || 3,
    defaultReps: document.getElementById('ni-reps').value.trim() || '10',
    cues: document.getElementById('ni-cues').value.trim()
  });
  currentPrepPlan.push({
    exerciseId: ex.id, name: ex.name, category: ex.category,
    sets: ex.defaultSets, reps: ex.defaultReps, weight: '-', cues: ex.cues || ''
  });
  const scrollPosition = getModalReturnScrollPosition();
  closeModal();
  showToast(`✅ 「${ex.name}」已加入資料庫與課表`);
  refreshPrepAfterAdd(studentId, scrollPosition);
};

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
    const scrollPosition = getModalReturnScrollPosition();
    closeModal();
    showToast(`✅ 已加入 ${ex.name}`);
    refreshPrepAfterAdd(studentId, scrollPosition);
  }
}

// ============================================
// Session Functions
// ============================================
function startSession(studentId) {
  const notes = document.getElementById('prep-notes')?.value || '';
  if (currentPrepPlan) currentPrepPlan._prepNotes = notes;
  if (typeof learnPlanningPreferences === 'function') learnPlanningPreferences(studentId);
  currentSessionState = null;
  navigate('body-check', studentId);
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

function startAutoSave() {
  if (sessionAutoSaveInterval) clearInterval(sessionAutoSaveInterval);
  sessionAutoSaveInterval = setInterval(() => {
    if (currentSessionState) {
      localStorage.setItem('session_draft', JSON.stringify(currentSessionState));
      showToast('💾 已自動存檔');
    }
  }, 5 * 60 * 1000);
}

function toggleSet(idx) {
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  ex.completedSets[idx] = !ex.completedSets[idx];
  const cards = document.querySelectorAll('.set-card');
  cards[idx]?.classList.toggle('completed');
  const repsEl = cards[idx]?.querySelector('.set-reps');
  const setReps = ex.allSets?.[idx]?.reps || ex.reps;
  if (repsEl) repsEl.textContent = ex.completedSets[idx] ? '✅' : setReps;
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
      category: e.category || '',
      target: e.target || '',
      sets: (e.allSets||[]).length || e.sets,
      reps: e.reps,
      weight: e.actualWeight || e.weight,
      allSets: (e.allSets||[]).map(s => ({ weight: s.weight || '', reps: s.reps || e.reps || '' })),
      completed: e.completedSets,
      quality: e.quality || '未評',
      notes: e.notes,
      cues: e.cues || '',
      subSets: e.subSets || []
    })),
    conditionNotes: state.conditions.join('、'),
    coachNotes: state.overallNotes,
    nextSuggestion: ''
  };

  const savedStudentId = state.studentId;
  DB.saveSession(session);
  DB.deletePrepPlan(state.studentId);
  localStorage.removeItem('session_draft');
  currentSessionState = null;
  currentPrepPlan = [];
  if (sessionTimerInterval) { clearInterval(sessionTimerInterval); sessionTimerInterval = null; }
  if (sessionAutoSaveInterval) { clearInterval(sessionAutoSaveInterval); sessionAutoSaveInterval = null; }
  showToast('✅ 課程紀錄已儲存！');

  // 顯示簽到 QR Code，點按鈕後才回首頁
  showCheckInQrModal(savedStudentId);
}

const LINE_CHECKIN_URL = 'https://line.me/R/ti/p/@244ytefp';

function renderSessionBalance(student) {
  const remainingValue = parseInt(student?.remainingCourseSessions, 10);
  const total = parseInt(student?.totalCourseSessions, 10);
  const used = parseInt(student?.totalSessions, 10) || 0;
  if ((!Number.isFinite(remainingValue) || remainingValue < 0) && (!Number.isFinite(total) || total <= 0)) {
    return `
      <div style="margin:10px 0 4px;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-card);text-align:center">
        <div style="font-size:0.72rem;color:var(--text-muted)">剩餘堂數 / 總堂數</div>
        <div style="font-size:0.9rem;font-weight:700;color:var(--text-secondary);margin-top:2px">尚未設定堂數</div>
      </div>`;
  }
  const remaining = Number.isFinite(remainingValue) && remainingValue >= 0 ? remainingValue : Math.max(total - used, 0);
  const totalText = Number.isFinite(total) && total > 0 ? total : '--';
  return `
    <div style="margin:10px 0 4px;padding:10px 12px;border:1px solid rgba(0,229,160,0.28);border-radius:10px;background:rgba(0,229,160,0.08);text-align:center">
      <div style="font-size:0.72rem;color:var(--text-muted)">剩餘堂數 / 總堂數</div>
      <div style="font-size:1.25rem;font-weight:800;color:var(--accent);margin-top:2px">${remaining} / ${totalText}</div>
      <div style="font-size:0.68rem;color:var(--text-muted);margin-top:2px">已完成 ${used} 堂</div>
    </div>`;
}

function showCheckInQrModal(studentId) {
  const student = DB.getStudent(studentId);
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(LINE_CHECKIN_URL)}&bgcolor=1a1a2e&color=06C755&qzone=1`;
  const qrHtml = `
    <div style="text-align:center;padding:12px 0 4px">
      <img src="${qrSrc}" style="width:200px;height:200px;border-radius:12px;border:2px solid var(--border-light)" alt="LINE 簽到">
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:8px">請學員掃描進入 LINE 簽到</div>
    </div>`;

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">課程結束 🎉</div></div>
    <div style="padding:0 16px 24px">
      <div style="text-align:center;margin-bottom:8px">
        <div style="font-size:1.1rem;font-weight:700">${student?.name || ''}</div>
        <div style="font-size:0.8rem;color:var(--text-muted)">${getTodayStr()} ${timeStr}</div>
      </div>
      ${renderSessionBalance(student)}
      ${qrHtml}
      <button class="btn-primary accent" onclick="finishSession()" style="margin-top:12px">✅ 簽到完成 · 回首頁</button>
      <button class="btn-primary secondary" onclick="finishSession()" style="margin-top:8px">略過 · 回首頁</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

window.finishSession = function() {
  document.getElementById('modal-overlay').classList.remove('active');
  navigationStack = [];
  navigate('dashboard');
};

function determineSessionType(exercises) {
  const cats = exercises.map(e => e.category);
  if (cats.includes('NKT評估')) return 'NKT評估';
  const types = ['核心控制','上肢推','上肢拉','下肢推','下肢拉','心肺','全身'];
  const matched = types.filter(t => cats.includes(t));
  if (matched.length >= 2) return '混合訓練';
  if (matched.length === 1) return matched[0];
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
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.update();
    // 每次 App 切回前景時，靜默檢查是否有新版本
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        reg.update();
      } else {
        // 畫面隱藏時立刻備份上課進度
        if (currentSessionState) {
          localStorage.setItem('session_draft', JSON.stringify(currentSessionState));
        }
      }
    });
    // 新 SW 接管後自動 reload，上課中除外（避免遺失 session state）
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (currentSessionState) return;
      window.location.reload();
    });
  }).catch(err => console.log('SW:', err));
}

// ============================================
// Init
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
  // 顯示連線中畫面
  document.getElementById('app-content').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:65vh;flex-direction:column;gap:14px">
      <div style="width:36px;height:36px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite"></div>
      <div style="color:var(--text-muted);font-size:0.9rem">連線中…</div>
    </div>`;

  await DB.init();
  navigate('dashboard');
});
