// ============================================
// Lesson Prep & In-Session Views
// ============================================

// State for current prep/session
let currentPrepPlan = [];
let currentSessionState = null;
let geminiLoading = false;
let historyPanelCollapsed = false;
const MAX_UNIQUE_CARRYOVER_EXERCISES = 2;
const EVALUATION_SUMMARY_SESSION_LIMIT = 3;
const PUSH_UP_BAR_SEQUENCE = ['槓6', '槓4', '槓3', '槓0', '槓KB'];
const DECISION_TAG_OPTIONS = [
  { id: 'keep', label: '保留/維持', aliases: ['保留', '維持', '保持', '留著', 'keep'], cue: '依手寫標籤保留，不硬換動作' },
  { id: 'advance', label: '進階', aliases: ['進階', '升級', '加強', '可加強', '可進階'], cue: '依手寫標籤小幅進階' },
  { id: 'regress', label: '退階/降階', aliases: ['退階', '降階', '降級', '簡化', '退一階'], cue: '依手寫標籤退階或簡化' },
  { id: 'replace', label: '替換', aliases: ['替換', '換動作', '改動作', '換掉'], cue: '依手寫標籤替換同類型動作' },
  { id: 'pause', label: '暫停/不要排', aliases: ['暫停', '不要排', '先不要', '本次不排', '取消'], cue: '依手寫標籤暫停，這次不要排入' },
  { id: 'makeup', label: '補做', aliases: ['補做', '下次補', '下堂補', '補回來', '未完成補'], cue: '依手寫標籤排入補做' },
  { id: 'lessLoad', label: '減量', aliases: ['減量', '降重量', '重量下降', '輕一點', '減重'], cue: '依手寫標籤降低負重' },
  { id: 'moreLoad', label: '加量', aliases: ['加量', '加重', '重量上升', '加重量'], cue: '依手寫標籤增加負重' },
  { id: 'lessVolume', label: '減組', aliases: ['減組', '少一組', '減少組數'], cue: '依手寫標籤減少組數' },
  { id: 'moreVolume', label: '加組', aliases: ['加組', '多一組', '增加組數'], cue: '依手寫標籤增加組數' },
  { id: 'control', label: '控制/穩定', aliases: ['控制', '穩定', '節奏', 'tempo', '停頓', '放慢'], cue: '依手寫標籤優先控制、穩定與節奏' },
  { id: 'shortRom', label: '縮小 ROM', aliases: ['縮rom', '縮小rom', '半程', '小幅度', '縮短幅度'], cue: '依手寫標籤縮小 ROM，先守住品質' },
  { id: 'fullRom', label: '增加 ROM', aliases: ['加rom', '增加rom', '全rom', '全幅度', '加深'], cue: '依手寫標籤增加 ROM 或幅度' },
  { id: 'activate', label: '喚醒', aliases: ['喚醒', '啟動', 'activation', 'activate'], cue: '依手寫標籤安排喚醒或整合' },
  { id: 'compTable', label: '代償表', aliases: ['代償表', '查代償', '看代償', '代償檢查'], cue: '依手寫標籤先看代償表再安排' },
  { id: 'pain', label: '疼痛/局部不適', aliases: ['疼痛', '痛感', '會痛', '不舒服', '膝不適', '肩不適', '腰不適', '髖不適', '手腕不適'], cue: '依手寫標籤避開疼痛並降階' },
  { id: 'timeShort', label: '時間不足', aliases: ['時間不足', '做不完', '來不及', '時間不夠'], cue: '依手寫標籤提早安排或縮短課表' },
  { id: 'condition', label: '狀態不適', aliases: ['狀態不適', '狀況不適合', '當天不適合', '身體不適', '狀態不好'], cue: '依手寫標籤視為當日狀態問題，不直接視為動作品質差' }
];

// Shared planning helpers: keep multi-weight session records intact when reusing history.
function isDbOrMachineExercise(name) {
  const n = (name || '').toLowerCase();
  return n.includes('db') || n.includes('dumbbell') || n.includes('啞鈴')
    || n.includes('machine') || n.includes('機械');
}

function isNeedsWorkQuality(quality) {
  return quality === '待加強' || quality === '需改善';
}

function isGoodQuality(quality) {
  return quality === '優良' || quality === '優秀' || quality === '良好';
}

function progressExerciseWeight(weight, name, quality) {
  let newWeight = weight || '';
  if (newWeight && isPushUpBarExercise(`${name || ''} ${newWeight}`)) {
    return progressPushUpBarText(newWeight, quality);
  }
  if (isGoodQuality(quality) && newWeight && newWeight !== '-') {
    const increment = isDbOrMachineExercise(name) ? 2.5 : 5;
    const numMatch = newWeight.match(/(\d+\.?\d*)/);
    if (numMatch) {
      const newVal = parseFloat(numMatch[1]) + increment;
      const display = newVal % 1 === 0 ? String(newVal) : newVal.toFixed(1);
      newWeight = newWeight.replace(numMatch[1], display);
    }
  }
  return newWeight;
}

function isPushUpBarExercise(name) {
  const text = String(name || '').toLowerCase();
  return text.includes('push up') || text.includes('push-up') || text.includes('伏地挺身') || text.includes('扶槓') || /槓\s*(kb|\d+)/i.test(text);
}

function normalizePushUpBarToken(rawBar) {
  const value = String(rawBar || '').trim().toUpperCase();
  if (value === 'KB') return '槓KB';
  const bar = parseInt(value, 10);
  if (!Number.isFinite(bar)) return `槓${rawBar}`;
  if (bar === 6 || bar === 4 || bar === 3 || bar === 0) return `槓${bar}`;
  if (bar >= 5) return '槓6';
  return '槓0';
}

function normalizePushUpBarText(text) {
  return String(text || '').replace(/槓\s*(KB|\d+)/gi, (match, rawBar) => normalizePushUpBarToken(rawBar));
}

function normalizePushUpBarName(name) {
  if (!isPushUpBarExercise(name)) return name;
  return normalizePushUpBarText(name);
}

function progressPushUpBarText(text, quality) {
  const normalized = normalizePushUpBarText(text);
  if (!isGoodQuality(quality)) return normalized;
  return normalized.replace(/槓\s*(KB|\d+)/i, (match, rawBar) => {
    const token = normalizePushUpBarToken(rawBar);
    const idx = PUSH_UP_BAR_SEQUENCE.indexOf(token);
    if (idx < 0 || idx >= PUSH_UP_BAR_SEQUENCE.length - 1) return token;
    return PUSH_UP_BAR_SEQUENCE[idx + 1];
  });
}

function regressPushUpBarText(text) {
  const normalized = normalizePushUpBarText(text);
  return normalized.replace(/槓\s*(KB|\d+)/i, (match, rawBar) => {
    const token = normalizePushUpBarToken(rawBar);
    const idx = PUSH_UP_BAR_SEQUENCE.indexOf(token);
    if (idx <= 0) return token;
    return PUSH_UP_BAR_SEQUENCE[idx - 1];
  });
}

function progressPushUpBarName(name, quality) {
  const normalized = normalizePushUpBarName(name);
  if (!isPushUpBarExercise(normalized)) return normalized;
  return progressPushUpBarText(normalized, quality);
}

function regressPushUpBarName(name) {
  const normalized = normalizePushUpBarName(name);
  if (!isPushUpBarExercise(normalized)) return normalized;
  return regressPushUpBarText(normalized);
}

function regressExerciseWeight(weight, name) {
  let newWeight = weight || '';
  if (newWeight && isPushUpBarExercise(`${name || ''} ${newWeight}`)) {
    return regressPushUpBarText(newWeight);
  }
  if (newWeight && newWeight !== '-') {
    const increment = isDbOrMachineExercise(name) ? 2.5 : 5;
    const numMatch = newWeight.match(/(\d+\.?\d*)/);
    if (numMatch) {
      const newVal = Math.max(0, parseFloat(numMatch[1]) - increment);
      const display = newVal % 1 === 0 ? String(newVal) : newVal.toFixed(1);
      newWeight = newWeight.replace(numMatch[1], display);
    }
  }
  return newWeight;
}

function getExerciseGroupsForPlanning(ex) {
  if (typeof getSessionExerciseGroups === 'function') {
    const groups = getSessionExerciseGroups(ex).filter(g => g.count > 0);
    if (groups.length) return groups;
  }
  const weight = ex.weight && ex.weight !== '-' ? ex.weight : '';
  return [{ weight, reps: ex.reps || '10', count: parseInt(ex.sets) || 1 }];
}

function buildPrepExerciseFromSession(ex, options = {}) {
  const groups = getExerciseGroupsForPlanning(ex).map(g => ({
    weight: options.progress ? progressExerciseWeight(g.weight, ex.name, ex.quality) : g.weight,
    reps: g.reps || ex.reps || '10',
    count: parseInt(g.count) || 1
  }));
  const primary = groups[0] || { weight: '', reps: ex.reps || '10', count: parseInt(ex.sets) || 1 };
  const name = normalizePushUpBarName(options.name || ex.name);
  const cues = options.cues || '';
  const planningReason = options.reason || cues;

  return {
    exerciseId: ex.exerciseId || ex.id,
    name,
    category: ex.category || '',
    target: ex.target || '',
    sets: primary.count,
    reps: primary.reps,
    weight: primary.weight || '-',
    cues,
    planningReason,
    subSets: groups.slice(1).map(g => ({
      weight: g.weight || '',
      reps: g.reps,
      sets: g.count
    }))
  };
}

