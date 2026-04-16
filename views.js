// ============================================
// View Renderers
// ============================================

function renderDashboard() {
  const students = DB.getStudents();
  const todayStr = getTodayStr();
  const schedule = DB.getSchedule().filter(s => s.date === todayStr);
  const todaySessions = DB.getSessions().filter(s => s.date === todayStr);
  const now = new Date();
  const weekday = ['日','一','二','三','四','五','六'][now.getDay()];
  const month = now.getMonth() + 1;
  const day = now.getDate();

  return `
    <div class="dashboard-hero fade-in">
      <div class="dashboard-greeting">💪 教練，準備好了嗎</div>
      <div class="dashboard-date">${month}月${day}日 星期${weekday}</div>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-number">${schedule.length}</div>
          <div class="stat-label">今日堂數</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">${students.length}</div>
          <div class="stat-label">學員數</div>
        </div>
        <div class="stat-card" onclick="navigate('history','today')" style="cursor:pointer">
          <div class="stat-number">${todaySessions.length}</div>
          <div class="stat-label">已記錄</div>
        </div>
      </div>
    </div>
    <div class="section-header fade-in stagger-1">
      <div class="section-title">📋 今日課程</div>
      <button onclick="syncCalendarNow()" title="從 Google Calendar 同步"
        style="background:none;border:1px solid var(--border);border-radius:50%;width:32px;height:32px;font-size:1rem;cursor:pointer;display:flex;align-items:center;justify-content:center" id="btn-cal-sync">🔄</button>
      <button class="btn-icon-sm" onclick="addToScheduleModal()" title="手動新增"
        style="background:var(--accent);color:#000;border:none;border-radius:50%;width:32px;height:32px;font-size:1.2rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
    </div>
    <div class="session-list">
      ${schedule.length === 0 ? `
        <div class="empty-state" style="padding:32px 0">
          <div class="empty-state-icon">📅</div>
          <div class="empty-state-title">今天還沒有課程</div>
          <div class="empty-state-text">點右上角 + 新增今日學員</div>
        </div>` :
        schedule.map((s, i) => {
          const student = DB.getStudent(s.studentId);
          if (!student) return '';
          return `
            <div class="session-card fade-in stagger-${Math.min(i+2, 6)}">
              <div class="session-time" onclick="navigate('prep', '${s.studentId}')" style="cursor:pointer">
                <div class="session-time-hour">${s.time || '--:--'}</div>
                <div class="session-time-period">${s.period || ''}</div>
              </div>
              <div class="session-divider" style="background:${student.avatarColor}"></div>
              <div class="session-info" onclick="navigate('prep', '${s.studentId}')" style="cursor:pointer;flex:1">
                <div class="session-student-name">${student.name}</div>
                <div class="session-type">${s.type} · 第${student.totalSessions + 1}堂</div>
                ${s.preppedAt ? `<div style="font-size:0.65rem;color:var(--success);margin-top:2px">✅ ${s.preppedAt} 備課完成</div>` : ''}
              </div>
              <div class="session-status ${s.status}" style="margin-right:4px">
                ${s.status === 'pending' ? '📝' : s.status === 'prepped' ? '✅' : '🏁'}
              </div>
              <button onclick="deleteScheduleItemHandler('${s.id}')" style="background:none;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer;padding:4px 6px">×</button>
            </div>`;
        }).join('')}
    </div>`;
}

function renderStudents() {
  const students = DB.getStudents();
  return `
    <div class="search-container fade-in">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="student-search" placeholder="搜尋學員..." oninput="filterStudents(this.value)">
      </div>
    </div>
    <div class="student-list" id="student-list-container">
      ${students.map((s, i) => renderStudentCard(s, i)).join('')}
    </div>`;
}

