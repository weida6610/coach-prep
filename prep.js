// ============================================
// Lesson Prep & In-Session Views
// ============================================

// State for current prep/session
let currentPrepPlan = [];
let currentAiSuggestions = [];
let currentSessionState = null;
let geminiLoading = false;

// ============================================
// Gemini AI Integration
// ============================================
function getApiKey(provider) {
  if (provider === 'openai') return localStorage.getItem('openai_api_key') || '';
  return localStorage.getItem('gemini_api_key') || '';
}

function getAiProvider() {
  return localStorage.getItem('ai_provider') || 'gemini';
}

async function callGeminiAI(studentId) {
  const provider = getAiProvider();
  const apiKey = getApiKey(provider);
  if (!apiKey) {
    showApiKeyModal();
    return;
  }

  const student = DB.getStudent(studentId);
  const sessions = DB.getSessions(studentId);
  const exerciseLib = DB.getExercises();

  const recentSessions = sessions.slice(0, 3).reverse();
  let historyText = '（無歷史紀錄）';
  if (recentSessions.length > 0) {
    historyText = recentSessions.map((s, i) => `
### 歷史紀錄 ${i+1}: ${s.date} (${s.sessionType})
- 當日狀況：${s.conditionNotes || '無'}
- 動作：
${s.exercises.map(e => `  * ${e.name} | ${e.sets}組×${e.reps} | 重量:${e.weight} | 品質:${e.quality || ''} | 備註:${e.notes || ''}`).join('\n')}
- 教練筆記：${s.coachNotes || '無'}
- 下堂建議：${s.nextSuggestion || '無'}
`).join('\n');
  }

  const libText = exerciseLib.map(e => `[${e.category}] ${e.name}`).join(', ');
  const n1Session = sessions[0];
  const n1Type = getModuleType(n1Session);
  const targetModule = n1Type === 'pull' ? '上肢推＋下肢推（Push 模組）' : '上肢拉＋下肢拉（Pull 模組）';

  const prompt = `你是一位跟隨這位教練多年的 AI 助教，專精 NKT 神經動能療法與功能性矯正訓練。
你的任務是：學習這位教練的排課邏輯，產出符合 A/B 模組交替原則的「下一堂課」建議動作清單。

## 學員基本資料
- 姓名：${student.name}
- 訓練目標：${student.goals}
- 病史：${student.medicalHistory || '無'}
- NKT發現：${student.nktFindings || '無'}
- 目前階段：${student.currentPhase}

## 過去上課紀錄（由舊到新）
${historyText}

## 本次模組方向
根據 A/B 交替邏輯，本次應排：**${targetModule}**

## 動作庫參考
${libText}

## 輸出要求
請提供 3-5 個「額外 AI 建議動作」（不含已在課表中的基本動作），要求：
1. 符合本次模組方向（${targetModule}）
2. 模仿教練的課表風格與動作命名習慣
3. 針對 NKT 發現提供相應激活或測試動作
4. 重量請參考歷史紀錄做漸進推算
5. 【重要】只回傳 JSON 陣列，不要任何說明文字：

[
  {
    "name": "動作名稱",
    "category": "暖身|NKT檢測|矯正動作|肌力訓練",
    "target": "目標肌群",
    "sets": 3,
    "reps": "10",
    "weight": "15kg",
    "cues": "提示"
  }
]`;

  geminiLoading = true;
  const loadingEl = document.getElementById('ai-suggestions-content');
  if (loadingEl) loadingEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--accent)"><div style="font-size:2rem;margin-bottom:8px" class="spin">🧠</div>AI 分析中...</div>';

  try {
    let text = '';
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.7 })
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'OpenAI API 錯誤'); }
      const data = await response.json();
      text = data.choices[0].message.content;
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } })
      });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error?.message || 'Gemini API 錯誤'); }
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    let jsonStr = text;
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const exercises = JSON.parse(jsonStr);
    geminiLoading = false;

    // Populate AI suggestions (do NOT replace main plan)
    currentAiSuggestions = exercises.map(ex => ({
      exerciseId: 'AI-' + Math.random().toString(36).substr(2, 6),
      name: ex.name,
      category: ex.category || '肌力訓練',
      target: ex.target || '',
      sets: ex.sets || 3,
      reps: String(ex.reps || '10'),
      weight: ex.weight || '-',
      cues: ex.cues || '',
      isAiGenerated: true
    }));

    // Re-render AI suggestions section only
    const aiContent = document.getElementById('ai-suggestions-content');
    if (aiContent) aiContent.innerHTML = renderAiSuggestionsContent(studentId);
    showToast('✅ AI 建議已產生！');

  } catch (err) {
    geminiLoading = false;
    console.error('API error:', err);
    const aiContent = document.getElementById('ai-suggestions-content');
    if (aiContent) aiContent.innerHTML = `<div style="text-align:center;padding:16px;color:var(--danger)">❌ ${err.message}<br><br><button class="btn-primary secondary" style="display:inline-flex;width:auto;padding:8px 20px" onclick="showApiKeyModal()">🔑 檢查 API Key</button></div>`;
  }
}

