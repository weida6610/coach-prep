// ============================================
// Lesson Prep & In-Session Views
// ============================================

// State for current prep/session
let currentPrepPlan = [];
let currentSessionState = null;

function generateAISuggestions(studentId) {
  const student = DB.getStudent(studentId);
  const sessions = DB.getSessions(studentId);
  const lastSession = sessions[0];
  const plan = [];

  // Always start with warmup
  plan.push({ exerciseId:'E003', name:'90/90 髖關節活動度', category:'暖身', sets:2, reps:'8', weight:'-', cues:'骨盆保持中立' });

  if (student.currentPhase === '矯正期') {
    plan.push({ exerciseId:'E004', name:'貓牛式', category:'暖身', sets:2, reps:'10', weight:'-', cues:'配合呼吸' });
    // NKT-based suggestions
    if (student.nktFindings?.includes('臀中肌')) {
      plan.push({ exerciseId:'E020', name:'Clam Shell', category:'矯正動作', sets:3, reps:'15', weight:'彈力帶', cues:'骨盆不旋轉' });
      plan.push({ exerciseId:'E023', name:'側走怪獸步', category:'矯正動作', sets:3, reps:'12步/側', weight:'彈力帶', cues:'膝蓋對齊腳尖' });
    }
    if (student.nktFindings?.includes('核心') || student.nktFindings?.includes('腹橫')) {
      plan.push({ exerciseId:'E021', name:'Dead Bug', category:'矯正動作', sets:3, reps:'10', weight:'-', cues:'腰椎貼地' });
      plan.push({ exerciseId:'E022', name:'Bird Dog', category:'矯正動作', sets:3, reps:'10/側', weight:'-', cues:'軀幹穩定' });
    }
    if (student.nktFindings?.includes('肩')) {
      plan.push({ exerciseId:'E025', name:'肩胛骨YTWL', category:'矯正動作', sets:3, reps:'8', weight:'-', cues:'肩胛下壓後縮' });
    }
    if (student.nktFindings?.includes('臀大肌')) {
      plan.push({ exerciseId:'E026', name:'髖屈肌伸展+啟動', category:'矯正動作', sets:2, reps:'30秒/側', weight:'-', cues:'臀部夾緊' });
    }
    if (plan.length < 5) {
      plan.push({ exerciseId:'E021', name:'Dead Bug', category:'矯正動作', sets:3, reps:'10', weight:'-', cues:'腰椎貼地' });
    }
  } else {
    // For strength/performance phases
    plan.push({ exerciseId:'E005', name:'世界最偉大伸展', category:'暖身', sets:2, reps:'5/側', weight:'-', cues:'動作慢且到位' });

    // Add corrective based on NKT findings
    if (student.nktFindings?.includes('臀中肌')) {
      plan.push({ exerciseId:'E020', name:'Clam Shell', category:'矯正動作', sets:2, reps:'12', weight:'彈力帶', cues:'暖身啟動用' });
    }

    // Progressive overload from last session
    if (lastSession) {
      const strengthExercises = lastSession.exercises.filter(e => {
        const lib = DB.getExercises().find(l => l.id === e.exerciseId);
        return lib?.category === '肌力訓練';
      });
      strengthExercises.forEach(e => {
        let newWeight = e.weight;
        if (e.quality === '優秀' && e.weight !== '-') {
          const numMatch = e.weight.match(/(\d+)/);
          if (numMatch) newWeight = e.weight.replace(numMatch[1], String(parseInt(numMatch[1]) + 2));
        }
        plan.push({ exerciseId:e.exerciseId, name:e.name, category:'肌力訓練', sets:e.sets, reps:e.reps, weight:newWeight, cues:'' });
      });
    }
    if (plan.filter(p => p.category === '肌力訓練').length === 0) {
      plan.push({ exerciseId:'E030', name:'高腳杯深蹲', category:'肌力訓練', sets:4, reps:'10', weight:'12kg', cues:'膝蓋對齊腳尖' });
      plan.push({ exerciseId:'E031', name:'啞鈴羅馬尼亞硬舉', category:'肌力訓練', sets:4, reps:'10', weight:'10kg*2', cues:'髖鉸鏈' });
      plan.push({ exerciseId:'E033', name:'單臂啞鈴划船', category:'肌力訓練', sets:3, reps:'12', weight:'12kg', cues:'肩胛先啟動' });
    }
  }
  return plan;
}

