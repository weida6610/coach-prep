// ============================================
// Lesson Prep & In-Session Views
// ============================================

// State for current prep/session
let currentPrepPlan = [];
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

  const recentSessions = sessions.slice(0, 3).reverse(); // Oldest to newest (index 0=N-2, 1=N-1, 2=most recent)
  let historyText = '（無歷史紀錄）';

  // Classify each session as Module A (上肢推+下肢拉) or B (上肢拉+下肢推)
  function classifyModule(session) {
    if (!session) return null;
    let push = 0, pull = 0;
    session.exercises.forEach(e => {
      const cat = e.category || e.name || '';
      if (cat.includes('推') || cat.includes('胸') || cat.includes('肩') || cat.includes('三頭')) push++;
      if (cat.includes('拉') || cat.includes('背') || cat.includes('二頭') || cat.includes('划')) pull++;
    });
    if (push > pull) return 'A（上肢推＋下肢拉）';
    if (pull > push) return 'B（上肢拉＋下肢推）';
    return '不明確';
  }

  const sessionN2 = recentSessions[0] || null;
  const sessionN1 = recentSessions[1] || null;
  const modN2 = classifyModule(sessionN2);
  const modN1 = classifyModule(sessionN1);
  // N should match N-2; if N-2 is A, N is A; if N-2 is B, N is B
  let targetModule = '不明確';
  if (modN2 === 'A（上肢推＋下肢拉）') targetModule = 'A（上肢推＋下肢拉）';
  else if (modN2 === 'B（上肢拉＋下肢推）') targetModule = 'B（上肢拉＋下肢推）';
  else if (modN1 === 'A（上肢推＋下肢拉）') targetModule = 'B（上肢拉＋下肢推）';
  else if (modN1 === 'B（上肢拉＋下肢推）') targetModule = 'A（上肢推＋下肢拉）';

  if (recentSessions.length > 0) {
    historyText = recentSessions.map((s, i) => {
      const label = i === 0 ? 'N-2（上上次）' : i === 1 ? 'N-1（上次）' : 'N-0（最近）';
      return `
### ${label}: ${s.date} (${s.sessionType})
- 模組分析：${classifyModule(s) || '不明確'}
- 當日狀況：${s.conditionNotes || '無'}
- 動作：
${s.exercises.map(e => `  * ${e.name} | ${e.sets}組×${e.reps} | 重量:${e.weight} | 品質:${e.quality || ''} | 備註:${e.notes || ''}`).join('\n')}
- 教練筆記：${s.coachNotes || '無'}
- 下堂建議：${s.nextSuggestion || '無'}`;
    }).join('\n');
  }

  const libText = exerciseLib.map(e => `[${e.category}] ${e.name}`).join(', ');

  // 強化版 Prompt：要求 AI 模仿前三次課表邏輯並運用學員專屬動作庫
  const prompt = `你是一位跟隨這位教練多年的 AI 助教。
你的任務是：根據學員的訓練目標與過去紀錄，**自由發揮提出 3 個最適合這位學員的創意訓練動作**，加在課表最下方。

## 學員基本資料
- 姓名：${student.name}
- 訓練目標：${student.goals}
- 病史：${student.medicalHistory || '無'}
- NKT發現：${student.nktFindings || '無'}
- 目前階段：${student.currentPhase}

## 過去上課紀錄（由舊到新）
${historyText}

## 課表模組輪替規則（重要）
- **模組 A**：上肢推（胸大肌、三角肌、三頭肌）＋ 下肢拉（臀大肌、腿後側）
- **模組 B**：上肢拉（背闊肌、菱形肌、二頭肌）＋ 下肢推（股四頭肌、臀肌）
- 規律：N-2 ≈ N（同模組），N-1 與 N 互為相反
- 分析結果：N-2 = ${modN2 || '無資料'}｜N-1 = ${modN1 || '無資料'}
- **本次（N）目標模組 = ${targetModule}**（請依此安排主訓練動作）

## 動作庫參考（可使用庫內動作也可自由創建）
${libText}

## 你的任務
請提出 **剛好 3 個** 符合本次模組（${targetModule}）且適合該學員目標的「創意補充動作」：
1. 必須符合學員訓練目標、身體狀況，有傷處請迴避
2. 動作必須呼應本次模組（${targetModule}）的主要肌群
3. 【極度重要】不准加任何解說文字，不要 markdown 格式，只准回覆以下格式的 JSON 陣列（剛好3個）：

[
  {
    "name": "動作名稱",
    "category": "暖身|NKT評估|核心控制|上肢推|上肢拉|下肢|全身",
    "target": "目標肌群",
    "sets": 3,
    "reps": "12",
    "weight": "15kg",
    "cues": "提示"
  }
]`;

  geminiLoading = true;
  const loadingEl = document.getElementById('gemini-result');
  if (loadingEl) loadingEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--accent)"><div style="font-size:2rem;margin-bottom:8px" class="spin">🧠</div>正在分析學員資料並產生課表...</div>';

  try {
    let text = '';
    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'OpenAI API 錯誤');
      }
      const data = await response.json();
      text = data.choices[0].message.content;
    } else {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
        })
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Gemini API 錯誤');
      }
      const data = await response.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }
    
    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text;
    const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) jsonStr = jsonMatch[0];
    
    const exercises = JSON.parse(jsonStr);
    geminiLoading = false;

    // Remove previous free-style items, keep manual ones
    const baseItems = currentPrepPlan.filter(ex => !ex.isFreeStyle);
    const freeItems = exercises.slice(0, 3).map(ex => ({
      exerciseId: 'AI-' + Math.random().toString(36).substr(2, 6),
      name: ex.name,
      category: ex.category,
      target: ex.target || '',
      sets: ex.sets || 3,
      reps: String(ex.reps || '10'),
      weight: ex.weight || '-',
      cues: ex.cues || '',
      isFreeStyle: true
    }));
    currentPrepPlan = [...baseItems, ...freeItems];
    currentPrepPlan.studentId = studentId;

    // Re-render prep view
    navigationStack.pop();
    navigate('prep', studentId);
    showToast('✅ AI 自由發揮項目已加入課表底部！');
    
  } catch (err) {
    geminiLoading = false;
    console.error('API error:', err);
    if (loadingEl) loadingEl.innerHTML = `<div style="text-align:center;padding:16px;color:var(--danger)">❌ AI 產生失敗：${err.message}<br><br><button class="btn-primary secondary" style="display:inline-flex;width:auto;padding:8px 20px" onclick="showApiKeyModal()">🔑 檢查 API Key</button></div>`;
  }
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
  showToast('✅ 設定已儲存');
};