function renderAiSuggestionsContent(studentId) {
  if (currentAiSuggestions.length === 0) {
    return '<div style="color:var(--text-muted);text-align:center;padding:16px;font-size:0.85rem">點擊「產生 AI 建議」讓 AI 分析學員歷史並推薦動作</div>';
  }
  const catEmojis = { '暖身':'🏃', 'NKT檢測':'🔬', '矯正動作':'🔧', '肌力訓練':'🏋️' };
  return currentAiSuggestions.map((ex, idx) => {
    const existsInLib = DB.getExercises().some(e => e.name === ex.name);
    return `
    <div class="exercise-item" style="border-left:2px solid var(--accent);margin-bottom:8px">
      <div class="exercise-icon strength" style="font-size:1rem">${catEmojis[ex.category] || '💪'}</div>
      <div class="exercise-details" style="flex:1">
        <div class="exercise-name">${ex.name}</div>
        <div class="exercise-spec">${ex.sets}×${ex.reps}${ex.weight !== '-' ? ' · ' + ex.weight : ''}</div>
        ${ex.cues ? `<div style="font-size:0.7rem;color:var(--text-muted)">${ex.cues}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
        <button onclick="addAiSuggestionToPrep(${idx},'${studentId}')" style="font-size:0.7rem;padding:4px 8px;border-radius:var(--radius-sm);background:var(--accent);color:#000;border:none;cursor:pointer;white-space:nowrap">+ 加入備課</button>
        ${!existsInLib ? `<button id="ai-lib-${idx}" onclick="addAiSuggestionToLibrary(${idx})" style="font-size:0.7rem;padding:4px 8px;border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border);cursor:pointer;white-space:nowrap">📚 加入庫</button>` : '<span style="font-size:0.65rem;color:var(--text-muted)">已在庫中</span>'}
      </div>
    </div>`;
  }).join('');
}

function addAiSuggestionToPrep(idx, studentId) {
  const ex = currentAiSuggestions[idx];
  if (!ex) return;
  currentPrepPlan.push({ ...ex });
  showToast(`✅ 已加入「${ex.name}」`);
  // Re-render prep view to show the added exercise
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
}

function addAiSuggestionToLibrary(idx) {
  const ex = currentAiSuggestions[idx];
  if (!ex) return;
  DB.saveExercise({
    name: ex.name, category: ex.category,
    target: ex.target || '', defaultSets: ex.sets,
    defaultReps: String(ex.reps), cues: ex.cues || ''
  });
  showToast(`✅ 「${ex.name}」已加入動作庫`);
  const btn = document.getElementById(`ai-lib-${idx}`);
  if (btn) { btn.innerHTML = '✅ 已加入'; btn.disabled = true; btn.style.color = 'var(--success)'; }
}

function showApiKeyModal() {
  const provider = getAiProvider();
  const currentKey = getApiKey(provider);
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">🔑 AI 引擎設定</div></div>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">選擇 AI 引擎</label>
        <select id="ai-provider-select" onchange="updateModalKeyInput(this.value)">
          <option value="gemini" ${provider === 'gemini' ? 'selected' : ''}>Google Gemini (預設)</option>
          <option value="openai" ${provider === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT 4o-mini)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">API Key</label>
        <input type="password" id="api-key-input" value="${currentKey}" placeholder="API Key">
      </div>
      <p id="api-link-text" style="font-size:0.75rem;color:var(--text-secondary);line-height:1.5;margin-bottom:16px"></p>
      <button class="btn-primary accent" onclick="saveAiSettings()">💾 儲存</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
  updateModalKeyInput(provider);
}

window.updateModalKeyInput = function(provider) {
  const input = document.getElementById('api-key-input');
  const linkText = document.getElementById('api-link-text');
  input.value = getApiKey(provider);
  if (provider === 'openai') {
    input.placeholder = "sk-...";
    linkText.innerHTML = '前往 <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent)">OpenAI Platform</a> 取得金鑰';
  } else {
    input.placeholder = "AIzaSy...";
    linkText.innerHTML = '前往 <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent)">Google AI Studio</a> 取得金鑰';
  }
};

window.saveAiSettings = function() {
  const provider = document.getElementById('ai-provider-select').value;
  const key = document.getElementById('api-key-input').value.trim();
  localStorage.setItem('ai_provider', provider);
  if (provider === 'openai') localStorage.setItem('openai_api_key', key);
  else localStorage.setItem('gemini_api_key', key);
  closeModal();
  showToast('✅ AI 設定已儲存');
};

// ============================================
// Module Type Detection (A/B Logic)
// ============================================
function getModuleType(session) {
  if (!session || !session.exercises) return 'push'; // default to push if no history

  const names = session.exercises.map(e => e.name || '').join(' ');

  const pullKeywords = ['划船', '下拉', 'Chin', '引體', '面拉', 'Face Pull', '闊背', 'lat', 'row'];
  const pushKeywords = ['伏地挺身', '臥推', '肩推', '三頭', 'push', 'Push', 'press'];
  const hingeKeywords = ['羅馬尼亞', '硬舉', 'RDL', '單腿RDL'];
  const squatKeywords = ['深蹲', 'Lunge', '弓步', '臀推', '分腿', 'squat'];

  const hasPull = pullKeywords.some(k => names.includes(k));
  const hasPush = pushKeywords.some(k => names.includes(k));
  const hasHinge = hingeKeywords.some(k => names.includes(k));
  const hasSquat = squatKeywords.some(k => names.includes(k));

  const pullScore = (hasPull ? 1 : 0) + (hasHinge ? 1 : 0);
  const pushScore = (hasPush ? 1 : 0) + (hasSquat ? 1 : 0);

  return pullScore >= pushScore ? 'pull' : 'push';
}

// ============================================
// AI Local Suggestions (Rule-based)
// ============================================
function generateAISuggestions(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return [];

  const sessions = DB.getSessions(studentId); // sorted desc: [N-1, N-2, ...]
  const n1Session = sessions[0]; // last session
  const n2Session = sessions[1]; // session before last

  const plan = [];

  // ---- Opening: always start with lumbar breathing ----
  plan.push({
    exerciseId: 'custom',
    name: '仰臥腰椎控制呼吸',
    category: '矯正動作',
    target: '核心穩定',
    sets: 1,
    reps: '5次呼吸',
    weight: '-',
    cues: '骨盆腰椎規則建立'
  });

  // ---- Determine module based on N-1 vs N-2 alternation ----
  const n1Type = getModuleType(n1Session); // what last session was
  const targetType = n1Type === 'pull' ? 'push' : 'pull'; // next should be opposite

  if (n2Session) {
    // Base this session on N-2 exercises (same module as today), with progression
    const baseExercises = n2Session.exercises.filter(e =>
      e.name !== '仰臥腰椎控制呼吸' &&
      e.name !== '反向捲腹' &&
      e.category !== '暖身'
    );

    baseExercises.forEach(e => {
      // Slight progressive overload for exercises rated 優秀/良好
      let weight = e.weight || '-';
      // Keep same weight - coach will adjust during prep

      plan.push({
        exerciseId: e.exerciseId || 'custom',
        name: e.name,
        category: e.category || '肌力訓練',
        target: e.target || '',
        sets: e.sets || 3,
        reps: String(e.reps || '10'),
        weight: weight,
        cues: e.cues || ''
      });
    });

    // Add core work if last same-module session had it
    const hadReverseAbsCrunch = n2Session.exercises.some(e => e.name && e.name.includes('反向捲腹'));
    if (hadReverseAbsCrunch) {
      plan.splice(1, 0, {
        exerciseId: 'custom', name: '反向捲腹',
        category: '矯正動作', target: '核心',
        sets: 2, reps: '8', weight: '-', cues: '控制骨盆腰椎規則'
      });
    }
  } else if (n1Session) {
    // Only one session exists — generate the complementary module
    addDefaultModuleExercises(plan, targetType, student);
  } else {
    // No history — generate an assessment + basic plan
    plan.push({ exerciseId:'custom', name:'脊椎旋轉test', category:'NKT檢測', target:'脊椎', sets:1, reps:'測試', weight:'-', cues:'' });
    plan.push({ exerciseId:'E031', name:'啞鈴羅馬尼亞硬舉', category:'肌力訓練', target:'後側鏈', sets:3, reps:'8', weight:'空手', cues:'髖鉸鏈，微曲膝' });
    plan.push({ exerciseId:'E030', name:'高腳杯深蹲', category:'肌力訓練', target:'股四頭/臀大肌', sets:3, reps:'8', weight:'空手', cues:'挺胸，膝蓋對齊腳尖' });
  }

  return plan;
}

function addDefaultModuleExercises(plan, moduleType, student) {
  if (moduleType === 'push') {
    plan.push({ exerciseId:'custom', name:'伏地挺身', category:'肌力訓練', target:'胸肩三頭', sets:3, reps:'8', weight:'-', cues:'扶槓鈴退階，核心收緊' });
    plan.push({ exerciseId:'E030', name:'高腳杯深蹲', category:'肌力訓練', target:'股四頭/臀大肌', sets:4, reps:'8', weight:'空手', cues:'挺胸，膝蓋對齊腳尖' });
  } else {
    plan.push({ exerciseId:'custom', name:'Cable坐姿划船', category:'肌力訓練', target:'背闊肌/菱形肌', sets:3, reps:'10', weight:'42lb', cues:'肩胛先啟動再拉' });
    plan.push({ exerciseId:'E031', name:'啞鈴羅馬尼亞硬舉', category:'肌力訓練', target:'後側鏈', sets:4, reps:'8', weight:'空手', cues:'髖鉸鏈，微曲膝' });
  }
}

// ============================================
// Add exercise to library (from prep plan)
// ============================================
function addAiExerciseToLibrary(idx) {
  const ex = currentPrepPlan[idx];
  if (!ex) return;
  DB.saveExercise({
    name: ex.name, category: ex.category,
    target: ex.target || '', defaultSets: ex.sets,
    defaultReps: String(ex.reps), cues: ex.cues || ''
  });
  showToast(`✅ 「${ex.name}」已加入動作庫`);
  const btn = document.getElementById(`save-lib-${idx}`);
  if (btn) { btn.innerHTML = '✅ 已加入'; btn.style.color = 'var(--success)'; btn.disabled = true; }
}

// ============================================
// Prep Exercise Inline Editing
// ============================================
function adjustPrepSets(idx, delta) {
  if (idx < 0 || idx >= currentPrepPlan.length) return;
  currentPrepPlan[idx].sets = Math.max(1, (parseInt(currentPrepPlan[idx].sets) || 1) + delta);
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
}

function updatePrepField(idx, field, value) {
  if (idx < 0 || idx >= currentPrepPlan.length) return;
  currentPrepPlan[idx][field] = value;
  // No re-render to avoid losing input focus
}

// ============================================
// Save Prep Plan Modal
// ============================================
function showSavePrepModal(studentId) {
  const today = getTodayStr();
  const notes = document.getElementById('prep-notes')?.value || '';
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">💾 儲存備課計畫</div></div>
    <div class="form-section">
      <div class="form-group">
        <label class="form-label">上課日期</label>
        <input type="date" id="prep-save-date" value="${today}">
      </div>
      <div class="form-group">
        <label class="form-label">上課時間</label>
        <input type="time" id="prep-save-time" value="09:00">
      </div>
      <button class="btn-primary accent" onclick="confirmSavePrepPlan('${studentId}', '${notes.replace(/'/g,'&#39;')}')">💾 確認儲存</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

function confirmSavePrepPlan(studentId, notes) {
  const date = document.getElementById('prep-save-date').value;
  const time = document.getElementById('prep-save-time').value;
  if (!date || !time) { showToast('❌ 請填寫日期與時間'); return; }

  const student = DB.getStudent(studentId);
  const planId = `PP-${date.replace(/-/g,'')}-${time.replace(':','')}-${studentId}`;

  const plan = {
    id: planId,
    studentId,
    studentName: student?.name || '',
    scheduledDate: date,
    scheduledTime: time,
    exercises: currentPrepPlan.filter(e => typeof e === 'object' && e.name),
    status: 'confirmed',
    notes: notes || '',
    autoGenerated: false,
    createdAt: Date.now()
  };

  DB.savePrepPlan(plan);
  closeModal();
  showToast('✅ 備課計畫已儲存！');
}

// ============================================
// Render Prep View
// ============================================
function renderPrep(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';

  const sessions = DB.getSessions(studentId);
  const lastSession = sessions[0];

  // Init plan if not already set for this student
  if (!currentPrepPlan || currentPrepPlan.length === 0 || currentPrepPlan.studentId !== studentId) {
    currentPrepPlan = generateAISuggestions(studentId);
    currentPrepPlan.studentId = studentId;
    currentAiSuggestions = []; // reset AI suggestions for new student
  }

  const catIcons = { '暖身':'warmup', 'NKT檢測':'nkt', '矯正動作':'corrective', '肌力訓練':'strength' };
  const catEmojis = { '暖身':'🏃', 'NKT檢測':'🔬', '矯正動作':'🔧', '肌力訓練':'🏋️' };

  // Determine current module type for display
  const n1Session = sessions[0];
  const n1Type = getModuleType(n1Session);
  const todayModule = n1Type === 'pull' ? '🏋️ Push 模組' : '🚣 Pull 模組';

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
        <div class="student-name">${student.name} <span class="tag tag-accent">${student.currentPhase}</span> <span class="tag" style="background:rgba(0,229,160,0.15);color:var(--accent)">${todayModule}</span></div>
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="prep-section-title" style="margin-bottom:0">📋 本次課表</div>
        <span style="font-size:0.72rem;color:var(--text-muted)">點擊組數 ± 可調整</span>
      </div>

      ${Object.entries(groups).map(([cat, exercises]) => `
        <div class="exercise-group">
          <div class="exercise-group-title">${catEmojis[cat] || '💪'} ${cat}</div>
          ${exercises.map((ex) => {
            const globalIdx = currentPrepPlan.indexOf(ex);
            const existsInLib = DB.getExercises().some(e => e.name === ex.name);
            return `
            <div class="exercise-item" id="prep-ex-${globalIdx}">
              <div class="exercise-icon ${catIcons[cat] || 'strength'}">${catEmojis[cat] || '💪'}</div>
              <div class="exercise-details" style="flex:1;min-width:0">
                <div class="exercise-name">${ex.name}</div>
                <div style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">
                  <div style="display:flex;align-items:center;gap:4px">
                    <button onclick="adjustPrepSets(${globalIdx},-1)" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">−</button>
                    <span style="font-size:0.82rem;font-weight:600;min-width:16px;text-align:center">${ex.sets}</span>
                    <button onclick="adjustPrepSets(${globalIdx},1)" style="width:22px;height:22px;border-radius:50%;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:0.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1">+</button>
                    <span style="font-size:0.75rem;color:var(--text-muted)">組</span>
                  </div>
                  <span style="color:var(--text-muted);font-size:0.75rem">×</span>
                  <input type="text" value="${ex.reps}" onchange="updatePrepField(${globalIdx},'reps',this.value)"
                    style="width:48px;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:0.78rem;text-align:center">
                  <span style="color:var(--text-muted);font-size:0.75rem">次</span>
                  <input type="text" value="${ex.weight}" onchange="updatePrepField(${globalIdx},'weight',this.value)" placeholder="重量"
                    style="width:64px;padding:2px 4px;border-radius:4px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-primary);font-size:0.78rem;text-align:center">
                </div>
                ${ex.cues ? `<div style="font-size:0.7rem;color:var(--text-muted);margin-top:2px">${ex.cues}</div>` : ''}
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end;flex-shrink:0">
                ${ex.isAiGenerated && !existsInLib ? `<button id="save-lib-${globalIdx}" onclick="addAiExerciseToLibrary(${globalIdx}); event.stopPropagation();" style="font-size:0.65rem;padding:3px 6px;border-radius:4px;background:var(--bg-card);color:var(--accent);border:1px solid var(--accent);cursor:pointer;white-space:nowrap">📚 加入庫</button>` : ''}
                <button onclick="removePrepExercise(${globalIdx}); event.stopPropagation();" style="font-size:0.75rem;padding:3px 6px;border-radius:4px;background:transparent;color:var(--text-muted);border:1px solid var(--border);cursor:pointer">✕</button>
              </div>
            </div>`;
          }).join('')}
        </div>`).join('')}

      <button class="btn-add-exercise" onclick="showExercisePicker('${studentId}')">+ 新增動作</button>
    </div>

    <div class="prep-section fade-in stagger-3">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="prep-section-title" style="margin-bottom:0">🤖 AI 建議區 <span class="ai-badge">✨ 輔助</span></div>
        <button onclick="callGeminiAI('${studentId}')" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:var(--radius-full);background:linear-gradient(135deg,rgba(108,92,231,0.3),rgba(0,229,160,0.3));border:1px solid rgba(108,92,231,0.4);color:var(--text-primary);font-size:0.75rem;font-weight:600;cursor:pointer">🧠 產生建議</button>
      </div>
      <div id="ai-suggestions-content">
        ${renderAiSuggestionsContent(studentId)}
      </div>
    </div>

    <div class="prep-section fade-in stagger-4">
      <div class="form-group">
        <label class="form-label">📝 備課備註（選填）</label>
        <textarea id="prep-notes" placeholder="今天需要特別注意的事項..."></textarea>
      </div>
    </div>

    <div style="height:100px"></div>
    <div class="floating-actions">
      <button class="btn-primary secondary" onclick="showSavePrepModal('${studentId}')" style="flex:0.45">💾 儲存備課</button>
      <button class="btn-primary accent" onclick="startSession('${studentId}')">▶ 開始上課</button>
    </div>`;
}

// ============================================
// Render Session View
// ============================================
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
        <textarea id="exercise-note" placeholder="快速備註（如：第3組有代償、NKT發現...）" oninput="updateExerciseNote(this.value)">${ex.notes}</textarea>
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
        <textarea id="overall-notes" placeholder="整體觀察、NKT發現、下次重點..." oninput="currentSessionState.overallNotes=this.value">${state.overallNotes}</textarea>
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

// ============================================
// Student / Exercise Form Renderers
// ============================================
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