function renderStudentCard(s, i) {
  const initial = s.name.charAt(0);
  return `
    <div class="student-card fade-in stagger-${Math.min(i+1, 6)}" onclick="navigate('student-detail', '${s.id}')" data-name="${s.name}">
      <div class="student-avatar" style="background:${s.avatarColor}">${initial}</div>
      <div class="student-info">
        <div class="student-name">${s.name}</div>
        <div class="student-meta">${s.goals}</div>
      </div>
      <div class="student-sessions-badge">
        <strong>${s.totalSessions}</strong>堂
      </div>
    </div>`;
}

function renderStudentDetail(studentId) {
  const s = DB.getStudent(studentId);
  if (!s) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';
  const sessions = DB.getSessions(studentId);
  const initial = s.name.charAt(0);
  const phaseTag = { '矯正期':'tag-warning', '肌力期':'tag-accent', '體能期':'tag-info' }[s.currentPhase] || 'tag-accent';

  return `
    <div class="profile-header fade-in">
      <div class="profile-avatar" style="background:${s.avatarColor}">${initial}</div>
      <div class="profile-name">${s.name}</div>
      <div class="profile-subtitle">
        <span class="tag ${phaseTag}">${s.currentPhase}</span>
        · 共 ${s.totalSessions} 堂
      </div>
    </div>
    <div class="profile-actions fade-in stagger-1">
      <button class="btn-primary accent" onclick="navigate('prep', '${s.id}')">📋 開始備課</button>
      <button class="btn-primary secondary" onclick="navigate('edit-student', '${s.id}')">✏️ 編輯</button>
      <button class="btn-primary secondary danger" onclick="deleteStudentHandler('${s.id}')" style="flex:0 0 52px; border-color:var(--danger); color:var(--danger); padding:0; display:flex; justify-content:center; align-items:center;">🗑️</button>
    </div>
    <div class="info-section fade-in stagger-2">
      <div class="info-grid">
        <div class="info-item">
          <div class="info-item-label">🎯 訓練目標</div>
          <div class="info-item-value">${s.goals}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">🏥 病史/傷病</div>
          <div class="info-item-value">${s.medicalHistory || '無'}</div>
        </div>
        <div class="info-item">
          <div class="info-item-label">🔬 NKT 檢測發現</div>
          <div class="info-item-value">${s.nktFindings || '尚未檢測'}</div>
        </div>
        ${s.notes ? `<div class="info-item"><div class="info-item-label">📝 備註</div><div class="info-item-value">${s.notes}</div></div>` : ''}
      </div>
    </div>
    <div class="section-header fade-in stagger-3">
      <div class="section-title">📅 訓練紀錄</div>
    </div>
    <div class="timeline fade-in stagger-4">
      ${sessions.length === 0 ? '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">尚無訓練紀錄</div><div class="empty-state-text">點擊「開始備課」建立第一份課表</div></div>' :
        sessions.map((session, i) => `
          <div class="timeline-item" onclick="navigate('session-detail', '${session.id}')">
            <div class="timeline-dot-container">
              <div class="timeline-dot" style="background:${i === 0 ? 'var(--accent)' : 'var(--text-muted)'}"></div>
              ${i < sessions.length - 1 ? '<div class="timeline-line"></div>' : ''}
            </div>
            <div class="timeline-content">
              <div class="timeline-date">${formatDate(session.date)}</div>
              <div class="timeline-title">${session.sessionType}</div>
              <div class="timeline-summary">${session.coachNotes || '無備註'}</div>
            </div>
          </div>
        `).join('')}
    </div>`;
}