function addAiExerciseToLibrary(idx) {
  const ex = currentPrepPlan[idx];
  if (!ex) return;
  
  DB.saveExercise({
    name: ex.name,
    category: ex.category,
    target: ex.target || '',
    defaultSets: ex.sets,
    defaultReps: String(ex.reps),
    cues: ex.cues || ''
  });
  
  showToast(`✅ 「${ex.name}」已加入動作庫`);
  // Update button visual
  const btn = document.getElementById(`save-lib-${idx}`);
  if (btn) {
    btn.innerHTML = '✅ 已加入';
    btn.style.color = 'var(--success)';
    btn.disabled = true;
  }
}

function generateAISuggestions(studentId) {
  const student = DB.getStudent(studentId);
  const sessions = DB.getSessions(studentId);
  const exerciseLib = DB.getExercises();

  // sessions[0] = N-1（上次），sessions[1] = N-2（上上次）
  const sessionN1 = sessions[0] || null;
  const sessionN2 = sessions[1] || null;

  // Classify a session as Module A (上肢推+下肢) or B (上肢拉+下肢)
  function classifyModule(session) {
    if (!session) return null;
    let push = 0, pull = 0;
    session.exercises.forEach(e => {
      const cat = e.category || '';
      if (cat.includes('推')) push++;
      if (cat.includes('拉')) pull++;
    });
    if (push > pull) return 'A';
    if (pull > push) return 'B';
    return null;
  }

  const modN2 = classifyModule(sessionN2);
  const modN1 = classifyModule(sessionN1);

  // ── 情況 1：有 N-2 → 以 N-2 為模板（N 與 N-2 同模組）──
  if (sessionN2) {
    return sessionN2.exercises.map(e => {
      let newWeight = e.weight || '';
      // 品質優秀 → 建議 +2kg
      if (e.quality === '優秀' && newWeight && newWeight !== '-') {
        const numMatch = newWeight.match(/(\d+)/);
        if (numMatch) newWeight = newWeight.replace(numMatch[1], String(parseInt(numMatch[1]) + 2));
      }
      return {
        exerciseId: e.exerciseId,
        name: e.name,
        category: e.category || '',
        sets: e.sets || 4,
        reps: e.reps || '10',
        weight: newWeight,
        cues: ''
      };
    });
  }

  // ── 情況 2：只有 N-1，沒有 N-2 → N 與 N-1 相反模組 ──
  if (sessionN1) {
    // 帶入 N-1 中非主訓練的部分（暖身、核心等），主訓練改為相反模組
    const plan = [];
    // 保留 N-1 的暖身/NKT/核心動作
    sessionN1.exercises.forEach(e => {
      const cat = e.category || '';
      if (cat.includes('NKT') || cat.includes('核心') || cat.includes('暖身')) {
        plan.push({
          exerciseId: e.exerciseId, name: e.name, category: cat,
          sets: e.sets || 2, reps: e.reps || '8', weight: e.weight || '-', cues: ''
        });
      }
    });
    // 主訓練：N-1 的相反模組，從動作庫挑選
    const oppositeModule = modN1 === 'A' ? 'B' : 'A';
    const mainCats = oppositeModule === 'A' ? ['上肢推', '下肢'] : ['上肢拉', '下肢'];
    mainCats.forEach(cat => {
      const available = exerciseLib.filter(e => e.category === cat);
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      shuffled.slice(0, 2).forEach(e => {
        plan.push({ exerciseId: e.id, name: e.name, category: e.category, sets: 4, reps: '10', weight: '', cues: '' });
      });
    });
    return plan;
  }

  // ── 情況 3：完全沒有歷史 → 從動作庫均衡挑選 ──
  const plan = [];
  const categories = ['NKT評估', '核心控制', '上肢推', '上肢拉', '下肢', '全身'];
  categories.forEach(cat => {
    const available = exerciseLib.filter(e => e.category === cat);
    const count = (cat === 'NKT評估' || cat === '核心控制') ? 1 : 2;
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    shuffled.slice(0, Math.min(count, available.length)).forEach(e => {
      const isWarmup = cat === 'NKT評估' || cat === '核心控制';
      plan.push({
        exerciseId: e.id, name: e.name, category: e.category,
        sets: isWarmup ? 2 : 4, reps: isWarmup ? '8' : '10', weight: isWarmup ? '-' : '', cues: ''
      });
    });
  });
  return plan;
}