function renderPrep(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';

  const sessions = DB.getSessions(studentId);
  const lastSession = sessions[0];
  currentPrepPlan = generateAISuggestions(studentId);

  const catIcons = { '暖身':'warmup', 'NKT檢測':'nkt', '矯正動作':'corrective', '肌力訓練':'strength' };
  const catEmojis = { '暖身':'🏃', 'NKT檢測':'🔬', '矯正動作':'🔧', '肌力訓練':'🏋️' };

  // Group exercises by category
  const groups = {};
  currentPrepPlan.forEach(ex => {
    if (!groups[ex.category]) groups[ex.category] = [];
    groups[ex.category].push(ex);
  });

  return `
    <div class="prep-student-bar fade-in">
      <div class="student-avatar" style="background:${student.avatarColor}">${student.name.charAt(0)}</div>
      <div>
        <div class="student-name">${student.name} <span class="tag tag-accent">${student.currentPhase}</span></div>
        <div class="student-meta">第 ${student.totalSessions + 1} 堂 · ${student.goals}</div>
      </div>
    </div>
    ${lastSession ? `
    <div class="prep-section fade-in stagger-1">
      <div class="prep-section-title">📌 上次重點筆記 <span class="text-muted" style="font-size:0.7rem">${formatDate(lastSession.date)}</span></div>
      <div class="prev-notes">
        <div class="prev-notes-content">
          <ul>
            ${lastSession.coachNotes ? `<li>${lastSession.coachNotes}</li>` : ''}
            ${lastSession.nextSuggestion ? `<li>💡 建議：${lastSession.nextSuggestion}</li>` : ''}
            ${lastSession.conditionNotes ? `<li>狀態：${lastSession.conditionNotes}</li>` : ''}
          </ul>
        </div>
      </div>
    </div>` : ''}
    <div class="prep-section fade-in stagger-2">
      <div class="prep-section-title">🤖 AI 建議課表 <span class="ai-badge">✨ Auto</span></div>
      ${Object.entries(groups).map(([cat, exercises]) => `
        <div class="exercise-group">
          <div class="exercise-group-title">${catEmojis[cat] || '💪'} ${cat}</div>
          ${exercises.map((ex, i) => `
            <div class="exercise-item" id="prep-ex-${i}">
              <div class="exercise-icon ${catIcons[cat] || 'strength'}">${catEmojis[cat] || '💪'}</div>
              <div class="exercise-details">
                <div class="exercise-name">${ex.name}</div>
                <div class="exercise-spec">${ex.sets}×${ex.reps} ${ex.weight !== '-' ? '· ' + ex.weight : ''}</div>
              </div>
              <button class="exercise-remove" onclick="removePrepExercise(${currentPrepPlan.indexOf(ex)}); event.stopPropagation();">✕</button>
            </div>`).join('')}
        </div>`).join('')}
      <button class="btn-add-exercise" onclick="showExercisePicker('${studentId}')">+ 新增動作</button>
    </div>
    <div class="prep-section">
      <div class="form-group">
        <label class="form-label">📝 備課備註（選填）</label>
        <textarea id="prep-notes" placeholder="今天需要特別注意的事項..."></textarea>
      </div>
    </div>
    <div style="height:80px"></div>
    <div class="floating-actions">
      <button class="btn-primary secondary" onclick="goBack()" style="flex:0.4">取消</button>
      <button class="btn-primary accent" onclick="startSession('${studentId}')">▶ 開始上課</button>
    </div>`;
}