function renderSessionDetail(sessionId) {
  const session = DB.getSession(sessionId);
  if (!session) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到紀錄</div></div>';
  const student = DB.getStudent(session.studentId);

  return `
    <div class="prep-student-bar fade-in">
      <div class="student-avatar" style="background:${student?.avatarColor || AVATAR_COLORS[0]}">${student?.name?.charAt(0) || '?'}</div>
      <div style="flex:1">
        <div class="student-name">${student?.name || '未知'}</div>
        <div class="student-meta">${formatDate(session.date)} · ${session.sessionType}</div>
      </div>
      <button class="btn-primary secondary" style="flex:0 0 auto;padding:6px 14px;font-size:0.85rem" onclick="navigate('edit-session','${session.id}')">✏️ 編輯</button>
      <button class="btn-primary secondary danger" style="flex:0 0 auto;padding:6px 10px;font-size:0.85rem;margin-left:6px;border-color:var(--danger);color:var(--danger)" onclick="deleteSessionHandler('${session.id}')">🗑️</button>
    </div>
    <div class="prep-section fade-in stagger-1">
      <div class="prep-section-title">🏋️ 訓練內容</div>
      ${session.exercises.map(ex => {
        const legacyW = (ex.weight && ex.weight !== '-') ? ex.weight : '';
        const sets = (ex.allSets && ex.allSets.length)
          ? ex.allSets
          : (ex.completed || []).map(() => ({ weight: legacyW, reps: ex.reps }));
        const completed = ex.completed || [];
        // 將連續 (weight,reps) 相同的組合併
        const groups = [];
        sets.forEach((s, i) => {
          const w = s.weight || '';
          const r = s.reps || ex.reps || '';
          const done = !!completed[i];
          const last = groups[groups.length - 1];
          if (last && last.weight === w && last.reps === r) {
            last.count++;
            last.doneCount += done ? 1 : 0;
          } else {
            groups.push({ weight: w, reps: r, count: 1, doneCount: done ? 1 : 0 });
          }
        });
        return `
        <div class="session-detail-exercise">
          <div class="session-detail-exercise-name">${ex.name}</div>
          <div class="session-detail-sets">
            ${groups.map(g => {
              const allDone = g.doneCount === g.count;
              const noneDone = g.doneCount === 0;
              const icon = allDone ? '✅' : noneDone ? '⬜' : '🟡';
              const spec = `${g.weight ? g.weight + 'kg × ' : ''}${g.reps} × ${g.count}組`;
              const partial = (!allDone && !noneDone) ? ` (完成 ${g.doneCount}/${g.count})` : '';
              return `<span class="session-detail-set ${allDone ? 'completed' : ''}">${icon} ${spec}${partial}</span>`;
            }).join('')}
          </div>
          <div class="session-detail-quality">品質: ${ex.quality}</div>
          ${ex.notes ? `<div class="session-detail-note">📝 ${ex.notes}</div>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${session.conditionNotes ? `
    <div class="prep-section fade-in stagger-2">
      <div class="prep-section-title">🏥 當日狀況</div>
      <div class="prev-notes"><div class="prev-notes-content">${session.conditionNotes}</div></div>
    </div>` : ''}
    <div class="prep-section fade-in stagger-3">
      <div class="prep-section-title">📝 教練筆記</div>
      <div class="prev-notes"><div class="prev-notes-content">${session.coachNotes || '無'}</div></div>
    </div>
    ${session.nextSuggestion ? `
    <div class="prep-section fade-in stagger-4">
      <div class="prep-section-title">💡 下堂課建議</div>
      <div class="prev-notes"><div class="prev-notes-content">${session.nextSuggestion}</div></div>
    </div>` : ''}`;
}

function renderExercises() {
  const categories = ['全部','NKT評估','核心控制','上肢推','上肢拉','下肢','全身'];
  const catIcons = { 'NKT評估':'nkt', '核心控制':'core', '上肢推':'push', '上肢拉':'pull', '下肢':'lower', '全身':'full' };
  const catEmojis = { 'NKT評估':'🔬', '核心控制':'🎯', '上肢推':'💪', '上肢拉':'🏋️', '下肢':'🦵', '全身':'⚡' };
  const exercises = DB.getExercises();

  return `
    <div class="search-container fade-in">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" id="exercise-search" placeholder="搜尋動作..." oninput="filterExercises(this.value)">
      </div>
    </div>
    <div class="exercise-category-tabs fade-in stagger-1" id="exercise-tabs">
      ${categories.map(c => `<button class="category-tab ${c === '全部' ? 'active' : ''}" onclick="selectExerciseCategory('${c}')">${c}</button>`).join('')}
    </div>
    <div class="exercise-library-list" id="exercise-list-container">
      ${exercises.map((e, i) => `
        <div class="exercise-lib-card fade-in stagger-${Math.min(i+2, 6)}" data-category="${e.category}" data-name="${e.name}">
          <div class="exercise-icon ${catIcons[e.category] || 'strength'}">${catEmojis[e.category] || '💪'}</div>
          <div class="exercise-lib-info">
            <div class="exercise-lib-name">${e.name}</div>
            <div class="exercise-lib-meta">${e.target} · ${e.defaultSets}×${e.defaultReps}</div>
          </div>
          <button onclick="navigate('edit-exercise','${e.id}');event.stopPropagation()" style="background:none;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer;padding:4px 6px">✏️</button>
          <button class="btn-delete-exercise" onclick="deleteExerciseHandler('${e.id}', event)">🗑️</button>
        </div>`).join('')}
    </div>`;
}

function renderEditSession(sessionId) {
  const session = DB.getSession(sessionId);
  if (!session) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到紀錄</div></div>';
  const student = DB.getStudent(session.studentId);
  const sessionTypes = ['NKT評估','核心控制','肌力訓練','混合訓練','體能訓練','其他'];

  return `
    <div class="prep-student-bar fade-in">
      <div class="student-avatar" style="background:${student?.avatarColor || AVATAR_COLORS[0]}">${student?.name?.charAt(0) || '?'}</div>
      <div>
        <div class="student-name">${student?.name || '未知'}</div>
        <div class="student-meta">編輯課程紀錄</div>
      </div>
    </div>
    <div class="form-container fade-in stagger-1" style="padding:16px">
      <div class="form-group">
        <label class="form-label">上課日期</label>
        <input type="date" id="fe-date" class="form-input" value="${session.date}">
      </div>
      <div class="form-group">
        <label class="form-label">課程類型</label>
        <select id="fe-type" class="form-input">
          ${sessionTypes.map(t => `<option ${t === session.sessionType ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">🏥 當日狀況</label>
        <textarea id="fe-condition" class="form-input" rows="2" style="resize:none">${session.conditionNotes || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">📝 教練筆記</label>
        <textarea id="fe-notes" class="form-input" rows="3" style="resize:none">${session.coachNotes || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">💡 下堂課建議</label>
        <textarea id="fe-next" class="form-input" rows="2" style="resize:none">${session.nextSuggestion || ''}</textarea>
      </div>
      <button class="btn-primary accent" style="width:100%;margin-top:8px" onclick="saveEditSessionForm('${sessionId}')">儲存變更</button>
    </div>`;
}

function renderHistory(filter) {
  let sessions = DB.getSessions();
  const isToday = filter === 'today';
  if (isToday) sessions = sessions.filter(s => s.date === getTodayStr());
  if (sessions.length === 0) {
    return `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-title">${isToday ? '今天還沒有課程紀錄' : '尚無訓練紀錄'}</div></div>`;
  }
  return `
    ${isToday ? `<div style="padding:10px 16px 0"><span style="background:var(--accent);color:#000;padding:3px 10px;border-radius:20px;font-size:0.78rem;font-weight:600">今日紀錄</span></div>` : ''}
    <div class="session-list" style="padding:12px 16px">
      ${sessions.map((s, i) => {
        const student = DB.getStudent(s.studentId);
        const d = new Date(s.date);
        return `
          <div class="history-card fade-in stagger-${Math.min(i+1, 6)}" onclick="navigate('session-detail', '${s.id}')">
            <div class="history-date-badge">
              <div class="history-date-day">${d.getDate()}</div>
              <div class="history-date-month">${d.getMonth()+1}月</div>
            </div>
            <div class="history-info">
              <div class="history-student">${student?.name || '未知'}</div>
              <div class="history-type">${s.sessionType}</div>
              <div class="history-notes">${s.coachNotes || '無備註'}</div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}