// ── Prep exercise row helpers ──
function renderPrepExerciseRow(ex, idx, catIcons, catEmojis) {
  return `
    <div id="prep-ex-${idx}" draggable="true"
      ondragstart="prepDragStart(event,${idx})" ondragover="prepDragOver(event,${idx})"
      ondrop="prepDrop(event,${idx})" ondragend="prepDragEnd(event)"
      style="padding:8px 4px;border-bottom:1px solid var(--border);transition:opacity 0.15s,border-top 0.1s">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span class="prep-drag-handle" data-idx="${idx}"
          style="cursor:grab;color:var(--text-muted);font-size:1rem;flex-shrink:0;touch-action:none;padding:4px 2px" title="拖曳排序">⠿</span>
        <div class="exercise-icon ${catIcons[ex.category]||'full'}" style="width:26px;height:26px;font-size:0.8rem;flex-shrink:0">${catEmojis[ex.category]||'💪'}</div>
        <div style="flex:1;min-width:0;font-size:0.88rem;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ex.name}</div>
        <button onclick="addSubSet(${idx})" title="新增不同重量" style="background:var(--accent);color:#000;border:none;border-radius:50%;width:22px;height:22px;font-size:1rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;line-height:1;padding:0">+</button>
        <button onclick="removePrepExercise(${idx})" style="background:none;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer;flex-shrink:0;padding:0 2px;width:22px;height:22px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div style="display:flex;align-items:center;gap:4px;padding-left:32px">
        <input value="${ex.weight!=='-'?ex.weight:''}" placeholder="重量" oninput="updatePrepExercise(${idx},'weight',this.value)" style="width:66px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 6px;color:var(--text-primary);font-size:0.85rem;text-align:center;box-sizing:border-box">
        <span style="color:var(--text-muted);font-size:0.75rem">×</span>
        <input value="${ex.reps}" placeholder="次" oninput="updatePrepExercise(${idx},'reps',this.value)" style="width:46px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;color:var(--text-primary);font-size:0.85rem;text-align:center;box-sizing:border-box">
        <span style="color:var(--text-muted);font-size:0.75rem">×</span>
        <input type="number" min="1" value="${ex.sets}" placeholder="組" oninput="updatePrepExercise(${idx},'sets',this.value)" style="width:38px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;color:var(--text-primary);font-size:0.85rem;text-align:center;box-sizing:border-box">
      </div>
      ${(ex.subSets||[]).map((ss,si) => `
      <div style="display:flex;align-items:center;gap:4px;padding-left:32px;margin-top:4px">
        <span style="color:var(--accent);font-size:0.7rem;width:10px;flex-shrink:0">↳</span>
        <input value="${ss.weight||''}" placeholder="重量" oninput="updateSubSet(${idx},${si},'weight',this.value)" style="width:60px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 6px;color:var(--text-primary);font-size:0.85rem;text-align:center;box-sizing:border-box">
        <span style="color:var(--text-muted);font-size:0.75rem">×</span>
        <input value="${ss.reps||''}" placeholder="次" oninput="updateSubSet(${idx},${si},'reps',this.value)" style="width:46px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;color:var(--text-primary);font-size:0.85rem;text-align:center;box-sizing:border-box">
        <span style="color:var(--text-muted);font-size:0.75rem">×</span>
        <input type="number" min="1" value="${ss.sets||1}" placeholder="組" oninput="updateSubSet(${idx},${si},'sets',this.value)" style="width:38px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:5px 4px;color:var(--text-primary);font-size:0.85rem;text-align:center;box-sizing:border-box">
        <button onclick="removeSubSet(${idx},${si})" style="background:none;border:none;color:var(--text-muted);font-size:0.9rem;cursor:pointer;padding:0 4px;flex-shrink:0">✕</button>
      </div>`).join('')}
    </div>`;
}

function renderPrepFreeItem(ex, idx, catIcons, catEmojis) {
  return `
    <div style="padding:8px 4px;border-bottom:1px solid rgba(108,92,231,0.2)">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <div class="exercise-icon ${catIcons[ex.category]||'full'}" style="width:26px;height:26px;font-size:0.8rem;flex-shrink:0">${catEmojis[ex.category]||'💪'}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:0.88rem;font-weight:500">${ex.name}</div>
          ${ex.cues ? `<div style="font-size:0.72rem;color:var(--text-muted)">${ex.cues}</div>` : ''}
        </div>
        <button onclick="addAiExerciseToLibrary(${idx})" id="save-lib-${idx}"
          style="background:none;border:1px solid var(--accent-secondary);border-radius:var(--radius-full);color:var(--accent-secondary);font-size:0.68rem;padding:3px 8px;cursor:pointer;flex-shrink:0;white-space:nowrap">加入資料庫</button>
        <button onclick="adoptFreeItem(${idx})" title="加入課表"
          style="background:var(--accent);color:#000;border:none;border-radius:50%;width:22px;height:22px;font-size:0.85rem;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:0">✓</button>
        <button onclick="removePrepExercise(${idx})" style="background:none;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer;flex-shrink:0;padding:0 2px;width:22px;height:22px;display:flex;align-items:center;justify-content:center">✕</button>
      </div>
      <div style="font-size:0.78rem;color:var(--text-secondary);padding-left:32px">
        ${ex.target ? `目標：${ex.target}　` : ''}${ex.sets}組 × ${ex.reps}　${ex.weight && ex.weight !== '-' ? ex.weight : ''}
      </div>
    </div>`;
}

// ── Body Check ──
let _lastBodyData = null;

