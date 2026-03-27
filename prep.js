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

  const recentSessions = sessions.slice(0, 3).reverse(); // Oldest to newest
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

  // 強化版 Prompt：要求 AI 模仿前三次課表邏輯並運用學員專屬動作庫
  const prompt = `你是一位跟隨這位教練多年的 AI 助教。
你的任務是：**學習這位教練在過去幾堂課的「排課邏輯、動作挑選習慣與漸進式超負荷規則」，並自動產出完美銜接的「下一堂課」課表。**

## 學員基本資料
- 姓名：${student.name}
- 訓練目標：${student.goals}
- 病史：${student.medicalHistory || '無'}
- NKT發現：${student.nktFindings || '無'}
- 目前階段：${student.currentPhase}

## 過去上課紀錄 (由舊到新排列，請分析動作連貫性及重量成長)
${historyText}

## 動作庫參考 (請優先從以下清單挑選，維持教練的命名習慣)
${libText}

## 你的任務
請輸出下一堂課的完整課表（包含暖身、矯正、主訓練），要求：
1. 嚴格模仿教練在「過去紀錄」裡展現的課程結構與動作偏好。
2. 若「下堂建議」中有提到加重或更換動作，請務必落實。
3. 針對表現「優秀」的肌力動作，請自動計算並增加一點重量或次數。
4. 【極度重要】不准加任何解說文字，不要 markdown 格式，只准回覆以下格式的 JSON 陣列：

[
  {
    "name": "動作名稱",
    "category": "暖身|NKT檢測|矯正動作|肌力訓練",
    "target": "目標",
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
    
    // Replace current plan with Gemini's plan
    currentPrepPlan = exercises.map(ex => ({
      exerciseId: 'AI-' + Math.random().toString(36).substr(2, 6),
      name: ex.name,
      category: ex.category,
      target: ex.target || '',
      sets: ex.sets || 3,
      reps: String(ex.reps || '10'),
      weight: ex.weight || '-',
      cues: ex.cues || '',
      isAiGenerated: true
    }));
    currentPrepPlan.studentId = studentId;
    
    // Re-render prep view
    navigationStack.pop();
    navigate('prep', studentId);
    showToast('✅ AI 課表已產生！');
    
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
  showToast('✅ AI 設定已儲存');
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
      ${currentPrepPlan.map((ex, idx) => `
        <div style="padding:8px 4px;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
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
        </div>
      `).join('')}
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
          <div class="active-exercise-title">${ex.name}</div>
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
  currentSessionState.exercises.push({
    exerciseId: ex.id, name: ex.name, category: ex.category,
    sets: ex.defaultSets, reps: ex.defaultReps, weight: '-', subSets: [],
    allSets, completedSets: new Array(allSets.length).fill(false),
    quality: '', notes: '', actualWeight: ''
  });
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
          <option value="NKT評估">NKT評估</option>
          <option value="核心控制">核心控制</option>
          <option value="上肢推">上肢推</option>
          <option value="上肢拉">上肢拉</option>
          <option value="下肢" selected>下肢</option>
          <option value="全身">全身</option>
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