function formatExerciseGroupsForPrompt(ex) {
  return getExerciseGroupsForPlanning(ex)
    .map(g => `${g.weight ? g.weight + '×' : ''}${g.reps}×${g.count}組`)
    .join(' / ');
}

function normalizeExerciseName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getPlanningPrefs(student) {
  const prefs = student?.planningPrefs || {};
  return {
    prefer: prefs.prefer || {},
    avoid: prefs.avoid || {},
    tuning: prefs.tuning || {},
    updatedAt: prefs.updatedAt || null
  };
}

function preferenceDelta(name, prefs) {
  const key = normalizeExerciseName(name);
  return (prefs.prefer[key] || 0) - (prefs.avoid[key] || 0);
}

function exercisePreferenceScore(ex, prefs) {
  const delta = preferenceDelta(ex.name, prefs);
  if (delta === 0) return 0;
  return delta > 0 ? Math.min(delta, 4) : Math.max(delta, -4);
}

function findPreferredReplacement(ex, plan, exerciseLib, prefs) {
  const used = new Set(plan.map(item => normalizeExerciseName(item.name)));
  return exerciseLib
    .filter(item => item.category === ex.category && !used.has(normalizeExerciseName(item.name)))
    .map(item => ({ item, score: exercisePreferenceScore(item, prefs) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.item || null;
}

function applyPlanningPreferences(plan, student, exerciseLib) {
  const prefs = getPlanningPrefs(student);
  const adjusted = plan.map(ex => ({ ...ex, subSets: ex.subSets ? ex.subSets.map(ss => ({ ...ss })) : [] }));

  adjusted.forEach((ex, idx) => {
    const key = normalizeExerciseName(ex.name);
    const tuning = prefs.tuning[key];
    if (tuning) {
      if (tuning.sets !== undefined) ex.sets = tuning.sets;
      if (tuning.reps !== undefined) ex.reps = tuning.reps;
      if (tuning.cues !== undefined && tuning.cues) ex.cues = tuning.cues;
      if (Array.isArray(tuning.subSets)) ex.subSets = tuning.subSets.map(ss => ({ ...ss }));
    }

    const score = exercisePreferenceScore(ex, prefs);
    if (score <= -2) {
      const replacement = findPreferredReplacement(ex, adjusted, exerciseLib, prefs);
      if (replacement) {
        adjusted[idx] = {
          exerciseId: replacement.id,
          name: replacement.name,
          category: replacement.category,
          target: replacement.target || '',
          sets: ex.sets || replacement.defaultSets || 4,
          reps: ex.reps || replacement.defaultReps || '10',
          weight: ex.weight || '',
          cues: '依過去編修偏好替換',
          planningReason: '依過去編修偏好替換',
          subSets: ex.subSets || []
        };
      } else {
        ex.cues = ex.cues ? `${ex.cues}；過去常被刪除，請確認是否保留` : '過去常被刪除，請確認是否保留';
      }
    } else if (score >= 2 && !ex.cues) {
      ex.cues = '過去常保留/新增';
    }
  });

  return adjusted;
}

function snapshotPrepExercise(ex) {
  return {
    sets: parseInt(ex.sets) || 1,
    reps: String(ex.reps || ''),
    cues: String(ex.cues || ''),
    subSets: (ex.subSets || []).map(ss => ({
      sets: parseInt(ss.sets) || 1,
      reps: String(ss.reps || ''),
      weight: String(ss.weight || '')
    }))
  };
}

function prepSnapshotChanged(a, b) {
  return JSON.stringify(a || {}) !== JSON.stringify(b || {});
}

function setPrepBaseline(plan) {
  if (!plan) return plan;
  plan._baselineNames = plan.filter(ex => !ex.isFreeStyle).map(ex => ex.name);
  plan._baselineItems = {};
  plan.filter(ex => !ex.isFreeStyle).forEach(ex => {
    plan._baselineItems[normalizeExerciseName(ex.name)] = snapshotPrepExercise(ex);
  });
  return plan;
}

function cleanCompensationPart(text) {
  return String(text || '')
    .replace(/^[\s:：,，;；、]+|[\s:：,，;；、]+$/g, '')
    .replace(/^(者|代償者|被抑制者|抑制者)\s*[:：]?\s*/g, '')
    .trim();
}

function cleanCompensatorPart(text) {
  const cleaned = cleanCompensationPart(text);
  const segments = cleaned.split(/[:：]/).map(part => part.trim()).filter(Boolean);
  return segments.length ? cleanCompensationPart(segments[segments.length - 1]) : cleaned;
}

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function compensationFindingKey(finding) {
  const compensator = cleanCompensationPart(finding?.compensator).replace(/\s+/g, '');
  const inhibited = cleanCompensationPart(finding?.inhibited).replace(/\s+/g, '');
  return `${compensator}->${inhibited}`.toLowerCase();
}

function isCompensationResolved(ex, key) {
  return Array.isArray(ex?.resolvedCompensations) && ex.resolvedCompensations.includes(key);
}

function removeResolvedCompensationCues(finding) {
  if (!finding || !Array.isArray(currentPrepPlan)) return;
  const staleCues = [
    `${finding.inhibited}曾被抑制，優先喚醒並確認發力`,
    `${finding.compensator}曾代償，留意不要搶工作`
  ];
  currentPrepPlan.forEach(ex => {
    if (!ex.cues) return;
    const cues = String(ex.cues).split('；').map(c => c.trim()).filter(Boolean);
    ex.cues = cues.filter(cue => !staleCues.includes(cue)).join('；');
  });
}

function parseCompensationNotes(notes) {
  const text = String(notes || '');
  const findings = [];
  const clauses = text.split(/[\n,，;；。]+/).map(part => part.trim()).filter(Boolean);

  clauses.forEach(clause => {
    const parts = clause.split(/\s*代償\s*/);
    for (let i = 0; i < parts.length - 1; i++) {
      const compensator = cleanCompensatorPart(parts[i]);
      const inhibited = cleanCompensationPart(parts[i + 1]);
      if (compensator && inhibited) {
        const finding = { compensator, inhibited, rawText: clause };
        findings.push({ ...finding, key: compensationFindingKey(finding) });
      }
    }
  });
  return findings;
}

function collectCompensationFindings(sessions, limit = 5, options = {}) {
  const rows = [];
  sessions.slice(0, limit).forEach(session => {
    (session.exercises || []).forEach((ex, exerciseIndex) => {
      parseCompensationNotes(ex.notes).forEach(finding => {
        const resolved = isCompensationResolved(ex, finding.key);
        if (resolved && !options.includeResolved) return;
        rows.push({
          ...finding,
          resolved,
          sessionId: session.id || '',
          exerciseIndex,
          date: session.date || '',
          exerciseName: ex.name || ''
        });
      });
    });
  });
  return rows;
}

function formatCompensationFindings(findings) {
  if (!findings || !findings.length) return '無明確代償紀錄';
  return findings.slice(0, 8)
    .map(f => `- ${f.date || '未註明日期'}｜${f.exerciseName || '未註明動作'}：${f.rawText || `${f.compensator} 代償 ${f.inhibited}`}`)
    .join('\n');
}

function appendCue(ex, cue) {
  if (!cue) return ex;
  if (ex.cues && ex.cues.includes(cue)) return ex;
  ex.cues = ex.cues ? `${ex.cues}；${cue}` : cue;
  if (!ex.planningReason) ex.planningReason = cue;
  return ex;
}

function muscleMentioned(ex, muscle) {
  const haystack = `${ex.name || ''} ${ex.target || ''} ${ex.cues || ''}`.toLowerCase();
  const needle = String(muscle || '').toLowerCase().replace(/\s+/g, '');
  if (!needle) return false;
  return haystack.replace(/\s+/g, '').includes(needle);
}

function applyCompensationFindings(plan, findings) {
  if (!findings || !findings.length) return plan;
  return plan.map(ex => {
    const next = { ...ex, subSets: ex.subSets ? ex.subSets.map(ss => ({ ...ss })) : [] };
    findings.slice(0, 8).forEach(f => {
      if (muscleMentioned(next, f.inhibited)) {
        appendCue(next, `${f.inhibited}曾被抑制，優先喚醒並確認發力`);
      }
      if (muscleMentioned(next, f.compensator)) {
        appendCue(next, `${f.compensator}曾代償，留意不要搶工作`);
      }
    });
    return next;
  });
}

function qualityBucket(quality) {
  if (isGoodQuality(quality)) return 'good';
  if (quality === '尚可') return 'ok';
  if (isNeedsWorkQuality(quality)) return 'needsWork';
  return '';
}

function hasTimeOutNote(notes) {
  return String(notes || '').toLowerCase().includes('time out');
}

function parseDecisionTags(notes) {
  const text = String(notes || '').toLowerCase();
  const tags = [];
  DECISION_TAG_OPTIONS.forEach(option => {
    if (option.aliases.some(alias => text.includes(String(alias).toLowerCase()))) {
      tags.push(option.id);
    }
  });
  if (hasTimeOutNote(notes)) tags.push('timeout');
  return [...new Set(tags)];
}

function decisionTagOption(id) {
  return DECISION_TAG_OPTIONS.find(option => option.id === id);
}

function decisionTagLabels(tags) {
  return (tags || [])
    .filter(id => id !== 'timeout')
    .map(id => decisionTagOption(id)?.label || id);
}

function hasAnyDecisionTag(tags, ids) {
  const set = new Set(tags || []);
  return ids.some(id => set.has(id));
}

function formatDecisionTagOptionsForPrompt() {
  return DECISION_TAG_OPTIONS
    .map(option => `- ${option.label}：可寫「${option.aliases.slice(0, 4).join(' / ')}」；排課意思：${option.cue}`)
    .join('\n');
}

function shouldProgressFromQualityAndTags(quality, tags) {
  if (hasAnyDecisionTag(tags, ['advance', 'moreLoad', 'pause', 'replace', 'keep', 'regress', 'lessLoad', 'pain', 'condition', 'control', 'shortRom'])) return false;
  return isGoodQuality(quality);
}

function shouldCarryForwardTimeOut(notes) {
  const tags = parseDecisionTags(notes);
  if (hasAnyDecisionTag(tags, ['makeup', 'timeShort'])) return true;
  if (!hasTimeOutNote(notes)) return false;
  if (hasAnyDecisionTag(tags, ['pause', 'condition', 'replace', 'regress', 'pain'])) return false;
  return true;
}

function trimNoteForSummary(notes) {
  return String(notes || '').replace(/\s+/g, ' ').trim();
}

function collectExerciseEvaluationSummary(sessions, limit = EVALUATION_SUMMARY_SESSION_LIMIT) {
  const byName = new Map();
  sessions.slice(0, limit).forEach((session, sessionIdx) => {
    (session.exercises || []).forEach(ex => {
      const key = normalizeExerciseName(ex.name);
      if (!key) return;
      if (!byName.has(key)) {
        byName.set(key, {
          key,
          name: ex.name,
          category: ex.category || '',
          target: ex.target || '',
          count: 0,
          good: 0,
          ok: 0,
          needsWork: 0,
          timeout: 0,
          latestDate: session.date || '',
          latestQuality: ex.quality || '',
          latestNotes: ex.notes || '',
          latestDecisionTags: [],
          decisionTags: {},
          history: []
        });
      }
      const row = byName.get(key);
      const tags = parseDecisionTags(ex.notes);
      row.count++;
      if (ex.category && !row.category) row.category = ex.category;
      if (ex.target && !row.target) row.target = ex.target;
      if (sessionIdx === 0) {
        row.latestDate = session.date || '';
        row.latestQuality = ex.quality || '';
        row.latestNotes = ex.notes || '';
        row.latestDecisionTags = tags;
      }
      const bucket = qualityBucket(ex.quality);
      if (bucket === 'good') row.good++;
      else if (bucket === 'ok') row.ok++;
      else if (bucket === 'needsWork') row.needsWork++;
      if (hasTimeOutNote(ex.notes)) row.timeout++;
      tags.forEach(tag => {
        if (tag === 'timeout') return;
        row.decisionTags[tag] = (row.decisionTags[tag] || 0) + 1;
      });
      row.history.push({
        date: session.date || '',
        quality: ex.quality || '',
        notes: trimNoteForSummary(ex.notes),
        tags
      });
    });
  });

  return Array.from(byName.values())
    .map(row => ({
      ...row,
      signalScore: (row.needsWork * 3) + (row.timeout * 2.5) + (row.good * 1.2) + (row.ok * 0.6) + (row.count * 0.2)
    }))
    .sort((a, b) => b.signalScore - a.signalScore);
}

function evaluationCue(row) {
  if (!row) return '';
  const latestTags = row.latestDecisionTags || [];
  if (hasAnyDecisionTag(latestTags, ['pause'])) return '手寫標籤暫停/不要排，這次先移出課表';
  if (hasAnyDecisionTag(latestTags, ['replace'])) return '手寫標籤替換，優先換同類型動作';
  if (hasAnyDecisionTag(latestTags, ['regress', 'lessLoad', 'pain'])) return '手寫標籤退階/減量/疼痛，優先降階並保留品質';
  if (hasAnyDecisionTag(latestTags, ['condition'])) return '手寫標籤狀態不適，視為當日狀態問題，不直接追重量';
  if (hasAnyDecisionTag(latestTags, ['makeup', 'timeShort'])) return '手寫標籤補做/時間不足，下一份課表排入或提早安排';
  if (row.timeout) return '最近曾 time out，若是時間不足請補做；若是狀態不適請用決策標籤處理';
  if (row.needsWork >= 2) return '近期待改善重複出現，優先降階、簡化或替換';
  if (row.needsWork) return '近期評價需改善，保留品質空間並避免硬加強度';
  if (row.good >= 2) return '近期表現優良，可小幅進階或加入變化';
  if (row.ok >= 2) return '近期多為尚可，先穩定動作品質';
  return '';
}

function formatExerciseEvaluationSummary(rows) {
  if (!rows || !rows.length) return '無足夠動作評價紀錄';
  return rows.slice(0, 12).map(row => {
    const latest = row.latestQuality ? `最新:${row.latestQuality}` : '最新:未評';
    const counts = `😀 優良${row.good} / 😐 尚可${row.ok} / 😢 需改善${row.needsWork}`;
    const cue = evaluationCue(row);
    const tagText = decisionTagLabels(row.latestDecisionTags).join('、');
    const notes = row.history
      .filter(item => item.notes)
      .slice(0, 3)
      .map(item => `${item.date || '未註明'}:${item.notes}`)
      .join('；');
    const timeoutText = row.timeout ? `｜time out ${row.timeout}次（原因看手寫決策標籤；無標籤時需保守確認）` : '';
    return `- ${row.name}${row.category ? `（${row.category}）` : ''}｜近${row.count}次｜${latest}｜${counts}${tagText ? `｜標籤:${tagText}` : ''}${timeoutText}${notes ? `｜手寫評語:${notes}` : ''}${cue ? `｜決策:${cue}` : ''}`;
  }).join('\n');
}

function applyExerciseEvaluationCues(plan, evaluationRows) {
  if (!evaluationRows || !evaluationRows.length) return plan;
  const byKey = new Map(evaluationRows.map(row => [row.key, row]));
  return plan.map(ex => {
    const next = { ...ex, subSets: ex.subSets ? ex.subSets.map(ss => ({ ...ss })) : [] };
    const cue = evaluationCue(byKey.get(normalizeExerciseName(next.name)));
    if (cue) appendCue(next, cue);
    return next;
  });
}

function clonePrepExercise(ex) {
  return { ...ex, subSets: ex.subSets ? ex.subSets.map(ss => ({ ...ss })) : [] };
}

function adjustPrepExerciseLoad(ex, direction) {
  const next = clonePrepExercise(ex);
  if (direction === 'down') {
    next.name = regressPushUpBarName(next.name);
    next.weight = regressExerciseWeight(next.weight, next.name) || next.weight;
    next.subSets = next.subSets.map(ss => ({ ...ss, weight: regressExerciseWeight(ss.weight, next.name) || ss.weight }));
  } else if (direction === 'up') {
    next.name = progressPushUpBarName(next.name, '優良');
    next.weight = progressExerciseWeight(next.weight, next.name, '優良') || next.weight;
    next.subSets = next.subSets.map(ss => ({ ...ss, weight: progressExerciseWeight(ss.weight, next.name, '優良') || ss.weight }));
  }
  return next;
}

function adjustPrepExerciseVolume(ex, delta) {
  const next = clonePrepExercise(ex);
  next.sets = Math.max(1, (parseInt(next.sets, 10) || 1) + delta);
  next.subSets = next.subSets.map(ss => ({ ...ss, sets: Math.max(1, (parseInt(ss.sets, 10) || 1) + delta) }));
  return next;
}

function findDecisionReplacement(ex, plan, exerciseLib) {
  const used = new Set(plan.map(item => normalizeExerciseName(item.name)));
  const currentKey = normalizeExerciseName(ex.name);
  return exerciseLib.find(item =>
    item.category === ex.category
    && normalizeExerciseName(item.name) !== currentKey
    && !used.has(normalizeExerciseName(item.name))
  ) || null;
}

function applyDecisionTagRules(plan, evaluationRows, exerciseLib) {
  if (!evaluationRows || !evaluationRows.length) return plan;
  const byKey = new Map(evaluationRows.map(row => [row.key, row]));
  const result = [];
  plan.forEach(ex => {
    const row = byKey.get(normalizeExerciseName(ex.name));
    const tags = row?.latestDecisionTags || [];
    let next = clonePrepExercise(ex);
    if (hasAnyDecisionTag(tags, ['pause'])) return;
    if (hasAnyDecisionTag(tags, ['replace'])) {
      const replacement = findDecisionReplacement(next, [...result, ...plan], exerciseLib);
      if (replacement) {
        next = {
          exerciseId: replacement.id,
          name: replacement.name,
          category: replacement.category,
          target: replacement.target || '',
          sets: next.sets || replacement.defaultSets || 3,
          reps: next.reps || replacement.defaultReps || '10',
          weight: next.weight || '',
          cues: '依手寫標籤替換同類型動作',
          planningReason: '依手寫標籤替換同類型動作',
          subSets: next.subSets || []
        };
      } else {
        appendCue(next, '手寫標籤要求替換，但動作庫暫無同類型替代，請人工確認');
      }
    }
    if (hasAnyDecisionTag(tags, ['regress', 'lessLoad', 'pain'])) next = adjustPrepExerciseLoad(next, 'down');
    if (hasAnyDecisionTag(tags, ['advance', 'moreLoad'])) next = adjustPrepExerciseLoad(next, 'up');
    if (hasAnyDecisionTag(tags, ['lessVolume'])) next = adjustPrepExerciseVolume(next, -1);
    if (hasAnyDecisionTag(tags, ['moreVolume'])) next = adjustPrepExerciseVolume(next, 1);
    tags.forEach(tag => {
      if (tag === 'timeout') return;
      const option = decisionTagOption(tag);
      if (option) appendCue(next, option.cue);
    });
    result.push(next);
  });
  return result;
}

function applyPushUpBarRules(plan) {
  return plan.map(ex => ({
    ...ex,
    name: normalizePushUpBarName(ex.name),
    subSets: ex.subSets ? ex.subSets.map(ss => ({ ...ss })) : []
  }));
}

function carryForwardTimeoutExercises(plan, previousSession, exerciseLib) {
  if (!previousSession) return plan;
  const used = new Set(plan.map(ex => normalizeExerciseName(ex.name)));
  const nextPlan = [...plan];
  (previousSession.exercises || []).forEach(raw => {
    const tags = parseDecisionTags(raw.notes);
    if (!shouldCarryForwardTimeOut(raw.notes)) return;
    const key = normalizeExerciseName(raw.name);
    if (!key || used.has(key)) {
      const existing = nextPlan.find(ex => normalizeExerciseName(ex.name) === key);
      if (existing) {
        const cue = hasAnyDecisionTag(tags, ['makeup', 'timeShort'])
          ? '上次標記補做/時間不足，這次提早安排或保留完成空間'
          : '上次 time out 未標原因，若非時間不足請用狀態不適/暫停/退階/替換標籤修正';
        appendCue(existing, cue);
      }
      return;
    }
    const lib = exerciseLib.find(item => item.id === raw.exerciseId || item.name === raw.name);
    const ex = {
      ...raw,
      category: raw.category || lib?.category || '',
      target: raw.target || lib?.target || '',
      cues: raw.cues || lib?.cues || ''
    };
    nextPlan.push(buildPrepExerciseFromSession(ex, {
      progress: false,
      cues: hasAnyDecisionTag(tags, ['makeup', 'timeShort'])
        ? '上次標記補做/時間不足，這次排入補做或提早安排'
        : '上次 time out 未標原因，保守排入並請確認是否為時間不足'
    }));
    used.add(key);
  });
  return nextPlan;
}

function compactGeneratedPlan(plan) {
  const seen = new Set();
  return plan.filter(ex => {
    const key = normalizeExerciseName(ex.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function finalizeGeneratedPlan(plan, student, exerciseLib, compensationFindings, evaluationRows = []) {
  return setPrepBaseline(compactGeneratedPlan(
    applyCompensationFindings(
      applyExerciseEvaluationCues(
        applyDecisionTagRules(
          applyPlanningPreferences(applyPushUpBarRules(plan), student, exerciseLib),
          evaluationRows,
          exerciseLib
        ),
        evaluationRows
      ),
      compensationFindings
    )
  ));
}

window.resolveCompensationFindingFromButton = function(btn) {
  const sessionId = btn?.dataset?.sessionId;
  const exerciseIndex = parseInt(btn?.dataset?.exerciseIndex, 10);
  const key = btn?.dataset?.findingKey;
  if (!sessionId || Number.isNaN(exerciseIndex) || !key) return;

  const session = DB.getSession(sessionId);
  const ex = session?.exercises?.[exerciseIndex];
  if (!session || !ex) {
    showToast('找不到原始代償紀錄');
    return;
  }

  if (!Array.isArray(ex.resolvedCompensations)) ex.resolvedCompensations = [];
  if (!ex.resolvedCompensations.includes(key)) ex.resolvedCompensations.push(key);
  const finding = parseCompensationNotes(ex.notes).find(item => item.key === key);
  removeResolvedCompensationCues(finding);
  DB.saveSession(session);
  showToast('✅ 已標記代償處理完畢');
  rerenderCurrentViewPreserveScroll();
};

function learnPlanningPreferences(studentId) {
  const student = DB.getStudent(studentId);
  if (!student || !currentPrepPlan?._baselineNames) return { added: 0, removed: 0 };

  const baseline = new Set(currentPrepPlan._baselineNames.map(normalizeExerciseName));
  const finalNames = currentPrepPlan.filter(ex => !ex.isFreeStyle).map(ex => ex.name);
  const finalSet = new Set(finalNames.map(normalizeExerciseName));
  const prefs = getPlanningPrefs(student);
  let added = 0;
  let removed = 0;
  let tuned = 0;

  finalNames.forEach(name => {
    const key = normalizeExerciseName(name);
    if (!baseline.has(key)) {
      prefs.prefer[key] = (prefs.prefer[key] || 0) + 1;
      added++;
    }
  });

  currentPrepPlan.filter(ex => !ex.isFreeStyle).forEach(ex => {
    const key = normalizeExerciseName(ex.name);
    const baseline = currentPrepPlan._baselineItems?.[key];
    if (!baseline) return;
    const snapshot = snapshotPrepExercise(ex);
    if (prepSnapshotChanged(snapshot, baseline)) {
      prefs.tuning[key] = { ...snapshot, updatedAt: Date.now() };
      tuned++;
    }
  });

  currentPrepPlan._baselineNames.forEach(name => {
    const key = normalizeExerciseName(name);
    if (!finalSet.has(key)) {
      prefs.avoid[key] = (prefs.avoid[key] || 0) + 1;
      removed++;
    }
  });

  if (added || removed || tuned) {
    const updated = { ...student, planningPrefs: { ...prefs, updatedAt: Date.now() } };
    DB.saveStudent(updated);
    setPrepBaseline(currentPrepPlan);
  }

  return { added, removed, tuned };
}

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
  const compensationFindings = collectCompensationFindings(sessions, 5);
  const exerciseEvaluations = collectExerciseEvaluationSummary(sessions);

  function withExerciseMeta(ex) {
    const lib = exerciseLib.find(item => item.id === ex.exerciseId || item.name === ex.name);
    return {
      ...ex,
      category: ex.category || lib?.category || '',
      target: ex.target || lib?.target || ''
    };
  }

  const recentNewest = sessions.slice(0, 5);
  const recentSessions = recentNewest.slice().reverse(); // Oldest to newest for prompt display
  let historyText = '（無歷史紀錄）';

  // Classify each session as Module A (上肢推+下肢拉) or B (上肢拉+下肢推)
  function classifyModule(session) {
    if (!session) return null;
    let push = 0, pull = 0;
    session.exercises.forEach(e => {
      const meta = withExerciseMeta(e);
      const cat = meta.category || meta.name || '';
      if (cat.includes('推') || cat.includes('胸') || cat.includes('肩') || cat.includes('三頭')) push++;
      if (cat.includes('拉') || cat.includes('背') || cat.includes('二頭') || cat.includes('划')) pull++;
    });
    if (push > pull) return 'A（上肢推＋下肢拉）';
    if (pull > push) return 'B（上肢拉＋下肢推）';
    return '不明確';
  }

  const sessionN1 = sessions[0] || null;
  const sessionN2 = sessions[1] || null;
  const modN2 = classifyModule(sessionN2);
  const modN1 = classifyModule(sessionN1);
  // N should match N-2; if N-2 is A, N is A; if N-2 is B, N is B
  let targetModule = '不明確';
  if (modN2 === 'A（上肢推＋下肢拉）') targetModule = 'A（上肢推＋下肢拉）';
  else if (modN2 === 'B（上肢拉＋下肢推）') targetModule = 'B（上肢拉＋下肢推）';
  else if (modN1 === 'A（上肢推＋下肢拉）') targetModule = 'B（上肢拉＋下肢推）';
  else if (modN1 === 'B（上肢拉＋下肢推）') targetModule = 'A（上肢推＋下肢拉）';

  if (recentSessions.length > 0) {
    const labelsById = new Map();
    recentNewest.forEach((s, i) => {
      labelsById.set(s.id || `${s.studentId}-${s.date}-${i}`, i === 0 ? 'N-1（上次）' : `N-${i + 1}`);
    });
    historyText = recentSessions.map((s, i) => {
      const key = s.id || `${s.studentId}-${s.date}-${recentNewest.indexOf(s)}`;
      const label = labelsById.get(key) || `N-${recentSessions.length - i}`;
      return `
### ${label}: ${s.date} (${s.sessionType})
- 模組分析：${classifyModule(s) || '不明確'}
- 當日狀況：${s.conditionNotes || '無'}
- 動作：
${s.exercises.map(raw => {
  const e = withExerciseMeta(raw);
  return `  * [${e.category || '未分類'}] ${e.name} | ${formatExerciseGroupsForPrompt(e)} | 品質:${e.quality || ''} | 備註:${e.notes || ''}`;
}).join('\n')}
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

## 最近代償紀錄（從每個動作備註解析）
格式說明：「A 代償 B」代表 A 是代償者，B 是被抑制者。
${formatCompensationFindings(compensationFindings)}

## 動作評價摘要（只彙整最近 ${EVALUATION_SUMMARY_SESSION_LIMIT} 堂課的品質與手寫備註）
${formatExerciseEvaluationSummary(exerciseEvaluations)}

## 可辨識手寫決策標籤
教練可能會在動作備註中直接寫以下標籤或同義詞；這些標籤優先於單純評分或 time out。
${formatDecisionTagOptionsForPrompt()}

## 課表模組輪替規則（重要）
- **模組 A**：上肢推（胸大肌、三角肌、三頭肌）＋ 下肢拉（臀大肌、腿後側）
- **模組 B**：上肢拉（背闊肌、菱形肌、二頭肌）＋ 下肢推（股四頭肌、臀肌）
- 規律：N-2 ≈ N（同模組），N-1 與 N 互為相反
- 分析結果：N-2 = ${modN2 || '無資料'}｜N-1 = ${modN1 || '無資料'}
- **本次（N）目標模組 = ${targetModule}**（請依此安排主訓練動作）

## 動作庫參考（可使用庫內動作也可自由創建）
${libText}

## 排課強度遞增規則（極重要）
1. **DB（啞鈴）與 Machine（機械式）相關動作**：每次強度增加單位為 **2.5kg**；其餘所有動作增加單位為 **5kg**
2. **Push up（扶槓）**：槓6 是多數學員的基準高度，數字代表架高高度，不是重量；數字越小越難。品質優良時依序進階：槓6 → 槓4 → 槓3 → 槓0 → 槓KB。不可把槓6當重量加5變成槓11，也不可產生槓7以上高度
3. **動作選擇邏輯**：主課表以 N-2 為基底並視情況加強，但務必參酌 N-1 中「在 N-2、N-3、N-4 都沒出現過」的動作，以及手寫備註中提到的代償、疼痛、控制問題或調整建議
4. **動作評價邏輯**：😀 優良 可以小幅進階或變化；😐 尚可 不要追求新奇，先穩定品質；😢 需改善 優先降階、簡化、替換或安排喚醒/控制練習
5. **time out 邏輯**：time out 不一定等於時間不足；若手寫標籤有「補做」或「時間不足」才優先排入補做/提早安排；若有「狀態不適、暫停、退階、替換、疼痛」則依該標籤處理，不要硬補做

## 你的任務
請提出 **剛好 3 個** 符合本次模組（${targetModule}）且適合該學員目標的「創意補充動作」：
1. 必須符合學員訓練目標、身體狀況，有傷處請迴避
2. 動作必須呼應本次模組（${targetModule}）的主要肌群
3. 遵守上述強度遞增規則來建議重量
4. 必須參考「動作評價摘要」與手寫評語：不要只推薦新動作，要說明它是在進階、維持、補做 time out、降階、替換、或補強控制
5. 若最近代償紀錄或手寫評語中有代償訊號，優先提出能喚醒/整合該肌群且不讓代償者搶工作的補充動作
6. 若手寫備註含決策標籤，務必依標籤處理；標籤優先順序高於單純評分
7. 【極度重要】不准加任何解說文字，不要 markdown 格式，只准回覆以下格式的 JSON 陣列（剛好3個）：

[
  {
    "name": "動作名稱",
    "category": "NKT評估|核心控制|上肢推|上肢拉|下肢推|下肢拉|心肺|全身",
    "target": "目標肌群",
    "sets": 3,
    "reps": "12",
    "weight": "15kg",
    "cues": "提示，需包含根據動作評價或手寫評語而做的進階/維持/time out補做/降階/替換理由"
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
      name: normalizePushUpBarName(ex.name),
      category: ex.category,
      target: ex.target || '',
      sets: ex.sets || 3,
      reps: String(ex.reps || '10'),
      weight: ex.weight || '-',
      cues: ex.cues || '',
      isFreeStyle: true
    }));
    const notes = document.getElementById('prep-notes')?.value || currentPrepPlan._prepNotes || '';
    currentPrepPlan = [...baseItems, ...freeItems];
    currentPrepPlan.studentId = studentId;
    currentPrepPlan._prepNotes = notes;

    rerenderCurrentViewPreserveScroll();
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
  const compensationFindings = collectCompensationFindings(sessions, 5);
  const exerciseEvaluations = collectExerciseEvaluationSummary(sessions);

  function withExerciseMeta(ex) {
    const lib = exerciseLib.find(item => item.id === ex.exerciseId || item.name === ex.name);
    return {
      ...ex,
      category: ex.category || lib?.category || '',
      target: ex.target || lib?.target || '',
      cues: ex.cues || lib?.cues || ''
    };
  }

  // sessions[0] = N-1（上次），sessions[1] = N-2（上上次），...
  const sessionN1 = sessions[0] || null;
  const sessionN2 = sessions[1] || null;
  const sessionN3 = sessions[2] || null;
  const sessionN4 = sessions[3] || null;

  // Push up（扶槓）：槓6是基準高度，進階序列是槓6 -> 槓4 -> 槓3 -> 槓0 -> 槓KB。
  function adjustPushUpBar(name, quality) {
    const adjusted = progressPushUpBarName(name, quality);
    return adjusted !== name ? adjusted : null;
  }

  // 收集某個 session 的動作名稱集合
  function getExerciseNames(session) {
    if (!session) return new Set();
    return new Set(session.exercises.map(e => e.name));
  }

  // Classify session as Module A (上肢推+下肢拉) or B (上肢拉+下肢推)
  function classifyModule(session) {
    if (!session) return null;
    let aScore = 0, bScore = 0;  // A = 上肢推 + 下肢拉；B = 上肢拉 + 下肢推
    session.exercises.forEach(e => {
      const cat = withExerciseMeta(e).category || '';
      if (cat === '上肢推' || cat === '下肢拉') aScore++;
      if (cat === '上肢拉' || cat === '下肢推') bScore++;
    });
    if (aScore > bScore) return 'A';
    if (bScore > aScore) return 'B';
    return null;
  }

  const modN2 = classifyModule(sessionN2);
  const modN1 = classifyModule(sessionN1);

  // ── 情況 1：有 N-2 → 以 N-2 為模板（N 與 N-2 同模組）──
  if (sessionN2) {
    const plan = sessionN2.exercises.map(raw => {
      const e = withExerciseMeta(raw);
      const decisionTags = parseDecisionTags(e.notes);
      // Push up 扶槓特殊處理
      let name = e.name;
      const adjustedName = shouldProgressFromQualityAndTags(e.quality, decisionTags) ? adjustPushUpBar(name, e.quality) : null;
      if (adjustedName) name = adjustedName;

      let cues = '';
      if (hasAnyDecisionTag(decisionTags, ['pause'])) cues = '手寫標籤暫停/不要排';
      else if (hasAnyDecisionTag(decisionTags, ['replace'])) cues = '手寫標籤替換';
      else if (hasAnyDecisionTag(decisionTags, ['regress', 'lessLoad', 'pain'])) cues = '手寫標籤退階/減量/疼痛，先降階';
      else if (hasAnyDecisionTag(decisionTags, ['condition'])) cues = '上次為當日狀態不適，不直接追重量';
      else if (hasAnyDecisionTag(decisionTags, ['makeup', 'timeShort'])) cues = '手寫標籤補做/時間不足，這次提早安排';
      else if (isGoodQuality(e.quality)) cues = '上次品質優良，已依規則微幅加強';
      else if (isNeedsWorkQuality(e.quality)) cues = '上次品質需改善，先維持重量並注意動作品質';
      else if (hasTimeOutNote(e.notes)) cues = '上次 time out 未標原因，請確認是時間不足或狀態不適';
      else cues = 'N-2 同模組延續';

      return buildPrepExerciseFromSession(e, {
        name,
        progress: shouldProgressFromQualityAndTags(e.quality, decisionTags),
        cues,
        reason: cues
      });
    });

    // ── 規則 3：從 N-1 補入 N-2/N-3/N-4 都沒出現過的動作 ──
    if (sessionN1) {
      const namesN2 = getExerciseNames(sessionN2);
      const namesN3 = getExerciseNames(sessionN3);
      const namesN4 = getExerciseNames(sessionN4);
      const alreadyInPlan = new Set(plan.map(e => e.name));

      // 找出 N-1 中獨有的動作（N-2/N-3/N-4 都沒出現）
      const uniqueFromN1 = sessionN1.exercises.map(withExerciseMeta).filter(e =>
        !namesN2.has(e.name) && !namesN3.has(e.name) && !namesN4.has(e.name)
        && !alreadyInPlan.has(e.name)
      );

      // 優先排序：補做/時間不足/需改善的排前面，狀態不適或暫停交給決策標籤處理
      uniqueFromN1.sort((a, b) => {
        const aTags = parseDecisionTags(a.notes);
        const bTags = parseDecisionTags(b.notes);
        const aUrgent = hasAnyDecisionTag(aTags, ['makeup', 'timeShort']) || isNeedsWorkQuality(a.quality) ? 1 : 0;
        const bUrgent = hasAnyDecisionTag(bTags, ['makeup', 'timeShort']) || isNeedsWorkQuality(b.quality) ? 1 : 0;
        return bUrgent - aUrgent;
      });

      uniqueFromN1.slice(0, MAX_UNIQUE_CARRYOVER_EXERCISES).forEach(e => {
        const tags = parseDecisionTags(e.notes);
        if (hasAnyDecisionTag(tags, ['pause'])) return;
        const shouldMakeup = hasAnyDecisionTag(tags, ['makeup', 'timeShort']) || (hasTimeOutNote(e.notes) && !hasAnyDecisionTag(tags, ['condition', 'replace', 'regress', 'pain']));
        const needsWork = isNeedsWorkQuality(e.quality);
        plan.push(buildPrepExerciseFromSession(e, {
          progress: false,
          cues: shouldMakeup ? '上次標記補做/時間不足或 time out 未標原因，這次提早安排' : needsWork ? '上次品質需改善' : 'N-1 獨有動作',
          reason: shouldMakeup ? 'N-1 補做/時間不足' : needsWork ? 'N-1 品質需改善補入' : 'N-1 獨有動作補入'
        }));
      });
    }

    return finalizeGeneratedPlan(carryForwardTimeoutExercises(plan, sessionN1, exerciseLib), student, exerciseLib, compensationFindings, exerciseEvaluations);
  }

  // ── 情況 2：只有 N-1，沒有 N-2 → N 與 N-1 相反模組 ──
  if (sessionN1) {
    // 帶入 N-1 中非主訓練的部分（暖身、核心等），主訓練改為相反模組
    const plan = [];
    // 保留 N-1 的暖身/NKT/核心動作
    sessionN1.exercises.map(withExerciseMeta).forEach(e => {
      const cat = e.category || '';
      if (cat.includes('NKT') || cat.includes('核心') || cat.includes('暖身')) {
        plan.push(buildPrepExerciseFromSession(e, { progress: false, cues: '沿用上次暖身/核心準備', reason: '沿用上次暖身/核心準備' }));
      }
    });
    // 主訓練：N-1 的相反模組，從動作庫挑選
    const oppositeModule = modN1 === 'A' ? 'B' : 'A';
    const mainCats = oppositeModule === 'A' ? ['上肢推', '下肢拉'] : ['上肢拉', '下肢推'];
    mainCats.forEach(cat => {
      const available = exerciseLib.filter(e => e.category === cat);
      const shuffled = [...available].sort(() => Math.random() - 0.5);
      shuffled.slice(0, 2).forEach(e => {
        plan.push({ exerciseId: e.id, name: e.name, category: e.category, sets: 4, reps: '10', weight: '', cues: 'N-1 相反模組補足主訓練', planningReason: 'N-1 相反模組補足主訓練' });
      });
    });
    return finalizeGeneratedPlan(carryForwardTimeoutExercises(plan, sessionN1, exerciseLib), student, exerciseLib, compensationFindings, exerciseEvaluations);
  }

  // ── 情況 3：完全沒有歷史 → 從動作庫均衡挑選 ──
  const plan = [];
  // 新學員首次備課：A 模組打底（上肢推 + 下肢拉）
  const categories = ['NKT評估', '核心控制', '上肢推', '下肢拉', '全身'];
  categories.forEach(cat => {
    const available = exerciseLib.filter(e => e.category === cat);
    const count = (cat === 'NKT評估' || cat === '核心控制') ? 1 : 2;
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    shuffled.slice(0, Math.min(count, available.length)).forEach(e => {
      const isWarmup = cat === 'NKT評估' || cat === '核心控制';
      plan.push({
        exerciseId: e.id, name: e.name, category: e.category,
        sets: isWarmup ? 2 : 4, reps: isWarmup ? '8' : '10', weight: isWarmup ? '-' : '', cues: '新學員首次備課均衡建立基準', planningReason: '新學員首次備課均衡建立基準'
      });
    });
  });
  return finalizeGeneratedPlan(plan, student, exerciseLib, compensationFindings, exerciseEvaluations);
}

// ── Prep exercise row helpers ──
function getPrepCatIcons() {
  return { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢推':'lower-push','下肢拉':'lower-pull','心肺':'cardio','全身':'full' };
}

function getPrepCatEmojis() {
  return { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢推':'🦵','下肢拉':'🍑','心肺':'❤️','全身':'⚡' };
}

function renderPlanningReason(ex) {
  const reason = String(ex.planningReason || ex.cues || '').trim();
  if (!reason) return '';
  const compact = reason.split('；').map(item => item.trim()).filter(Boolean).slice(0, 3).join('；');
  return `<div style="margin:6px 0 0 32px;padding:6px 8px;border-radius:8px;background:rgba(116,185,255,0.08);border:1px solid rgba(116,185,255,0.18);color:var(--text-secondary);font-size:0.72rem;line-height:1.45">
        <span style="color:var(--info);font-weight:700">排課理由：</span>${compact}
      </div>`;
}

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
      ${renderPlanningReason(ex)}
    </div>`;
}

function appendLatestPrepExerciseRow() {
  const list = document.getElementById('prep-exercise-list');
  if (!list || !currentPrepPlan?.length) return false;

  const normalExercises = currentPrepPlan.filter(ex => !ex.isFreeStyle);
  const idx = normalExercises.length - 1;
  const ex = normalExercises[idx];
  if (!ex || document.getElementById(`prep-ex-${idx}`)) return false;

  list.insertAdjacentHTML('beforeend', renderPrepExerciseRow(ex, idx, getPrepCatIcons(), getPrepCatEmojis()));
  if (typeof _initPrepTouchDrag === 'function') _initPrepTouchDrag();
  return true;
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
let _bodyCheckBaselines = { weight: null, muscle: null, bodyFat: null };

function hasBodyMetricValue(record, key) {
  if (!record) return false;
  const val = record[key];
  return val !== null && val !== undefined && val !== '' && !isNaN(parseFloat(val));
}

function findLatestBodyDataWith(history, keys) {
  for (let i = history.length - 1; i >= 0; i--) {
    if (keys.some(key => hasBodyMetricValue(history[i], key))) return history[i];
  }
  return null;
}

function renderBodyCheck(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';

  const history = DB.getBodyData(studentId);
  _bodyCheckBaselines = {
    weight: findLatestBodyDataWith(history, ['weight']),
    muscle: findLatestBodyDataWith(history, ['muscle']),
    bodyFat: findLatestBodyDataWith(history, ['bodyFat'])
  };
  const lastComposition = findLatestBodyDataWith(history, ['muscle', 'bodyFat']);
  const recent4 = history.slice(-4);
  while (recent4.length < 4) recent4.unshift(null);
  const daysSinceLast = lastComposition ? Math.floor((new Date() - new Date(lastComposition.date)) / (1000*60*60*24)) : null;
  const needsMeasure = daysSinceLast !== null && daysSinceLast >= 28;
  const cellStyle = 'background:var(--bg-card);border-radius:10px;padding:10px 4px;text-align:center;min-height:86px;display:flex;flex-direction:column;justify-content:center';

  return `
    <div class="prep-student-bar fade-in">
      <div class="student-avatar" style="background:${student.avatarColor}">${student.name.charAt(0)}</div>
      <div>
        <div class="student-name">${student.name}</div>
        <div class="student-meta">上課前身體數據記錄</div>
      </div>
    </div>
    ${needsMeasure ? `
    <div class="fade-in" style="margin:0 16px 10px;background:rgba(255,107,107,0.12);border:1px solid var(--danger);border-radius:10px;padding:10px 12px;font-size:0.82rem;color:var(--danger)">
      ⚠️ 距離上次量測已 ${daysSinceLast} 天，建議今天記錄體脂數據
    </div>` : ''}
    <div class="prep-section fade-in stagger-1">
      <div class="prep-section-title">📊 歷史紀錄（最近 4 次）</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px">
        ${recent4.map(r => {
          if (!r) return `<div style="${cellStyle};opacity:0.35">
            <div style="font-size:0.68rem;color:var(--text-muted)">--</div>
            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:6px">尚無</div>
          </div>`;
          return `<div style="${cellStyle}">
            <div style="font-size:0.62rem;color:var(--text-muted)">${(r.date||'').slice(5)}</div>
            <div style="font-size:0.95rem;font-weight:700;margin-top:3px">${r.weight || '--'}<span style="font-size:0.55rem;color:var(--text-muted);margin-left:1px">kg</span></div>
            <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:1px">💪 ${r.muscle || '--'}</div>
            <div style="font-size:0.68rem;color:var(--text-secondary);margin-top:1px">📊 ${r.bodyFat || '--'}%</div>
          </div>`;
        }).join('')}
      </div>
    </div>
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
  const fields = [
    { inputId:'bc-weight', diffId:'bc-weight-diff', baseline: _bodyCheckBaselines.weight,  field:'weight'  },
    { inputId:'bc-muscle', diffId:'bc-muscle-diff', baseline: _bodyCheckBaselines.muscle,  field:'muscle'  },
    { inputId:'bc-fat',    diffId:'bc-fat-diff',    baseline: _bodyCheckBaselines.bodyFat, field:'bodyFat' },
  ];
  fields.forEach(({ inputId, diffId, baseline, field }) => {
    const input = document.getElementById(inputId);
    const diffEl = document.getElementById(diffId);
    if (!input || !diffEl) return;
    const lastVal = baseline ? baseline[field] : null;
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
  rerenderCurrentViewPreserveScroll();
  showToast('✅ 已加入正式課表');
};

function renderPrep(studentId) {
  const student = DB.getStudent(studentId);
  if (!student) return '<div class="empty-state"><div class="empty-state-icon">❌</div><div class="empty-state-title">找不到學員</div></div>';

  const sessions = DB.getSessions(studentId);
  const lastSession = sessions[0];
  const compensationFindings = collectCompensationFindings(sessions, 5);
  const planningPrefs = getPlanningPrefs(student);
  const learnedPreferCount = Object.values(planningPrefs.prefer).reduce((sum, n) => sum + n, 0);
  const learnedAvoidCount = Object.values(planningPrefs.avoid).reduce((sum, n) => sum + n, 0);
  const learnedTuningCount = Object.keys(planningPrefs.tuning).length;

  if (!currentPrepPlan || currentPrepPlan.studentId !== studentId) {
    const saved = DB.getPrepPlan(studentId);
    if (saved && saved.exercises && saved.exercises.length) {
      currentPrepPlan = saved.exercises;
      currentPrepPlan._prepNotes = saved.notes || '';
      setPrepBaseline(currentPrepPlan);
    } else {
      currentPrepPlan = generateAISuggestions(studentId);
    }
    currentPrepPlan.studentId = studentId;
  }

  const catIcons  = { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢推':'lower-push','下肢拉':'lower-pull','心肺':'cardio','全身':'full' };
  const catEmojis = { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢推':'🦵','下肢拉':'🍑','心肺':'❤️','全身':'⚡' };

  return `
    <div class="prep-student-bar fade-in">
      <div class="student-avatar" style="background:${student.avatarColor}">${student.name.charAt(0)}</div>
      <div>
        <div class="student-name">${student.name} <span class="tag tag-accent">${student.currentPhase}</span></div>
        <div class="student-meta">第 ${student.totalSessions + 1} 堂 · ${student.goals}</div>
      </div>
    </div>
    ${(learnedPreferCount || learnedAvoidCount || learnedTuningCount) ? `
    <div class="fade-in" style="margin:0 16px 10px;padding:8px 12px;border:1px solid rgba(0,229,160,0.28);border-radius:10px;background:rgba(0,229,160,0.08);font-size:0.76rem;color:var(--text-secondary)">
      已學習排課偏好：常保留/新增 ${learnedPreferCount} 次，常刪除 ${learnedAvoidCount} 次，內容微調 ${learnedTuningCount} 個動作
    </div>` : ''}
    ${compensationFindings.length ? `
    <div class="prep-section fade-in stagger-1">
      <div class="prep-section-title">🔎 最近代償紀錄</div>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
        ${compensationFindings.slice(0, 5).map(f => `
          <div style="padding:8px 10px;border-radius:8px;background:var(--bg-card);border:1px solid var(--border);font-size:0.76rem;color:var(--text-secondary);line-height:1.45">
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
              <div style="min-width:0">
                <span style="color:var(--text-muted)">${(f.date || '').slice(5) || '--'}｜${f.exerciseName || '動作'}</span><br>
                <span>${escapeHtmlAttr(f.rawText || `${f.compensator} 代償 ${f.inhibited}`)}</span>
              </div>
              <button type="button"
                data-session-id="${escapeHtmlAttr(f.sessionId)}"
                data-exercise-index="${f.exerciseIndex}"
                data-finding-key="${escapeHtmlAttr(f.key)}"
                onclick="resolveCompensationFindingFromButton(this)"
                style="flex:0 0 auto;border:1px solid rgba(0,229,160,0.35);background:rgba(0,229,160,0.1);color:var(--accent);border-radius:6px;padding:4px 7px;font-size:0.68rem;font-weight:700;cursor:pointer">
                處理完畢
              </button>
            </div>
          </div>`).join('')}
      </div>
    </div>` : ''}
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
      <div class="prep-section-title" style="cursor:pointer;display:flex;align-items:center;gap:6px" onclick="historyPanelCollapsed=!historyPanelCollapsed;document.getElementById('history-panel').style.display=historyPanelCollapsed?'none':'block';this.querySelector('.hist-arrow').textContent=historyPanelCollapsed?'▶':'▼'">
        <span class="hist-arrow" style="font-size:0.65rem;color:var(--text-muted)">${historyPanelCollapsed?'▶':'▼'}</span> 📊 N-2 / N-1 課表對照
      </div>
      <div id="history-panel" style="display:${historyPanelCollapsed?'none':'block'}">
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
          ${s.exercises.map(e => {
            const groups = getSessionExerciseGroups(e);
            const qualIcon = isGoodQuality(e.quality) ? '😀' : e.quality === '尚可' ? '😐' : isNeedsWorkQuality(e.quality) ? '😢' : '-';
            return groups.map((g, gi) => `
          <div style="display:flex;align-items:center;gap:4px;padding:${gi===0?'5':'2'}px 0;${gi===0?'border-top:1px solid var(--border);':''}font-size:0.78rem">
            <div style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${gi===0?e.name:''}</div>
            <div style="width:52px;text-align:center;color:var(--accent);font-size:0.75rem">${g.weight||'-'}</div>
            <div style="width:36px;text-align:center;font-size:0.75rem">${g.reps||'-'}</div>
            <div style="width:28px;text-align:center;font-size:0.75rem">${g.count}</div>
            <div style="width:32px;text-align:center;font-size:0.72rem">${gi===0?qualIcon:''}</div>
          </div>`).join('');
          }).join('')}
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
      <div id="prep-exercise-list">
        ${currentPrepPlan.filter(ex => !ex.isFreeStyle).map((ex, idx) => renderPrepExerciseRow(ex, idx, catIcons, catEmojis)).join('')}
      </div>
      ${currentPrepPlan.filter(ex => ex.isFreeStyle).length > 0 ? `
      <div style="margin-top:16px;padding:10px 8px 6px;border-radius:var(--radius-md);background:linear-gradient(135deg,rgba(108,92,231,0.12),rgba(0,229,160,0.08));border:1px solid rgba(108,92,231,0.3)">
        <div style="font-size:0.72rem;color:var(--accent-secondary);font-weight:700;letter-spacing:0.05em;margin-bottom:8px">🧠 AI 自由發揮建議</div>
        ${currentPrepPlan.map((ex, idx) => ex.isFreeStyle ? renderPrepFreeItem(ex, idx, catIcons, catEmojis) : '').join('')}
      </div>` : ''}
      <button id="prep-add-exercise-btn" class="btn-add-exercise" onclick="showExercisePicker('${studentId}')" style="margin-top:8px">+ 新增動作</button>
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
  const catEmojis = { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢推':'🦵','下肢拉':'🍑','心肺':'❤️','全身':'⚡' };
  const catIcons  = { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢推':'lower-push','下肢拉':'lower-pull','心肺':'cardio','全身':'full' };
  const qualities = [
    { emoji:'😀', label:'優良' },
    { emoji:'😐', label:'尚可' },
    { emoji:'😢', label:'需改善' }
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
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <div class="active-exercise-title">${ex.name}</div>
            <button onclick="showEditSessionExercise()" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text-muted);font-size:0.72rem;padding:2px 7px;cursor:pointer;flex-shrink:0">✏️ 改</button>
            <button onclick="deleteCurrentSessionExercise()" style="background:none;border:1px solid var(--danger);border-radius:6px;color:var(--danger);font-size:0.72rem;padding:2px 7px;cursor:pointer;flex-shrink:0">🗑️ 刪除</button>
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
        <textarea id="exercise-note" placeholder="快速備註（如：保留、退階、替換、補做、狀態不適、代償表）" oninput="updateExerciseNote(this.value)">${ex.notes}</textarea>
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

function rerenderCurrentViewPreserveScroll(scrollPosition) {
  const curr = navigationStack[navigationStack.length - 1];
  if (!curr) return;
  const pos = scrollPosition || (typeof getScrollPosition === 'function'
    ? getScrollPosition()
    : {
      contentScrollTop: document.getElementById('app-content')?.scrollTop || 0,
      windowScrollY: window.scrollY || window.pageYOffset || 0
    });
  renderView(curr.view, curr.param, {
    preserveScroll: true,
    contentScrollTop: pos.contentScrollTop,
    windowScrollY: pos.windowScrollY
  });
}

function addSubSet(idx) {
  if (!currentPrepPlan[idx]) return;
  if (!currentPrepPlan[idx].subSets) currentPrepPlan[idx].subSets = [];
  const ex = currentPrepPlan[idx];
  currentPrepPlan[idx].subSets.push({ weight: '', reps: ex.reps, sets: parseInt(ex.sets) || 1 });
  rerenderCurrentViewPreserveScroll();
}

function removeSubSet(idx, subIdx) {
  currentPrepPlan[idx]?.subSets?.splice(subIdx, 1);
  rerenderCurrentViewPreserveScroll();
}

function updateSubSet(idx, subIdx, field, val) {
  if (!currentPrepPlan[idx]?.subSets?.[subIdx]) return;
  currentPrepPlan[idx].subSets[subIdx][field] = field === 'sets' ? (parseInt(val) || 1) : val;
}

function savePrepPlan(studentId) {
  const notes = document.getElementById('prep-notes')?.value || '';
  currentPrepPlan._prepNotes = notes;
  const learned = learnPlanningPreferences(studentId);
  DB.savePrepPlan(studentId, { exercises: currentPrepPlan.map(e => ({...e})), notes });

  // 在今日排程項目上記錄備課時間戳
  const todayStr = getTodayStr();
  const schedule = DB.getSchedule();
  const item = schedule.find(s => s.studentId === studentId && s.date === todayStr);
  if (item) {
    const now = new Date();
    item.preppedAt = `${now.getFullYear()}/${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
    DB.saveScheduleItem(item);
  }

  const learnText = learned.added || learned.removed || learned.tuned ? ` · 已學習 +${learned.added}/-${learned.removed}/調${learned.tuned}` : '';
  showToast(`✅ 備課已儲存${learnText}`);
}

function showSessionAddExercise() {
  if (typeof rememberModalReturnScrollPosition === 'function') rememberModalReturnScrollPosition();
  const exercises = DB.getExercises();
  const catEmojis = { 'NKT評估':'🔬','核心控制':'🎯','上肢推':'💪','上肢拉':'🏋️','下肢推':'🦵','下肢拉':'🍑','心肺':'❤️','全身':'⚡' };
  const catIcons  = { 'NKT評估':'nkt','核心控制':'core','上肢推':'push','上肢拉':'pull','下肢推':'lower-push','下肢拉':'lower-pull','心肺':'cardio','全身':'full' };
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
  const scrollPosition = typeof getModalReturnScrollPosition === 'function'
    ? getModalReturnScrollPosition()
    : (typeof getScrollPosition === 'function' ? getScrollPosition() : null);
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
  renderView('session', currentSessionState.studentId, { preserveScroll: true, ...(scrollPosition || {}) });
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
  const cats = ['NKT評估','核心控制','上肢推','上肢拉','下肢推','下肢拉','心肺','全身'];
  return `
    <div class="form-section fade-in">
      <div class="form-group">
        <label class="form-label">動作名稱 *</label>
        <input type="text" id="fe-name" value="${ex?.name || ''}" placeholder="例如：壺鈴擺盪">
      </div>
      <div class="form-group">
        <label class="form-label">分類</label>
        <select id="fe-category">
          ${cats.map(c => `<option value="${c}" ${ex?.category === c ? 'selected' : (c === '下肢推' && !ex ? 'selected' : '')}>${c}</option>`).join('')}
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
  rerenderCurrentViewPreserveScroll();
};

// ── Touch drag for mobile ──
let _tdIdx = null;

function _initPrepTouchDrag() {
  document.querySelectorAll('.prep-drag-handle').forEach(handle => {
    if (handle.dataset.touchDragBound === '1') return;
    handle.dataset.touchDragBound = '1';
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
    rerenderCurrentViewPreserveScroll();
  }
  _tdIdx = null;
}

// ── Session exercise edit (per-set) ──
let _editSets = [];

function _renderEditSetsModal(exName, modalScrollTop = null) {
  const inputStyle = 'background:var(--bg-card);border:1px solid var(--border);border-radius:6px;padding:7px 4px;color:var(--text-primary);font-size:0.85rem;text-align:center;width:100%;box-sizing:border-box';
  const canRemove = _editSets.length > 1;
  const modalContent = document.getElementById('modal-content');
  modalContent.innerHTML = `
    <div class="modal-handle"></div>
    <div class="modal-header"><div class="modal-title">✏️ ${exName}</div></div>
    <div style="padding:0 16px 8px">
      <div style="display:grid;grid-template-columns:36px 1fr 1fr 32px;gap:6px;margin-bottom:6px">
        <div></div>
        <div style="font-size:0.68rem;color:var(--text-muted);text-align:center">重量</div>
        <div style="font-size:0.68rem;color:var(--text-muted);text-align:center">次數</div>
        <div></div>
      </div>
      ${_editSets.map((s, i) => `
        <div style="display:grid;grid-template-columns:36px 1fr 1fr 32px;gap:6px;margin-bottom:6px;align-items:center">
          <div style="font-size:0.72rem;color:var(--text-muted);text-align:center">第${i+1}組</div>
          <input type="text" value="${s.weight||''}" placeholder="kg" oninput="_editSets[${i}].weight=this.value" style="${inputStyle}">
          <input type="text" value="${s.reps||''}" placeholder="次" oninput="_editSets[${i}].reps=this.value" style="${inputStyle}">
          <button onclick="_removeEditSet(${i})" ${canRemove ? '' : 'disabled'} title="刪除此組" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--danger);font-size:1rem;line-height:1;padding:6px 0;cursor:pointer;${canRemove ? '' : 'opacity:0.25;cursor:not-allowed'}">－</button>
        </div>`).join('')}
      <div style="margin-top:10px">
        <button onclick="_addEditSet()" style="width:100%;background:none;border:1px dashed var(--border);border-radius:8px;color:var(--text-muted);padding:8px;cursor:pointer;font-size:0.8rem">＋ 新增一組</button>
      </div>
    </div>
    <div style="padding:8px 16px 24px">
      <button class="btn-primary accent" onclick="applyEditSessionExercise()">✅ 套用</button>
    </div>`;
  document.getElementById('modal-overlay').classList.add('active');
  if (modalScrollTop !== null) {
    requestAnimationFrame(() => { modalContent.scrollTop = modalScrollTop; });
  }
}

window.showEditSessionExercise = function() {
  if (!currentSessionState) return;
  if (typeof rememberModalReturnScrollPosition === 'function') rememberModalReturnScrollPosition();
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _editSets = ex.allSets.map(s => ({ weight: s.weight || '', reps: s.reps || ex.reps || '10' }));
  _renderEditSetsModal(ex.name);
};

window._addEditSet = function() {
  const last = _editSets[_editSets.length - 1] || { weight: '', reps: '10' };
  _editSets.push({ weight: last.weight, reps: last.reps });
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _renderEditSetsModal(ex.name, document.getElementById('modal-content')?.scrollTop || 0);
};

window._removeLastEditSet = function() {
  if (_editSets.length <= 1) return;
  _editSets.pop();
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _renderEditSetsModal(ex.name, document.getElementById('modal-content')?.scrollTop || 0);
};

window._removeEditSet = function(i) {
  if (_editSets.length <= 1) return;
  _editSets.splice(i, 1);
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  _renderEditSetsModal(ex.name, document.getElementById('modal-content')?.scrollTop || 0);
};

window.deleteCurrentSessionExercise = function() {
  if (!currentSessionState) return;
  const state = currentSessionState;
  if (state.exercises.length <= 1) {
    if (typeof showToast === 'function') showToast('⚠️ 至少保留一個動作');
    else alert('至少保留一個動作');
    return;
  }
  const ex = state.exercises[state.currentExIdx];
  if (!confirm(`是否真的要刪除本項目？\n\n「${ex.name}」將從本次課程中移除`)) return;
  state.exercises.splice(state.currentExIdx, 1);
  if (state.currentExIdx >= state.exercises.length) {
    state.currentExIdx = state.exercises.length - 1;
  }
  renderView('session', state.studentId, { preserveScroll: true });
};

window.applyEditSessionExercise = function() {
  const ex = currentSessionState.exercises[currentSessionState.currentExIdx];
  ex.allSets = _editSets.map(s => ({ weight: s.weight, reps: s.reps || ex.reps }));
  ex.completedSets = new Array(ex.allSets.length).fill(false);
  ex.reps = ex.allSets[0]?.reps || ex.reps;
  ex.weight = ex.allSets[0]?.weight || '-';
  const scrollPosition = typeof getModalReturnScrollPosition === 'function'
    ? getModalReturnScrollPosition()
    : (typeof getScrollPosition === 'function' ? getScrollPosition() : null);
  closeModal();
  renderView('session', currentSessionState.studentId, { preserveScroll: true, ...(scrollPosition || {}) });
};