function renderBodyCheck(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';

  const history = DB.getBodyData(studentId);
  _lastBodyData = history.length > 0 ? history[history.length - 1] : null;
  const last = _lastBodyData;

  return `
    <div class="prep-student-bar fade-in">
      <div class="student-avatar" style="background:${student.avatarColor}">${student.name.charAt(0)}</div>
      <div>
        <div class="student-name">${student.name}</div>
        <div class="student-meta">上課前身體數據記錄</div>
      </div>
    </div>
    ${last ? `
    <div class="prep-section fade-in stagger-1">
      <div class="prep-section-title">📊 上次記錄 <span style="font-size:0.7rem;color:var(--text-muted)">${last.date}</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
        ${[['體重','kg',last.weight],['肌肉量','kg',last.muscle],['體脂率','%',last.bodyFat]].map(([label,unit,val]) => `
          <div style="background:var(--bg-card);border-radius:10px;padding:12px;text-align:center">
            <div style="font-size:0.68rem;color:var(--text-muted)">${label}</div>
            <div style="font-size:1.3rem;font-weight:700">${val || '--'}</div>
            <div style="font-size:0.68rem;color:var(--text-muted)">${unit}</div>
          </div>`).join('')}
      </div>
    </div>` : ''}
    <div class="prep-section fade-in stagger-2">
      <div class="prep-section-title">📝 今日數據（選填）</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:12px">
        <div>
          <label style="font-size:0.72rem;color:var(--text-muted);display:block;text-align:center;margin-bottom:4px">體重 kg</label>
          <input type="number" step="0.1" id="bc-weight" placeholder="--" oninput="updateBodyCheckDiff()"
            style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px 4px;color:var(--text-primary);font-size:1rem;text-align:center;box-sizing:border-box">
          <div id="bc-weight-diff" style="text-align:center;min-height:20px;margin-top:4px;font-size:0.82rem;font-weight:700"></div>
        </div>
        <div>
          <label style="font-size:0.72rem;color:var(--text-muted);display:block;text-align:center;margin-bottom:4px">肌肉量 kg</label>
          <input type="number" step="0.1" id="bc-muscle" placeholder="--" oninput="updateBodyCheckDiff()"
            style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px 4px;color:var(--text-primary);font-size:1rem;text-align:center;box-sizing:border-box">
          <div id="bc-muscle-diff" style="text-align:center;min-height:20px;margin-top:4px;font-size:0.82rem;font-weight:700"></div>
        </div>
        <div>
          <label style="font-size:0.72rem;color:var(--text-muted);display:block;text-align:center;margin-bottom:4px">體脂率 %</label>
          <input type="number" step="0.1" id="bc-fat" placeholder="--" oninput="updateBodyCheckDiff()"
            style="width:100%;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:10px 4px;color:var(--text-primary);font-size:1rem;text-align:center;box-sizing:border-box">
          <div id="bc-fat-diff" style="text-align:center;min-height:20px;margin-top:4px;font-size:0.82rem;font-weight:700"></div>
        </div>
      </div>
      <p style="font-size:0.68rem;color:var(--text-muted);text-align:center;margin-top:10px">▲ 紅色＝上升　▼ 綠色＝下降</p>
    </div>
    <div style="height:80px"></div>
    <div class="floating-actions">
      <button class="btn-primary secondary" onclick="goBack()" style="flex:0.4">← 備課</button>
      <button class="btn-primary accent" onclick="saveBodyCheckAndStart('${studentId}')">▶ 開始上課</button>
    </div>`;
}

window.updateBodyCheckDiff = function() {
  const last = _lastBodyData;
  if (!last) return;
  const fields = [
    { inputId:'bc-weight', diffId:'bc-weight-diff', lastVal: last.weight   },
    { inputId:'bc-muscle', diffId:'bc-muscle-diff', lastVal: last.muscle   },
    { inputId:'bc-fat',    diffId:'bc-fat-diff',    lastVal: last.bodyFat  },
  ];
  fields.forEach(({ inputId, diffId, lastVal }) => {
    const input = document.getElementById(inputId);
    const diffEl = document.getElementById(diffId);
    if (!input || !diffEl) return;
    if (input.value === '' || lastVal === null || lastVal === undefined) { diffEl.innerHTML = ''; return; }
    const diff = parseFloat(input.value) - parseFloat(lastVal);
    if (isNaN(diff)) { diffEl.innerHTML = ''; return; }
    const sign  = diff > 0 ? '+' : '';
    const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '─';
    // 統一股票邏輯：▲ 紅色（上升）、▼ 綠色（下降）、持平灰色
    const color = diff > 0 ? 'var(--danger)' : diff < 0 ? 'var(--success)' : 'var(--text-muted)';
    diffEl.innerHTML = `<span style="color:${color}">${arrow} ${sign}${Math.abs(diff).toFixed(1)}</span>`;
  });
};

window.saveBodyCheckAndStart = function(studentId) {
  const weight = document.getElementById('bc-weight')?.value;
  const muscle = document.getElementById('bc-muscle')?.value;
  const fat    = document.getElementById('bc-fat')?.value;
  if (weight || muscle || fat) {
    DB.saveBodyData({
      studentId,
      date: getTodayStr(),
      weight: weight ? parseFloat(weight) : null,
      muscle: muscle ? parseFloat(muscle) : null,
      bodyFat: fat    ? parseFloat(fat)    : null,
    });
  }
  currentSessionState = null;
  navigate('session', studentId);
};

window.adoptFreeItem = function(idx) {
  if (!currentPrepPlan[idx]) return;
  currentPrepPlan[idx].isFreeStyle = false;
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
  showToast('✅ 已加入正式課表');
};

