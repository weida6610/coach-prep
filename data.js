// ============================================
// Data Layer — Mock Data & LocalStorage
// ============================================

const AVATAR_COLORS = [
  'linear-gradient(135deg, #00e5a0, #00b4d8)',
  'linear-gradient(135deg, #6c5ce7, #a855f7)',
  'linear-gradient(135deg, #f97316, #fbbf24)',
  'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  'linear-gradient(135deg, #74b9ff, #0984e3)',
  'linear-gradient(135deg, #fd79a8, #e84393)',
];

const EXERCISE_LIBRARY = [
  // 暖身
  { id:'E001', name:'滾筒放鬆（上背）', category:'暖身', target:'胸椎活動度', defaultSets:1, defaultReps:'60秒', cues:'慢速滾動，停留痛點' },
  { id:'E002', name:'滾筒放鬆（臀部/ITB）', category:'暖身', target:'髖關節', defaultSets:1, defaultReps:'60秒', cues:'側躺，緩慢滾動' },
  { id:'E003', name:'90/90 髖關節活動度', category:'暖身', target:'髖關節', defaultSets:2, defaultReps:'8', cues:'骨盆保持中立' },
  { id:'E004', name:'貓牛式', category:'暖身', target:'脊椎活動度', defaultSets:2, defaultReps:'10', cues:'配合呼吸' },
  { id:'E005', name:'世界最偉大伸展', category:'暖身', target:'全身活動度', defaultSets:2, defaultReps:'5/側', cues:'動作慢且到位' },
  // NKT 檢測
  { id:'E010', name:'NKT 臀大肌測試', category:'NKT檢測', target:'臀大肌', defaultSets:1, defaultReps:'測試', cues:'俯臥，測試髖伸展力量' },
  { id:'E011', name:'NKT 臀中肌測試', category:'NKT檢測', target:'臀中肌', defaultSets:1, defaultReps:'測試', cues:'側臥，測試髖外展力量' },
  { id:'E012', name:'NKT 深前線測試', category:'NKT檢測', target:'核心穩定', defaultSets:1, defaultReps:'測試', cues:'評估前後筋膜鏈' },
  { id:'E013', name:'NKT 肩關節穩定測試', category:'NKT檢測', target:'肩旋轉袖', defaultSets:1, defaultReps:'測試', cues:'測試內外旋力量' },
  // 矯正動作
  { id:'E020', name:'Clam Shell', category:'矯正動作', target:'臀中肌', defaultSets:3, defaultReps:'15', cues:'骨盆不旋轉，感受臀部外側' },
  { id:'E021', name:'Dead Bug', category:'矯正動作', target:'核心穩定', defaultSets:3, defaultReps:'10', cues:'腰椎貼地，呼氣時伸展' },
  { id:'E022', name:'Bird Dog', category:'矯正動作', target:'核心穩定', defaultSets:3, defaultReps:'10/側', cues:'對側手腳延伸，軀幹穩定' },
  { id:'E023', name:'側走怪獸步', category:'矯正動作', target:'臀中肌', defaultSets:3, defaultReps:'12步/側', cues:'膝蓋對齊腳尖，重心低' },
  { id:'E024', name:'壺鈴土耳其起立', category:'矯正動作', target:'全身穩定', defaultSets:2, defaultReps:'3/側', cues:'每個位置暫停確認穩定' },
  { id:'E025', name:'肩胛骨YTWL', category:'矯正動作', target:'肩胛穩定', defaultSets:3, defaultReps:'8', cues:'肩胛下壓後縮' },
  { id:'E026', name:'髖屈肌伸展+啟動', category:'矯正動作', target:'髖屈肌/臀肌', defaultSets:2, defaultReps:'30秒/側', cues:'後腳膝蓋著地，臀部夾緊' },
  // 肌力訓練
  { id:'E030', name:'高腳杯深蹲', category:'肌力訓練', target:'股四頭/臀大肌', defaultSets:4, defaultReps:'10', cues:'挺胸，膝蓋對齊腳尖' },
  { id:'E031', name:'啞鈴羅馬尼亞硬舉', category:'肌力訓練', target:'後側鏈', defaultSets:4, defaultReps:'10', cues:'髖鉸鏈，微曲膝' },
  { id:'E032', name:'保加利亞分腿蹲', category:'肌力訓練', target:'股四頭/臀肌', defaultSets:3, defaultReps:'10/腳', cues:'軀幹直立，前腳發力' },
  { id:'E033', name:'單臂啞鈴划船', category:'肌力訓練', target:'背闊肌', defaultSets:3, defaultReps:'12', cues:'肩胛先啟動再拉' },
  { id:'E034', name:'啞鈴臥推', category:'肌力訓練', target:'胸大肌', defaultSets:4, defaultReps:'10', cues:'肩胛收緊，控制離心' },
  { id:'E035', name:'啞鈴肩推', category:'肌力訓練', target:'三角肌', defaultSets:3, defaultReps:'10', cues:'核心穩定，不聳肩' },
  { id:'E036', name:'臀推（Hip Thrust）', category:'肌力訓練', target:'臀大肌', defaultSets:4, defaultReps:'12', cues:'頂峰收縮2秒' },
  { id:'E037', name:'農夫走路', category:'肌力訓練', target:'核心/握力', defaultSets:3, defaultReps:'40步', cues:'挺胸收腹，步伐穩定' },
  { id:'E038', name:'面拉（Face Pull）', category:'肌力訓練', target:'後三角/菱形肌', defaultSets:3, defaultReps:'15', cues:'外旋到底，擠壓肩胛' },
  { id:'E039', name:'棒式（Plank）', category:'肌力訓練', target:'核心', defaultSets:3, defaultReps:'30-45秒', cues:'全身繃緊，呼吸不憋' },
];

const MOCK_STUDENTS = [
  {
    id:'S001', name:'王小明', age:35, phone:'0912-345-678',
    goals:'改善肩頸痠痛、增肌',
    medicalHistory:'右膝前十字韌帶重建術後（2024）',
    nktFindings:'右側臀中肌曾有抑制，經矯正後改善中；左側闊筋膜張肌代償模式需持續關注',
    currentPhase:'肌力期',
    totalSessions: 48,
    notes:'週三、週五固定課',
    avatarColor: AVATAR_COLORS[0]
  },
  {
    id:'S002', name:'李美玲', age:42, phone:'0923-456-789',
    goals:'減脂、改善下背痛',
    medicalHistory:'L4-L5 椎間盤突出病史',
    nktFindings:'核心深層穩定肌（腹橫肌）啟動不足，多裂肌功能待加強',
    currentPhase:'矯正期',
    totalSessions: 15,
    notes:'週二、週四固定課，避免過度腰椎屈曲',
    avatarColor: AVATAR_COLORS[1]
  },
  {
    id:'S003', name:'陳大偉', age:28, phone:'0934-567-890',
    goals:'運動表現提升（籃球）',
    medicalHistory:'無特殊',
    nktFindings:'雙側肩旋轉袖穩定性良好，右踝背屈活動度受限',
    currentPhase:'體能期',
    totalSessions: 62,
    notes:'週一、週三、週五，比賽季注意負荷管理',
    avatarColor: AVATAR_COLORS[2]
  },
  {
    id:'S004', name:'張雅婷', age:33, phone:'0945-678-901',
    goals:'產後恢復、骨盆底肌訓練',
    medicalHistory:'產後6個月，輕微腹直肌分離',
    nktFindings:'骨盆底肌與橫隔膜協調性待建立，右側臀大肌抑制',
    currentPhase:'矯正期',
    totalSessions: 8,
    notes:'週二、週四，注意腹壓控制',
    avatarColor: AVATAR_COLORS[3]
  },
  {
    id:'S005', name:'林志豪', age:50, phone:'0956-789-012',
    goals:'退化性關節炎保養、維持肌力',
    medicalHistory:'雙膝退化性關節炎 Grade II',
    nktFindings:'雙側股內側肌（VMO）啟動延遲，需持續加強',
    currentPhase:'肌力期',
    totalSessions: 35,
    notes:'週一、週四，避免高衝擊動作',
    avatarColor: AVATAR_COLORS[4]
  },
];

const MOCK_SESSIONS = [
  // 王小明 recent sessions
  {
    id:'LOG-20260322-S001', studentId:'S001', date:'2026-03-22',
    sessionType:'混合',
    exercises:[
      { exerciseId:'E003', name:'90/90 髖關節活動度', sets:2, reps:'8', weight:'-', completed:[true,true], quality:'良好', notes:'' },
      { exerciseId:'E020', name:'Clam Shell', sets:3, reps:'15', weight:'彈力帶', completed:[true,true,true], quality:'良好', notes:'左側較弱' },
      { exerciseId:'E030', name:'高腳杯深蹲', sets:4, reps:'10', weight:'14kg', completed:[true,true,true,true], quality:'良好', notes:'膝內夾改善，最後一組稍有代償' },
      { exerciseId:'E031', name:'啞鈴羅馬尼亞硬舉', sets:4, reps:'10', weight:'12kg*2', completed:[true,true,true,true], quality:'優秀', notes:'' },
      { exerciseId:'E033', name:'單臂啞鈴划船', sets:3, reps:'12', weight:'14kg', completed:[true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'狀態良好',
    coachNotes:'深蹲品質持續進步，膝內夾現象減少。下次可嘗試增加重量至16kg。Clam Shell 左側較弱，需持續加強。',
    nextSuggestion:'深蹲嘗試16kg，加入保加利亞分腿蹲測試單腳穩定'
  },
  {
    id:'LOG-20260319-S001', studentId:'S001', date:'2026-03-19',
    sessionType:'肌力訓練',
    exercises:[
      { exerciseId:'E004', name:'貓牛式', sets:2, reps:'10', weight:'-', completed:[true,true], quality:'良好', notes:'' },
      { exerciseId:'E021', name:'Dead Bug', sets:3, reps:'10', weight:'-', completed:[true,true,true], quality:'良好', notes:'' },
      { exerciseId:'E030', name:'高腳杯深蹲', sets:4, reps:'10', weight:'12kg', completed:[true,true,true,true], quality:'尚可', notes:'第3-4組膝蓋有內夾' },
      { exerciseId:'E034', name:'啞鈴臥推', sets:4, reps:'10', weight:'10kg*2', completed:[true,true,true,true], quality:'良好', notes:'' },
      { exerciseId:'E038', name:'面拉（Face Pull）', sets:3, reps:'15', weight:'#3', completed:[true,true,true], quality:'優秀', notes:'' },
    ],
    conditionNotes:'前一天加班，稍有疲勞',
    coachNotes:'深蹲第3-4組膝內夾，加入Clam Shell強化臀中肌。整體肌力有進步。',
    nextSuggestion:'加入Clam Shell暖身，深蹲嘗試14kg'
  },
  // 李美玲
  {
    id:'LOG-20260321-S002', studentId:'S002', date:'2026-03-21',
    sessionType:'矯正訓練',
    exercises:[
      { exerciseId:'E004', name:'貓牛式', sets:2, reps:'10', weight:'-', completed:[true,true], quality:'良好', notes:'呼吸配合改善' },
      { exerciseId:'E021', name:'Dead Bug', sets:3, reps:'10', weight:'-', completed:[true,true,true], quality:'尚可', notes:'第3組腰椎有些微離地' },
      { exerciseId:'E022', name:'Bird Dog', sets:3, reps:'10/側', weight:'-', completed:[true,true,true], quality:'良好', notes:'' },
      { exerciseId:'E026', name:'髖屈肌伸展+啟動', sets:2, reps:'30秒/側', weight:'-', completed:[true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'下背今天感覺還好',
    coachNotes:'Dead Bug第3組腹橫肌控制不足導致腰椎代償，需退階到屈膝版本直到穩定。整體進步中。',
    nextSuggestion:'Dead Bug暫退階至屈膝版，加入呼吸訓練強化核心啟動'
  },
  // 陳大偉
  {
    id:'LOG-20260322-S003', studentId:'S003', date:'2026-03-22',
    sessionType:'肌力訓練',
    exercises:[
      { exerciseId:'E005', name:'世界最偉大伸展', sets:2, reps:'5/側', weight:'-', completed:[true,true], quality:'優秀', notes:'' },
      { exerciseId:'E032', name:'保加利亞分腿蹲', sets:4, reps:'10/腳', weight:'16kg*2', completed:[true,true,true,true], quality:'優秀', notes:'' },
      { exerciseId:'E036', name:'臀推（Hip Thrust）', sets:4, reps:'12', weight:'80kg', completed:[true,true,true,true], quality:'優秀', notes:'' },
      { exerciseId:'E033', name:'單臂啞鈴划船', sets:3, reps:'12', weight:'20kg', completed:[true,true,true], quality:'良好', notes:'' },
      { exerciseId:'E037', name:'農夫走路', sets:3, reps:'40步', weight:'24kg*2', completed:[true,true,true], quality:'優秀', notes:'' },
    ],
    conditionNotes:'狀態極佳，昨天沒有比賽',
    coachNotes:'所有動作品質優秀。分腿蹲可考慮增加至18kg。週六有比賽，注意恢復。',
    nextSuggestion:'分腿蹲增重至18kg，加入爆發力訓練（藥球擲丟）'
  },
];

// Today's schedule mock
const TODAY_SCHEDULE = [
  { time:'09:00', period:'AM', studentId:'S003', type:'肌力訓練', status:'pending' },
  { time:'10:30', period:'AM', studentId:'S001', type:'混合訓練', status:'pending' },
  { time:'14:00', period:'PM', studentId:'S002', type:'矯正訓練', status:'pending' },
  { time:'15:30', period:'PM', studentId:'S004', type:'矯正訓練', status:'pending' },
  { time:'17:00', period:'PM', studentId:'S005', type:'肌力訓練', status:'pending' },
  { time:'18:30', period:'PM', studentId:'S001', type:'肌力訓練', status:'pending' },
];

// ============================================
// Data Access Functions
// ============================================
const DB = {
  _key: 'coach_prep_app',

  _load() {
    const raw = localStorage.getItem(this._key);
    if (raw) return JSON.parse(raw);
    // Initialize with mock data
    const data = { students: MOCK_STUDENTS, sessions: MOCK_SESSIONS, exercises: EXERCISE_LIBRARY, schedule: TODAY_SCHEDULE };
    this._save(data);
    return data;
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  getStudents() { return this._load().students; },
  getStudent(id) { return this.getStudents().find(s => s.id === id); },

  saveStudent(student) {
    const data = this._load();
    const idx = data.students.findIndex(s => s.id === student.id);
    if (idx >= 0) data.students[idx] = student;
    else {
      student.id = 'S' + String(data.students.length + 1).padStart(3, '0');
      student.avatarColor = AVATAR_COLORS[data.students.length % AVATAR_COLORS.length];
      student.totalSessions = student.totalSessions || 0;
      data.students.push(student);
    }
    this._save(data);
    return student;
  },

  getSessions(studentId) {
    return this._load().sessions
      .filter(s => !studentId || s.studentId === studentId)
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  getSession(id) { return this._load().sessions.find(s => s.id === id); },

  saveSession(session) {
    const data = this._load();
    if (!session.id) {
      session.id = `LOG-${session.date.replace(/-/g, '')}-${session.studentId}`;
    }
    const idx = data.sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) data.sessions[idx] = session;
    else data.sessions.push(session);
    // Update student total sessions
    const student = data.students.find(s => s.id === session.studentId);
    if (student && idx < 0) student.totalSessions = (student.totalSessions || 0) + 1;
    this._save(data);
    return session;
  },

  getExercises(category) {
    const exs = this._load().exercises;
    return category && category !== '全部' ? exs.filter(e => e.category === category) : exs;
  },

  saveExercise(exercise) {
    const data = this._load();
    if (!exercise.id) exercise.id = 'E' + String(data.exercises.length + 100).padStart(3, '0');
    const idx = data.exercises.findIndex(e => e.id === exercise.id);
    if (idx >= 0) data.exercises[idx] = exercise;
    else data.exercises.push(exercise);
    this._save(data);
    return exercise;
  },

  getSchedule() { return this._load().schedule; },

  resetData() {
    localStorage.removeItem(this._key);
    this._load();
  }
};