function renderSession(studentId) {
  const student = DB.getStudent(studentId);
  if (!student || currentPrepPlan.length === 0) {
    navigate('prep', studentId);
    return '';
  }

  if (!currentSessionState) {
    currentSessionState = {
      studentId,
      startTime: Date.now(),
      currentExIdx: 0,
      exercises: currentPrepPlan.map(ex => ({
        ...ex,
        completedSets: new Array(ex.sets).fill(false),
        quality: '',
        notes: '',
        actualWeight: ex.weight
      })),
      conditions: [],
      overallNotes: ''
    };
  }

  const state = currentSessionState;
  const ex = state.exercises[state.currentExIdx];
  const catEmojis = { '暖身':'🏃', 'NKT檢測':'🔬', '矯正動作':'🔧', '肌力訓練':'🏋️' };
  const qualities = [
    { emoji:'😊', label:'優秀' },
    { emoji:'🙂', label:'良好' },
    { emoji:'😐', label:'尚可' },
    { emoji:'😓', label:'需改善' }
  ];
  const conditionOptions = ['😴 疲勞','🤕 疼痛','💪 狀態佳','🤒 身體不適','😰 壓力大','🌙 睡眠不足'];

  return `
    <div class="session-active-bar fade-in">
      <div class="session-live-dot"></div>
      <div class="session-live-text">上課中 · ${student.name}</div>
      <div class="session-timer" id="session-timer">00:00</div>
    </div>
    <div class="exercise-progress fade-in stagger-1">
      ${state.exercises.map((e, i) => `
        <div class="exercise-progress-dot ${i < state.currentExIdx ? 'done' : i === state.currentExIdx ? 'current' : ''}"></div>
      `).join('')}
    </div>
    <div class="active-exercise fade-in stagger-2">
      <div class="active-exercise-header">
        <div>
          <div class="active-exercise-number">動作 ${state.currentExIdx + 1} / ${state.exercises.length}</div>
          <div class="active-exercise-title">${ex.name}</div>
          <div class="active-exercise-target">目標: ${ex.sets}×${ex.reps}</div>
        </div>
        <div class="exercise-icon ${ex.category === '暖身' ? 'warmup' : ex.category === '矯正動作' ? 'corrective' : 'strength'}" style="width:48px;height:48px;font-size:1.4rem">${catEmojis[ex.category] || '💪'}</div>
      </div>
      ${ex.cues ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px;padding:8px 12px;background:var(--bg-card);border-radius:var(--radius-sm)">💡 ${ex.cues}</div>` : ''}
      ${ex.actualWeight !== '-' ? `
      <div class="weight-adjuster">
        <button class="weight-btn" onclick="adjustWeight(-1)">−</button>
        <div class="weight-display">
          <div class="weight-value" id="current-weight">${ex.actualWeight}</div>
          <div class="weight-unit">重量</div>
        </div>
        <button class="weight-btn" onclick="adjustWeight(1)">+</button>
      </div>` : ''}
      <div class="sets-grid">
        ${ex.completedSets.map((done, i) => `
          <div class="set-card ${done ? 'completed' : ''}" onclick="toggleSet(${i})">
            <div class="set-number">第 ${i+1} 組</div>
            <div class="set-reps">${done ? '✅' : ex.reps}</div>
            ${ex.actualWeight !== '-' ? `<div class="set-weight">${ex.actualWeight}</div>` : ''}
          </div>`).join('')}
      </div>
      <div class="prep-section-title mb-8">動作品質</div>
      <div class="quality-selector">
        ${qualities.map(q => `
          <button class="quality-btn ${ex.quality === q.label ? 'selected' : ''}" onclick="setQuality('${q.label}')">
            <span class="emoji">${q.emoji}</span>${q.label}
          </button>`).join('')}
      </div>
      <div class="quick-note mb-16">
        <textarea id="exercise-note" placeholder="快速備註（如：第3組有代償）" oninput="updateExerciseNote(this.value)">${ex.notes}</textarea>
      </div>
    </div>
    ${state.currentExIdx === state.exercises.length - 1 ? `
    <div class="prep-section">
      <div class="prep-section-title mb-8">🏥 當日身體狀況</div>
      <div class="condition-tags">
        ${conditionOptions.map(c => `<button class="condition-tag ${state.conditions.includes(c) ? 'selected' : ''}" onclick="toggleCondition('${c}')">${c}</button>`).join('')}
      </div>
      <div class="form-group">
        <label class="form-label">📝 課後總結 / 下堂課建議</label>
        <textarea id="overall-notes" placeholder="整體觀察、下次重點..." oninput="currentSessionState.overallNotes=this.value">${state.overallNotes}</textarea>
      </div>
    </div>` : ''}
    <div style="height:80px"></div>
    <div class="exercise-nav">
      <button class="btn-primary secondary" onclick="prevExercise()" ${state.currentExIdx === 0 ? 'disabled style="opacity:0.3;flex:0.3"' : 'style="flex:0.3"'}>← 上一個</button>
      ${state.currentExIdx < state.exercises.length - 1 ?
        `<button class="btn-primary accent" onclick="nextExercise()">下一個動作 →</button>` :
        `<button class="btn-primary accent" onclick="saveSession()" style="background:linear-gradient(135deg, #51cf66, #00b4d8)">💾 儲存並結束</button>`}
    </div>`;
}

function renderAddStudent(studentId) {
  const student = studentId ? DB.getStudent(studentId) : null;
  const isEdit = !!student;

  return `
    <div class="form-section fade-in">
      <div class="form-group">
        <label class="form-label">姓名 *</label>
        <input type="text" id="f-name" value="${student?.name || ''}" placeholder="學員姓名">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">年齡</label>
          <input type="number" id="f-age" value="${student?.age || ''}" placeholder="年齡">
        </div>
        <div class="form-group">
          <label class="form-label">電話</label>
          <input type="tel" id="f-phone" value="${student?.phone || ''}" placeholder="0912-345-678">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">訓練目標</label>
        <textarea id="f-goals" placeholder="例如：改善肩頸痠痛、增肌">${student?.goals || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">病史/傷病史</label>
        <textarea id="f-medical" placeholder="例如：右膝ACL重建術後">${student?.medicalHistory || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">NKT 檢測發現</label>
        <textarea id="f-nkt" placeholder="自由記錄 NKT 測試結果">${student?.nktFindings || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">目前訓練階段</label>
        <select id="f-phase">
          <option value="矯正期" ${student?.currentPhase === '矯正期' ? 'selected' : ''}>矯正期</option>
          <option value="肌力期" ${student?.currentPhase === '肌力期' ? 'selected' : ''}>肌力期</option>
          <option value="體能期" ${student?.currentPhase === '體能期' ? 'selected' : ''}>體能期</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">備註</label>
        <textarea id="f-notes" placeholder="例如：週三、週五固定課">${student?.notes || ''}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn-primary secondary" onclick="goBack()" style="flex:0.4">取消</button>
      <button class="btn-primary accent" onclick="saveStudentForm('${studentId || ''}')">${isEdit ? '💾 儲存' : '➕ 新增學員'}</button>
    </div>`;
}

function renderAddExercise() {
  return `
    <div class="form-section fade-in">
      <div class="form-group">
        <label class="form-label">動作名稱 *</label>
        <input type="text" id="fe-name" placeholder="例如：壺鈴擺盪">
      </div>
      <div class="form-group">
        <label class="form-label">分類</label>
        <select id="fe-category">
          <option value="暖身">暖身</option>
          <option value="NKT檢測">NKT檢測</option>
          <option value="矯正動作">矯正動作</option>
          <option value="肌力訓練" selected>肌力訓練</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">目標肌群</label>
        <input type="text" id="fe-target" placeholder="例如：臀大肌、核心">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">預設組數</label>
          <input type="number" id="fe-sets" value="3" placeholder="3">
        </div>
        <div class="form-group">
          <label class="form-label">預設次數</label>
          <input type="text" id="fe-reps" value="10" placeholder="10">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">動作提示</label>
        <textarea id="fe-cues" placeholder="教練備忘提示"></textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn-primary secondary" onclick="goBack()" style="flex:0.4">取消</button>
      <button class="btn-primary accent" onclick="saveExerciseForm()">➕ 新增動作</button>
    </div>`;
}