function renderPrep(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';

  const sessions = DB.getSessions(studentId);
  const lastSession = sessions[0];

  if (!currentPrepPlan || currentPrepPlan.studentId !== studentId) {
    const saved = localStorage.getItem(`prep_${studentId}`);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        currentPrepPlan = data.exercises || [];
        currentPrepPlan._prepNotes = data.notes || '';
      } catch(e) { currentPrepPlan = generateAISuggestions(studentId); }
    } else {
      currentPrepPlan = generateAISuggestions(studentId);
    }
    currentPrepPlan.studentId = studentId;
  }

  const catIcons  = { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢':'lower','全身':'full' };
  const catEmojis = { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢':'🦵','全身':'⚡' };

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
      <div class="prev-notes"><div class="prev-notes-content"><ul>
        ${lastSession.coachNotes ? `<li>${lastSession.coachNotes}</li>` : ''}
        ${lastSession.nextSuggestion ? `<li>💡 建議：${lastSession.nextSuggestion}</li>` : ''}
        ${lastSession.conditionNotes ? `<li>狀態：${lastSession.conditionNotes}</li>` : ''}
      </ul></div></div>
    </div>` : ''}
    ${sessions.length >= 1 ? `
    <div class="prep-section fade-in stagger-1">
      <div class="prep-section-title" style="cursor:pointer;display:flex;align-items:center;gap:6px" onclick="document.getElementById('history-panel').hidden=!document.getElementById('history-panel').hidden;this.querySelector('.hist-arrow').textContent=document.getElementById('history-panel').hidden?'▶':'▼'">
        <span class="hist-arrow" style="font-size:0.65rem;color:var(--text-muted)">▼</span> 📊 N-2 / N-1 課表對照
      </div>
      <div id="history-panel">
        ${sessions.slice(0, 2).reverse().map((s, i, arr) => {
          const label = arr.length === 2 ? ['N-2（上上次）','N-1（上次）'][i] : ['N-1（上次）'];
          return `
        <div style="margin-top:${i>0?'12':'6'}px;padding:10px;border-radius:var(--radius-md);background:var(--bg-card);border:1px solid var(--border)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:0.78rem;font-weight:700;color:var(--accent)">${label}</div>
            <div style="font-size:0.68rem;color:var(--text-muted)">${formatDate(s.date)}</div>
          </div>
          <div style="display:flex;gap:4px;padding:0 0 4px;font-size:0.62rem;color:var(--text-muted);font-weight:500">
            <div style="flex:1">動作</div>
            <div style="width:52px;text-align:center">重量</div>
            <div style="width:36px;text-align:center">次</div>
            <div style="width:28px;text-align:center">組</div>
            <div style="width:32px;text-align:center">品質</div>
          </div>
          ${s.exercises.map(e => `
          <div style="display:flex;align-items:center;gap:4px;padding:5px 0;border-top:1px solid var(--border);font-size:0.78rem">
            <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.name}</div>
            <div style="width:52px;text-align:center;color:var(--accent);font-size:0.75rem">${e.weight||'-'}</div>
            <div style="width:36px;text-align:center;font-size:0.75rem">${e.reps||'-'}</div>
            <div style="width:28px;text-align:center;font-size:0.75rem">${e.sets||'-'}</div>
            <div style="width:32px;text-align:center;font-size:0.72rem">${e.quality==='優秀'?'⭐':e.quality==='良好'?'👍':e.quality==='待加強'?'⚡':'-'}</div>
          </div>`).join('')}
          ${s.coachNotes ? `<div style="margin-top:6px;padding-top:6px;border-top:1px solid var(--border);font-size:0.72rem;color:var(--text-muted)">📝 ${s.coachNotes}</div>` : ''}
          ${s.nextSuggestion ? `<div style="font-size:0.72rem;color:var(--accent-secondary)">💡 ${s.nextSuggestion}</div>` : ''}
        </div>`;
        }).join('')}
      </div>
    </div>` : ''}
    <div class="prep-section fade-in stagger-2">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="prep-section-title" style="margin-bottom:0">📋 課表動作</div>
        <button onclick="callGeminiAI('${studentId}')" style="display:inline-flex;align-items:center;gap:6px;padding:7px 12px;border-radius:var(--radius-full);background:linear-gradient(135deg,rgba(108,92,231,0.3),rgba(0,229,160,0.3));border:1px solid rgba(108,92,231,0.4);color:var(--text-primary);font-size:0.78rem;font-weight:600;cursor:pointer">🧠 AI</button>
      </div>
      <div id="gemini-result"></div>
      <div style="display:flex;gap:4px;padding:0 4px 4px;font-size:0.68rem;color:var(--text-muted);font-weight:500">
        <div style="flex:1"></div>
        <div style="width:66px;text-align:center">重量</div>
        <div style="width:46px;text-align:center">次數</div>
        <div style="width:38px;text-align:center">組數</div>
        <div style="width:54px"></div>
      </div>
      ${currentPrepPlan.filter(ex => !ex.isFreeStyle).map((ex, idx) => renderPrepExerciseRow(ex, idx, catIcons, catEmojis)).join('')}
      ${currentPrepPlan.filter(ex => ex.isFreeStyle).length > 0 ? `
      <div style="margin-top:16px;padding:10px 8px 6px;border-radius:var(--radius-md);background:linear-gradient(135deg,rgba(108,92,231,0.12),rgba(0,229,160,0.08));border:1px solid rgba(108,92,231,0.3)">
        <div style="font-size:0.72rem;color:var(--accent-secondary);font-weight:700;letter-spacing:0.05em;margin-bottom:8px">🧠 AI 自由發揮建議</div>
        ${currentPrepPlan.map((ex, idx) => ex.isFreeStyle ? renderPrepFreeItem(ex, idx, catIcons, catEmojis) : '').join('')}
      </div>` : ''}
      <button class="btn-add-exercise" onclick="showExercisePicker('${studentId}')" style="margin-top:8px">+ 新增動作</button>
    </div>
    <div class="prep-section">
      <div class="form-group">
        <label class="form-label">📝 備課備註（選填）</label>
        <textarea id="prep-notes" placeholder="今天需要特別注意的事項...">${currentPrepPlan._prepNotes||''}</textarea>
      </div>
    </div>
    <div style="height:80px"></div>
    <div class="floating-actions">
      <button class="btn-primary secondary" onclick="savePrepPlan('${studentId}')" style="flex:0.45">💾 儲存備課</button>
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
    // 嘗試從自動存檔恢復（重新整理或待機後返回）
    const draft = localStorage.getItem('session_draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        if (parsed.studentId === studentId) {
          currentSessionState = parsed;
          showToast('⚡ 已從自動存檔恢復進度');
        }
      } catch(e) {}
    }
  }

  if (!currentSessionState) {
    currentSessionState = {
      studentId,
      startTime: Date.now(),
      currentExIdx: 0,
      exercises: currentPrepPlan.map(ex => {
        const allSets = [];
        for (let i = 0; i < (parseInt(ex.sets) || 1); i++) {
          allSets.push({ reps: ex.reps, weight: ex.weight !== '-' ? ex.weight : '' });
        }
        (ex.subSets || []).forEach(ss => {
          for (let i = 0; i < (parseInt(ss.sets) || 1); i++) {
            allSets.push({ reps: ss.reps || ex.reps, weight: ss.weight || '' });
          }
        });
        return {
          ...ex,
          allSets,
          completedSets: new Array(allSets.length).fill(false),
          quality: '',
          notes: '',
          actualWeight: ex.weight !== '-' ? ex.weight : ''
        };
      }),
      conditions: [],
      overallNotes: ''
    };
  }

  const state = currentSessionState;
  const ex = state.exercises[state.currentExIdx];
  const catEmojis = { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢':'🦵','全身':'⚡' };
  const catIcons  = { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢':'lower','全身':'full' };
  const qualities = [
    { emoji:'😊', label:'優秀' }, { emoji:'🙂', label:'良好' },
    { emoji:'😐', label:'尚可' }, { emoji:'😓', label:'需改善' }
  ];
  const conditionOptions = ['😴 疲勞','🤕 疼痛','💪 狀態佳','🤒 身體不適','😰 壓力大','🌙 睡眠不足'];

  const uniqueSpecs = [...new Set(ex.allSets.map(s => `${s.weight?s.weight+'×':''}${s.reps}`))].join(' / ');

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
          <div style="display:flex;align-items:center;gap:8px">
            <div class="active-exercise-title">${ex.name}</div>
            <button onclick="showEditSessionExercise()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.72rem;padding:2px 7px;cursor:pointer;flex-shrink:0">✏️ 改</button>
          </div>
          <div class="active-exercise-target">目標: ${uniqueSpecs}</div>
        </div>
        <div class="exercise-icon ${catIcons[ex.category]||'full'}" style="width:48px;height:48px;font-size:1.4rem">${catEmojis[ex.category]||'💪'}</div>
      </div>
      ${ex.cues ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:16px;padding:8px 12px;background:var(--bg-card);border-radius:var(--radius-sm)">💡 ${ex.cues}</div>` : ''}
      <div class="sets-grid">
        ${ex.allSets.map((s, i) => `
          <div class="set-card ${ex.completedSets[i] ? 'completed' : ''}" onclick="toggleSet(${i})">
            <div class="set-number">第 ${i+1} 組</div>
            <div class="set-reps">${ex.completedSets[i] ? '✅' : s.reps}</div>
            ${s.weight ? `<div class="set-weight">${s.weight}</div>` : ''}
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
    ${state.currentExIdx < state.exercises.length - 1 ? `
    <div style="position:fixed;bottom:calc(var(--nav-height) + var(--safe-bottom) + 104px);right:14px;background:rgba(18,18,31,0.96);border:1px solid var(--border-light);border-radius:12px;padding:7px 12px;max-width:160px;backdrop-filter:blur(10px);z-index:20;box-shadow:var(--shadow)">
      <div style="font-size:0.6rem;color:var(--text-muted);letter-spacing:0.06em;margin-bottom:2px">NEXT ▶</div>
      <div style="font-size:0.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--accent)">${state.exercises[state.currentExIdx + 1].name}</div>
    </div>` : ''}
    <div style="height:80px"></div>
    <div class="exercise-nav">
      <button class="btn-primary secondary" onclick="showSessionAddExercise()" style="flex:0 0 44px;padding:0;font-size:1.3rem;display:flex;align-items:center;justify-content:center" title="臨時新增動作">＋</button>
      <button class="btn-primary secondary" onclick="prevExercise()" ${state.currentExIdx === 0 ? 'disabled style="opacity:0.3"' : ''}>← 上一個</button>
      ${state.currentExIdx < state.exercises.length - 1 ?
        `<button class="btn-primary accent" onclick="nextExercise()">下一個 →</button>` :
        `<button class="btn-primary accent" onclick="saveSession()" style="background:linear-gradient(135deg, #51cf66, #00b4d8)">💾 結束</button>`}
    </div>`;
}

// ── Prep helpers ──
function updatePrepExercise(idx, field, val) {
  if (!currentPrepPlan[idx]) return;
  currentPrepPlan[idx][field] = field === 'sets' ? (parseInt(val) || 1) : val;
}

function addSubSet(idx) {
  if (!currentPrepPlan[idx]) return;
  if (!currentPrepPlan[idx].subSets) currentPrepPlan[idx].subSets = [];
  const ex = currentPrepPlan[idx];
  currentPrepPlan[idx].subSets.push({ weight: '', reps: ex.reps, sets: parseInt(ex.sets) || 1 });
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
}

function removeSubSet(idx, subIdx) {
  currentPrepPlan[idx]?.subSets?.splice(subIdx, 1);
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
}

function updateSubSet(idx, subIdx, field, val) {
  if (!currentPrepPlan[idx]?.subSets?.[subIdx]) return;
  currentPrepPlan[idx].subSets[subIdx][field] = field === 'sets' ? (parseInt(val) || 1) : val;
}

function savePrepPlan(studentId) {
  const notes = document.getElementById('prep-notes')?.value || '';
  currentPrepPlan._prepNotes = notes;
  localStorage.setItem(`prep_${studentId}`, JSON.stringify({ exercises: currentPrepPlan.map(e => ({...e})), notes }));

  // 在今日排程項目上記錄備課時間戳
  const todayStr = getTodayStr();
  const schedule = DB.getSchedule();
  const item = schedule.find(s => s.studentId === studentId && s.date === todayStr);
  if (item) {
    const now = new Date();
    item.preppedAt = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    DB.saveScheduleItem(item);
  }

  showToast('✅ 備課已儲存');
}

function showSessionAddExercise() {
  const exercises = DB.getExercises();
  const catEmojis = { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢':'🦵','全身':'⚡' };
  const catIcons  = { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢':'lower','全身':'full' };
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">臨時新增動作</div></div>
    <div style="padding:0 16px 8px">
      <div class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="搜尋動作..." oninput="filterModalExercises(this.value)">
      </div>
    </div>
    <div style="padding:0 16px 24px;max-height:50vh;overflow-y:auto" id="modal-exercise-list">
      ${exercises.map(e => `
        <div class="exercise-lib-card" data-name="${e.name}" onclick="addLibExerciseToSession('${e.id}')">
          <div class="exercise-icon ${catIcons[e.category]||'full'}">${catEmojis[e.category]||'💪'}</div>
          <div class="exercise-lib-info">
            <div class="exercise-lib-name">${e.name}</div>
            <div class="exercise-lib-meta">${e.target} · ${e.defaultSets}×${e.defaultReps}</div>
          </div>
        </div>`).join('')}
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

function addLibExerciseToSession(exerciseId) {
  const ex = DB.getExercises().find(e => e.id === exerciseId);
  if (!ex || !currentSessionState) return;
  const allSets = Array.from({ length: ex.defaultSets }, () => ({ reps: ex.defaultReps, weight: '' }));
  const newEx = {
    exerciseId: ex.id, name: ex.name, category: ex.category,
    sets: ex.defaultSets, reps: ex.defaultReps, weight: '-', subSets: [],
    allSets, completedSets: new Array(allSets.length).fill(false),
    quality: '', notes: '', actualWeight: ''
  };
  // 插入當前動作的下一位，不是 push 到最後
  const insertAt = currentSessionState.currentExIdx + 1;
  currentSessionState.exercises.splice(insertAt, 0, newEx);
  closeModal();
  showToast(`✅ 已加入 ${ex.name}`);
  renderView('session', currentSessionState.studentId);
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

function renderAddExercise(exerciseId) {
  const ex = exerciseId ? DB.getExercises().find(e => e.id === exerciseId) : null;
  const cats = ['NKT評估','核心控制','上肢推','上肢拉','下肢','全身'];
  return `
    <div class="form-section fade-in">
      <div class="form-group">
        <label class="form-label">動作名稱 *</label>
        <input type="text" id="fe-name" value="${ex?.name || ''}" placeholder="例如：壺鈴擺盪">
      </div>
      <div class="form-group">
        <label class="form-label">分類</label>
        <select id="fe-category">
          ${cats.map(c => `<option value="${c}" ${ex?.category === c ? 'selected' : (c === '下肢' && !ex ? 'selected' : '')}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">目標肌群</label>
        <input type="text" id="fe-target" value="${ex?.target || ''}" placeholder="例如：臀大肌、核心">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">預設組數</label>
          <input type="number" id="fe-sets" value="${ex?.defaultSets ?? 3}" placeholder="3">
        </div>
        <div class="form-group">
          <label class="form-label">預設次數</label>
          <input type="text" id="fe-reps" value="${ex?.defaultReps ?? '10'}" placeholder="10">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">動作提示</label>
        <textarea id="fe-cues" placeholder="教練備忘提示">${ex?.cues || ''}</textarea>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn-primary secondary" onclick="goBack()" style="flex:0.4">取消</button>
      <button class="btn-primary accent" onclick="saveExerciseForm('${exerciseId || ''}')">${ex ? '💾 儲存' : '➕ 新增動作'}</button>
    </div>`;
}

// ── Prep drag-to-reorder ──
let _prepDragIdx = null;

window.prepDragStart = function(e, idx) {
  _prepDragIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => { const el = document.getElementById(`prep-ex-${idx}`); if (el) el.style.opacity = '0.35'; }, 0);
};

window.prepDragOver = function(e, idx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => el.style.borderTop = '');
  if (idx !== _prepDragIdx) {
    const el = document.getElementById(`prep-ex-${idx}`);
    if (el) el.style.borderTop = '2px solid var(--accent)';
  }
};

window.prepDragEnd = function(e) {
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => { el.style.borderTop = ''; el.style.opacity = ''; });
  _prepDragIdx = null;
};

window.prepDrop = function(e, targetIdx) {
  e.preventDefault();
  if (_prepDragIdx === null || _prepDragIdx === targetIdx) { _prepDragIdx = null; return; }
  const moved = currentPrepPlan.splice(_prepDragIdx, 1)[0];
  currentPrepPlan.splice(targetIdx, 0, moved);
  _prepDragIdx = null;
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => { el.style.borderTop = ''; el.style.opacity = ''; });
  const curr = navigationStack[navigationStack.length - 1];
  renderView(curr.view, curr.param);
};

// ── Touch drag for mobile ──
let _tdIdx = null;

function _initPrepTouchDrag() {
  document.querySelectorAll('.prep-drag-handle').forEach(handle => {
    handle.addEventListener('touchstart', e => {
      _tdIdx = parseInt(handle.dataset.idx);
      const el = document.getElementById(`prep-ex-${_tdIdx}`);
      if (el) el.style.opacity = '0.35';
      document.addEventListener('touchmove', _onPrepTouchMove, { passive: false });
      document.addEventListener('touchend', _onPrepTouchEnd, { once: true });
    }, { passive: true });
  });
}

function _onPrepTouchMove(e) {
  if (_tdIdx === null) return;
  e.preventDefault();
  const touch = e.touches[0];
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => el.style.borderTop = '');
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (touch.clientY >= rect.top && touch.clientY < rect.bottom) {
      const tIdx = parseInt(el.id.replace('prep-ex-', ''));
      if (!isNaN(tIdx) && tIdx !== _tdIdx) el.style.borderTop = '2px solid var(--accent)';
    }
  });
}

function _onPrepTouchEnd(e) {
  document.removeEventListener('touchmove', _onPrepTouchMove);
  if (_tdIdx === null) return;
  const touch = e.changedTouches[0];
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => { el.style.borderTop = ''; el.style.opacity = ''; });
  let targetIdx = null;
  document.querySelectorAll('[id^="prep-ex-"]').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (touch.clientY >= rect.top && touch.clientY < rect.bottom) {
      const tIdx = parseInt(el.id.replace('prep-ex-', ''));
      if (!isNaN(tIdx)) targetIdx = tIdx;
    }
  });
  if (targetIdx !== null && targetIdx !== _tdIdx) {
    const moved = currentPrepPlan.splice(_tdIdx, 1)[0];
    currentPrepPlan.splice(targetIdx, 0, moved);
    const curr = navigationStack[navigationStack.length - 1];
    renderView(curr.view, curr.param);
  }
  _tdIdx = null;
}

// ── Session exercise edit (per-set) ──
let _editSets = [];

function _renderEditSetsModal(exName) {
  const inputStyle = 'background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:7px 4px;color:var(--text-primary);font-size:0.85rem;text-align:center;width:100%;box-sizing:border-box';
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">✏️ ${exName}</div></div>
    <div style="padding:0 16px 8px">
      <div style="display:grid;grid-template-columns:36px 1fr 1fr;gap:6px;margin-bottom:6px">
        <div></div>
        <div style="font-size:0.68rem;color:var(--text-muted);text-align:center">重量</div>
        <div style="font-size:0.68rem;color:var(--text-muted);text-align:center">次數</div>
      </div>
      ${_editSets.map((s, i) => `
        <div style="display:grid;grid-template-columns:36px 1fr 1fr;gap:6px;margin-bottom:6px;align-items:center">
          <div style="font-size:0.72rem;color:var(--text-muted);text-align:center">第${i+1}組</div>
          <input type="text" value="${s.weight||''}" placeholder="kg" oninput="_editSets[${i}].weight=this.value" style="${inputStyle}">
          <input type="text" value="${s.reps||''}" placeholder="次" oninput="_editSets[${i}].reps=this.value" style="${inputStyle}">
        </div>`).join('')}
      <div style="display:flex;gap:8px;margin-top:10px">
        <button onclick="_addEditSet()" style="flex:1;background:none;border:1px dashed var(--border);border-radius:8px;color:var(--text-muted);padding:8px;cursor:pointer;font-size:0.8rem">＋ 新增一組</button>
        <button onclick="_removeLastEditSet()" style="flex:0 0 44px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--text-muted);padding:8px;cursor:pointer" ${_editSets.length <= 1 ? 'disabled style="opacity:0.3"' : ''}>－</button>
      </div>
    </div>
    <div style="padding:8px 16px 24px">
      <button class="btn-primary accent" onclick="applyEditSessionExercise()">✅ 套用</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
}

window.showEditSessionExercise = function() {
  if (!currentSessionState) return;
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _editSets = ex.allSets.map(s => ({ weight: s.weight || '', reps: s.reps || ex.reps || '10' }));
  _renderEditSetsModal(ex.name);
};

window._addEditSet = function() {
  const last = _editSets[_editSets.length - 1] || { weight: '', reps: '10' };
  _editSets.push({ weight: last.weight, reps: last.reps });
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _renderEditSetsModal(ex.name);
};

window._removeLastEditSet = function() {
  if (_editSets.length <= 1) return;
  _editSets.pop();
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _renderEditSetsModal(ex.name);
};

window.applyEditSessionExercise = function() {
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  ex.allSets = _editSets.map(s => ({ weight: s.weight, reps: s.reps || ex.reps }));
  ex.completedSets = new Array(ex.allSets.length).fill(false);
  ex.reps = ex.allSets[0]?.reps || ex.reps;
  ex.weight = ex.allSets[0]?.weight || '-';
  closeModal();
  renderView('session', currentSessionState.studentId);
};
