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
  // ── 真實學員 ──
  {
    id:'R001', name:'陳奕銘', age:null, phone:'0937-827-299',
    goals:'右手高爾夫球肘改善、體態強壯',
    medicalHistory:'右手高爾夫球肘',
    nktFindings:'雙側肩胛骨缺乏後傾能力，下斜方肌代償前鋸肌；上肢神經（腋神經、正中神經、尺神經、橈神經）持續追蹤',
    currentPhase:'矯正期',
    totalSessions: 2,
    notes:'',
    avatarColor: AVATAR_COLORS[0]
  },
  {
    id:'R002', name:'胡懷云', age:null, phone:'0976-302-078',
    goals:'產後腰椎恢復、強化、疼痛及無力狀況改善',
    medicalHistory:'產後恢復中',
    nktFindings:'Rt.腰方肌無力；胸椎第8節缺乏加壓靠近；左側肩胛缺乏後傾（下斜方肌代償前鋸肌）；左側腋神經：Triceps短頭代償長頭',
    currentPhase:'矯正期',
    totalSessions: 3,
    notes:'',
    avatarColor: AVATAR_COLORS[1]
  },
  {
    id:'R003', name:'陳俞丞', age:null, phone:'',
    goals:'體態強壯、體能強化',
    medicalHistory:'無特殊',
    nktFindings:'右側肩胛：缺乏內收（SA代償中斜方肌）、缺乏後收（下斜方肌代償SA）、缺乏下沉（Lat代償上斜方肌）；左側腋神經Triceps短頭代償長頭；正中神經肘上韌帶、尺神經尺側副韌帶需活化',
    currentPhase:'肌力期',
    totalSessions: 3,
    notes:'',
    avatarColor: AVATAR_COLORS[2]
  },
  {
    id:'R004', name:'朱庭雨', age:null, phone:'0939-297-740',
    goals:'減脂、體態雕塑、翹臀',
    medicalHistory:'薦椎S5疼痛（已轉介合作復健科）',
    nktFindings:'胸椎右側彎能力不足（棘上肌代償Lat）；右側肩胛缺乏內收（Pec.Minor代償Rhomboid）',
    currentPhase:'矯正期',
    totalSessions: 3,
    notes:'薦椎S5持續追蹤中',
    avatarColor: AVATAR_COLORS[3]
  },
  {
    id:'R005', name:'周雅螢', age:null, phone:'0986-207-502',
    goals:'減脂、體態雕塑、翹臀',
    medicalHistory:'無特殊',
    nktFindings:'左側腋神經：Triceps短頭代償長頭；持續進行上下肢複合訓練',
    currentPhase:'肌力期',
    totalSessions: 3,
    notes:'',
    avatarColor: AVATAR_COLORS[4]
  },
  {
    id:'R006', name:'王忠賢', age:null, phone:'0938-361-299',
    goals:'體能改善、自主訓練學習',
    medicalHistory:'L5S1 椎間盤突出（HIVD）',
    nktFindings:'下肢神經夾擠初步評估完成（髂腹股溝、股、閉孔、上下臀、坐骨、脛、腓神經）；左側腋神經Triceps短頭代償長頭',
    currentPhase:'矯正期',
    totalSessions: 2,
    notes:'L5S1 注意腰椎負荷',
    avatarColor: AVATAR_COLORS[5]
  },
  {
    id:'R007', name:'朱國慶', age:null, phone:'0912-393-791',
    goals:'有心臟支架安裝並服用抗凝血劑中、左肩前半脫位及疼痛改善、腰椎椎間盤突出保養',
    medicalHistory:'心臟支架安裝（服用抗凝血劑中）、左肩前半脫位、腰椎椎間盤突出',
    nktFindings:'左側腋神經Triceps短頭代償長頭；正中神經肘上韌帶需活化；左側坐骨神經夾擠（髂肌代償臀大肌）；左側肩胛缺乏後收（Pec.Minor代償Rhomboid）',
    currentPhase:'矯正期',
    totalSessions: 3,
    notes:'心臟支架：訓練強度需謹慎控制，抗凝血劑：避免撞擊受傷',
    avatarColor: AVATAR_COLORS[0]
  },
  {
    id:'R008', name:'曾得瑋', age:null, phone:'',
    goals:'增肌、運動表現',
    medicalHistory:'無特殊',
    nktFindings:'尚未檢測',
    currentPhase:'肌力期',
    totalSessions: 0,
    notes:'',
    avatarColor: AVATAR_COLORS[1]
  },
  {
    id:'R009', name:'哈婷', age:null, phone:'',
    goals:'塑身、體能提升',
    medicalHistory:'無特殊',
    nktFindings:'尚未檢測',
    currentPhase:'矯正期',
    totalSessions: 0,
    notes:'',
    avatarColor: AVATAR_COLORS[2]
  },
  {
    id:'R010', name:'朱浩元', age:null, phone:'',
    goals:'功能性訓練、改善姿勢',
    medicalHistory:'無特殊',
    nktFindings:'尚未檢測',
    currentPhase:'肌力期',
    totalSessions: 0,
    notes:'',
    avatarColor: AVATAR_COLORS[3]
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
  // ── 真實學員訓練紀錄 ──
  // 陳奕銘 R001
  {
    id:'LOG-20260307-R001', studentId:'R001', date:'2026-03-07', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'上肢神經夾擠測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'背肩胛神經、長胸神經、肩胛上神經、腋神經、肌皮神經、正中神經、尺神經、橈神經' },
      { name:'三頭肌長頭下拉（Cable）', sets:2, reps:'8', weight:'10lb（雙邊）', completed:[true,true], quality:'良好', notes:'' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:2, reps:'6', weight:'槓架深蹲架6', completed:[true,true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:4, reps:'6-8', weight:'空手*6下*3組、雙啞鈴5kg*8下*1組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'高腳杯深蹲', sets:0, reps:'-', weight:'-', completed:[], quality:'-', notes:'本次未完成，前面測試花時間' },
    ],
    conditionNotes:'',
    coachNotes:'上肢神經全面測試完成。三頭肌長頭、羅馬尼亞硬舉表現良好，高腳杯深蹲下次補上。',
    nextSuggestion:'補上高腳杯深蹲；持續追蹤上肢神經測試結果'
  },
  {
    id:'LOG-20260321-R001', studentId:'R001', date:'2026-03-21', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉／側彎能力測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'10lb（雙邊）', completed:[true], quality:'良好', notes:'' },
      { name:'Cable坐姿划船', sets:3, reps:'8', weight:'42lb*2組、50lb*1組', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'肩胛骨測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'左右都缺乏肩胛後傾能力，下斜方肌代償前鋸肌' },
      { name:'高腳杯深蹲', sets:4, reps:'6', weight:'空手', completed:[true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'NKT發現雙側肩胛後傾不足（下斜方肌代償前鋸肌），需列入矯正重點。Cable划船進步順利。',
    nextSuggestion:'加入前鋸肌活化訓練；高腳杯深蹲嘗試加重'
  },
  // 胡懷云 R002
  {
    id:'LOG-20260307-R002', studentId:'R002', date:'2026-03-07', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:2, reps:'8', weight:'空手', completed:[true,true], quality:'良好', notes:'' },
      { name:'箱上深蹲（坐姿站起）', sets:2, reps:'3', weight:'-', completed:[true,true], quality:'尚可', notes:'期間發現脊椎左側彎能力不足；NKT test：Rt.腰方肌無力' },
      { name:'負重農夫走路', sets:4, reps:'20步', weight:'空手*2趟、雙手各5kg*2趟', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'10lb（雙邊）', completed:[true], quality:'良好', notes:'NKT test：左側腋神經Triceps短頭代償長頭' },
      { name:'雙啞鈴俯身划船', sets:4, reps:'6-10', weight:'空手*10下*2組、各4kg*6下*2組', completed:[true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'NKT發現Rt.腰方肌無力影響脊椎側彎；左側腋神經代償已確認，後續持續追蹤。',
    nextSuggestion:'加入脊椎旋轉測試；箱上深蹲增加次數'
  },
  {
    id:'LOG-20260314-R002', studentId:'R002', date:'2026-03-14', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'脊椎側彎能力測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'10lb（雙邊）', completed:[true], quality:'良好', notes:'NKT：左側腋神經Triceps短頭代償長頭（持續）' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:3, reps:'6-8', weight:'槓架深蹲架6：8下*1組、6下*2組', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:4, reps:'6-8', weight:'空手8下*2組、雙啞鈴5kg*6下*2組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'單腿羅馬尼亞硬舉（扶架）', sets:2, reps:'5/側', weight:'-', completed:[true,true], quality:'尚可', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'雙側脊椎測試持續追蹤；伏地挺身退階進步，羅馬尼亞硬舉開始負重。',
    nextSuggestion:'單腿RDL增至6下；考慮加入箱上深蹲進階'
  },
  {
    id:'LOG-20260321-R002', studentId:'R002', date:'2026-03-21', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'脊椎側彎能力測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'肩胛骨測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'胸椎第8節缺乏加壓靠近（趴姿Cobra pose呼吸強化）；左側肩胛缺乏後傾（下斜方肌代償前鋸肌）' },
      { name:'單腿羅馬尼亞硬舉（扶架）', sets:2, reps:'6/側', weight:'-', completed:[true,true], quality:'良好', notes:'' },
      { name:'雙啞鈴俯身划船', sets:2, reps:'8', weight:'空手', completed:[true,true], quality:'良好', notes:'' },
      { name:'箱上深蹲', sets:4, reps:'4-6', weight:'坐姿站起6下*1組、高腳杯5kg*4下*3組', completed:[true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'肩胛後傾不足（下斜方肌代償前鋸肌）已找到，與陳奕銘相同模式。胸椎第8節加壓靠近待加強。',
    nextSuggestion:'加入前鋸肌活化；高腳杯深蹲嘗試8kg'
  },
  // 陳俞丞 R003
  {
    id:'LOG-20260307-R003', studentId:'R003', date:'2026-03-07', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:6, reps:'6-10', weight:'空手*10下、空槓20kg*10下、40kg*8下*2組、50kg*6下*2組', completed:[true,true,true,true,true,true], quality:'良好', notes:'' },
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'今日右側肩胛有怪感，全數改為NKT test' },
      { name:'上肢神經夾擠測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'右側肩胛異常感，改做全套神經評估' },
    ],
    conditionNotes:'右側肩胛有怪感',
    coachNotes:'右肩胛異狀，今日課表改為全套NKT評估；羅馬尼亞硬舉在異狀前已完成，表現良好。',
    nextSuggestion:'下次確認肩胛狀況後恢復訓練；加入脊椎側彎測試'
  },
  {
    id:'LOG-20260314-R003', studentId:'R003', date:'2026-03-14', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'脊椎側彎能力測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'15lb（雙邊）', completed:[true], quality:'良好', notes:'NKT：左側腋神經Triceps短頭代償長頭；正中神經肘上韌帶需活化；尺神經尺側副韌帶需活化' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:2, reps:'10', weight:'槓架深蹲架6', completed:[true,true], quality:'良好', notes:'' },
      { name:'高腳杯深蹲', sets:5, reps:'8-10', weight:'空手*10下、啞鈴20kg*8下*4組', completed:[true,true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'高腳杯深蹲20kg品質良好；NKT上肢神經測試多項發現，後續追蹤活化。',
    nextSuggestion:'高腳杯可嘗試更大重量；上肢神經活化後測試伏地挺身進階'
  },
  {
    id:'LOG-20260321-R003', studentId:'R003', date:'2026-03-21', sessionType:'肌力訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'反向捲腹', sets:2, reps:'8', weight:'-', completed:[true,true], quality:'良好', notes:'控制骨盆腰椎規則' },
      { name:'肩胛骨測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'右側：缺乏內收（SA代償中斜方肌）、缺乏後收（下斜方肌代償SA）、缺乏下沉（Lat代償上斜方肌）' },
      { name:'器材水平划船', sets:3, reps:'8-10', weight:'雙側各10kg*10下*2組、各15kg*8下*1組', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'器材闊背肌下拉', sets:3, reps:'10', weight:'雙側各15kg', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:3, reps:'8', weight:'槓架深蹲架6', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'六角槓硬舉', sets:3, reps:'8', weight:'40kg*1組、70kg*2組', completed:[true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'右側肩胛三項缺陷均已找到；六角槓硬舉70kg表現良好。',
    nextSuggestion:'針對右肩胛設計矯正動作；六角槓嘗試80kg'
  },
  // 朱庭雨 R004
  {
    id:'LOG-20260301-R004', studentId:'R004', date:'2026-03-01', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'Lunge', sets:3, reps:'各8-10下', weight:'空手*各10下、雙啞鈴10kg*各8下*2組', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:4, reps:'10', weight:'空手10下、雙啞鈴10kg*10下*3組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'抱槓深蹲', sets:4, reps:'6-8', weight:'空蹲10下、空槓20kg*8下、35kg*6下*3組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'下肢神經測試（薦椎S5）', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'期間薦椎S5痠，NKT下肢神經測試' },
    ],
    conditionNotes:'薦椎S5痠',
    coachNotes:'訓練表現良好，但薦椎S5出現痠感，已進行NKT下肢神經測試。需持續追蹤。',
    nextSuggestion:'下次以輕負荷保守進行，持續觀察薦椎S5'
  },
  {
    id:'LOG-20260308-R004', studentId:'R004', date:'2026-03-08', sessionType:'NKT評估',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:3, reps:'10', weight:'空手', completed:[true,true,true], quality:'良好', notes:'輕負荷保守進行' },
      { name:'下肢神經測試（薦椎S5）', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'薦椎S5仍痠，NKT下肢神經測試後決定轉介合作復健科' },
    ],
    conditionNotes:'薦椎S5仍痠',
    coachNotes:'薦椎S5持續疼痛，已轉介合作復健科，待復健結果後再規劃訓練方向。',
    nextSuggestion:'等待復健科回覆後再進階；暫以輕量矯正為主'
  },
  {
    id:'LOG-20260322-R004', studentId:'R004', date:'2026-03-22', sessionType:'矯正＋肌力訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'反向捲腹', sets:2, reps:'8', weight:'-', completed:[true,true], quality:'良好', notes:'控制骨盆腰椎規則' },
      { name:'單腿羅馬尼亞硬舉（扶架）', sets:3, reps:'6/側', weight:'-', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'橋式＋Pallof press', sets:1, reps:'8', weight:'Pause@向心、槓片10kg', completed:[true], quality:'良好', notes:'' },
      { name:'器材臀推機', sets:4, reps:'10', weight:'20kg*1組、35kg*3組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'高腳杯深蹲', sets:5, reps:'8-10', weight:'空手*10下*2組、10kg*8下*3組', completed:[true,true,true,true,true], quality:'良好', notes:'' },
      { name:'肩胛骨測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'胸椎右側彎不足（棘上肌代償Lat）；右側肩胛缺乏內收（Pec.Minor代償Rhomboid）' },
      { name:'Cable坐姿划船', sets:4, reps:'10', weight:'50lb', completed:[true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'薦椎S5已無明顯不適',
    coachNotes:'薦椎S5回穩，訓練量全面回升。器材臀推35kg良好，高腳杯深蹲10kg順利。肩胛骨測試發現右側缺陷。',
    nextSuggestion:'臀推嘗試40kg；針對右肩胛缺乏內收設計矯正動作'
  },
  // 周雅螢 R005
  {
    id:'LOG-20260307-R005', studentId:'R005', date:'2026-03-07', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:6, reps:'6-8', weight:'空手*8下*2組、雙啞鈴5kg*8下*2組、7.5kg*6下*2組', completed:[true,true,true,true,true,true], quality:'良好', notes:'' },
      { name:'Lunge', sets:2, reps:'各8下', weight:'空手', completed:[true,true], quality:'良好', notes:'' },
      { name:'器材臀推機', sets:4, reps:'8-10', weight:'20kg*10下*2組、25kg*8下*2組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'5lb（雙邊）', completed:[true], quality:'良好', notes:'NKT：左側腋神經Triceps短頭代償長頭' },
      { name:'三頭肌短頭下拉（Cable）', sets:3, reps:'10', weight:'20lb', completed:[true,true,true], quality:'良好', notes:'偏簡單' },
    ],
    conditionNotes:'',
    coachNotes:'下肢訓練表現良好，RDL漸進到7.5kg。NKT發現左側腋神經Triceps短頭代償長頭。',
    nextSuggestion:'RDL嘗試10kg；臀推增重至28kg；繼續追蹤左側腋神經'
  },
  {
    id:'LOG-20260314-R005', studentId:'R005', date:'2026-03-14', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'10lb（雙邊）', completed:[true], quality:'良好', notes:'' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:3, reps:'4-6', weight:'槓架深蹲架6：6下*3組（稍無力，實際6,5,4下）', completed:[true,true,true], quality:'尚可', notes:'稍嫌無力' },
      { name:'Chin up（+band）', sets:3, reps:'1', weight:'彈力帶@肩胛骨下方', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'雙槓片俯身划船', sets:4, reps:'8-10', weight:'空手*10下、雙5kg*8下*3組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:4, reps:'6-8', weight:'空手10下、雙啞鈴7.5kg*8下*1組&6下*2組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'高腳杯深蹲', sets:5, reps:'6-10', weight:'空手*10下*1組、10kg*8下*2組、15kg*6下*2組', completed:[true,true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'引體向上+彈力帶首次完成，Chin up值得繼續練習。高腳杯深蹲15kg順利完成。',
    nextSuggestion:'Chin up嘗試2下；高腳杯深蹲嘗試18kg'
  },
  {
    id:'LOG-20260321-R005', studentId:'R005', date:'2026-03-21', sessionType:'肌力訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'反向捲腹', sets:2, reps:'8', weight:'-', completed:[true,true], quality:'良好', notes:'控制骨盆腰椎規則' },
      { name:'單腿羅馬尼亞硬舉（扶架）', sets:3, reps:'6/側', weight:'-', completed:[true,true,true], quality:'尚可', notes:'右腳在前較難' },
      { name:'羅馬尼亞硬舉', sets:5, reps:'8-10', weight:'空手*8下*2組、水管*10下、女槓15kg*8下*2組', completed:[true,true,true,true,true], quality:'良好', notes:'' },
      { name:'傳統硬舉（架高）', sets:4, reps:'4-6', weight:'@瑜珈磚：25kg*6下*2組、30kg*5→4下（第二組掉力）', completed:[true,true,true,true], quality:'尚可', notes:'第二組只完成4下' },
      { name:'器材臀推機', sets:4, reps:'10', weight:'20kg*1組、30kg*3組', completed:[true,true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'傳統硬舉30kg第二組掉力，女槓RDL15kg穩定。臀推30kg順利。單腿RDL右腳在前仍較困難。',
    nextSuggestion:'傳統硬舉保持30kg鞏固；臀推嘗試35kg；持續訓練單腿RDL平衡'
  },
  // 王忠賢 R006
  {
    id:'LOG-20260307-R006', studentId:'R006', date:'2026-03-07', sessionType:'NKT評估',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'下肢神經夾擠測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'髂腹股溝神經、股神經、閉孔神經、上臀神經、下臀神經、坐骨神經、脛神經、腓神經' },
    ],
    conditionNotes:'L5S1 HIVD症狀評估',
    coachNotes:'第一堂以完整下肢神經夾擠評估為主；L5S1相關神經全面測試。',
    nextSuggestion:'下次開始加入基礎動作：仰臥腰椎控制呼吸、RDL、高腳杯深蹲'
  },
  {
    id:'LOG-20260314-R006', studentId:'R006', date:'2026-03-14', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'羅馬尼亞硬舉', sets:4, reps:'6', weight:'空手*6下*2組、雙啞鈴7.5kg*6下*2組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'高腳杯深蹲', sets:5, reps:'6-8', weight:'空手*8下*2組、7.5kg*6下*3組', completed:[true,true,true,true,true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'10', weight:'10lb（雙邊）', completed:[true], quality:'良好', notes:'NKT：左側腋神經Triceps短頭代償長頭' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:3, reps:'6', weight:'槓架深蹲架6', completed:[true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'基礎動作順利展開；RDL7.5kg、高腳杯7.5kg皆表現良好。左側腋神經代償確認。',
    nextSuggestion:'RDL嘗試10kg；高腳杯嘗試10kg；持續追蹤L5S1症狀'
  },
  // 朱國慶 R007
  {
    id:'LOG-20260228-R007', studentId:'R007', date:'2026-02-28', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'脊椎旋轉測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'' },
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:4, reps:'4-6', weight:'空手*6下*2組、雙啞鈴5kg*4下*2組', completed:[true,true,true,true], quality:'良好', notes:'' },
      { name:'高腳杯深蹲', sets:4, reps:'2-8', weight:'空手*8下, 6下, 4下, 2下（遞減）', completed:[true,true,true,true], quality:'尚可', notes:'體力遞減明顯' },
      { name:'上肢神經測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'心臟支架病史，謹慎評估' },
    ],
    conditionNotes:'心臟支架，服用抗凝血劑',
    coachNotes:'初次評估完成，心臟病史下保守進行。深蹲次數隨組遞減，體力耐力需訓練。',
    nextSuggestion:'下次加入Lunge；深蹲次數穩定在6下再增加組數'
  },
  {
    id:'LOG-20260307-R007', studentId:'R007', date:'2026-03-07', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:5, reps:'4-6', weight:'空手*6下*2組、水管*6下*1組、雙啞鈴5kg*6下, 4下', completed:[true,true,true,true,true], quality:'良好', notes:'最後一組只完成4下' },
      { name:'Lunge（扶架）', sets:2, reps:'6/側', weight:'空手＋扶槓', completed:[true,true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'15lb（雙邊）', completed:[true], quality:'良好', notes:'NKT：左側腋神經Triceps短頭代償長頭；正中神經肘上韌帶需放鬆' },
      { name:'伏地挺身（退階／扶槓鈴）', sets:3, reps:'6', weight:'槓架深蹲架6', completed:[true,true,true], quality:'良好', notes:'' },
    ],
    conditionNotes:'',
    coachNotes:'Lunge首次加入，扶架輔助下完成順利。NKT發現正中神經肘上韌帶需放鬆。',
    nextSuggestion:'Lunge嘗試空手不扶架；RDL嘗試雙啞鈴5kg全程完成6下'
  },
  {
    id:'LOG-20260314-R007', studentId:'R007', date:'2026-03-14', sessionType:'NKT評估＋訓練',
    exercises:[
      { name:'仰臥腰椎控制呼吸（骨盆規則建立）', sets:1, reps:'數次', weight:'-', completed:[true], quality:'良好', notes:'' },
      { name:'羅馬尼亞硬舉', sets:3, reps:'6-10', weight:'空手10下、雙啞鈴7.5kg*6下*2組', completed:[true,true,true], quality:'良好', notes:'' },
      { name:'單腿羅馬尼亞硬舉（扶架）', sets:2, reps:'3/側', weight:'-', completed:[true,true], quality:'尚可', notes:'左腳在前卡住；NKT：左側坐骨神經夾擠，髂肌代償臀大肌' },
      { name:'高腳杯深蹲', sets:6, reps:'6-10', weight:'空手*10下*1組、7.5kg*10下*2組、12.5kg*6下*3組', completed:[true,true,true,true,true,true], quality:'良好', notes:'' },
      { name:'三頭肌長頭下拉（Cable）', sets:1, reps:'8', weight:'5lb（雙邊）', completed:[true], quality:'良好', notes:'NKT：正中神經肘上韌帶需活化' },
      { name:'肩胛骨測試', sets:1, reps:'測試', weight:'-', completed:[true], quality:'完成', notes:'左側缺肩胛後收能力，Pec.Minor代償Rhomboid' },
    ],
    conditionNotes:'',
    coachNotes:'高腳杯12.5kg順利完成；NKT發現左側坐骨神經夾擠（髂肌代償臀大肌）及左肩胛後收不足。需列入矯正重點。',
    nextSuggestion:'針對左坐骨神經夾擠設計矯正；高腳杯嘗試14kg；加入臀大肌活化動作'
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

// ============================================
// Data Layer — Firestore + In-memory Cache
// ============================================
const DB = {
  _cache: { students: [], sessions: [], exercises: [], schedule: [] },

  // ── 初始化：從 Firestore 載入資料，設定即時監聽 ──
  async init() {
    try {
      const [studSnap, sesSnap, exSnap] = await Promise.all([
        _fsdb.collection('students').get(),
        _fsdb.collection('sessions').get(),
        _fsdb.collection('exercises').get(),
      ]);

      this._cache.students  = studSnap.docs.map(d => d.data());
      this._cache.sessions  = sesSnap.docs.map(d => d.data());
      this._cache.exercises = exSnap.docs.map(d => d.data());

      // 第一次使用：把預設資料寫入 Firestore
      if (this._cache.students.length === 0) await this._seed();

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
    } catch(e) {
      console.error('Firebase 初始化失敗', e);
    }
  },

  // ── 第一次使用時的種子資料 ──
  async _seed() {
    const writeChunk = async (col, items) => {
      for (let i = 0; i < items.length; i += 400) {
        const batch = _fsdb.batch();
        items.slice(i, i + 400).forEach(item => {
          batch.set(_fsdb.collection(col).doc(item.id), item);
        });
        await batch.commit();
      }
    };
    await writeChunk('students', MOCK_STUDENTS);
    await writeChunk('sessions', MOCK_SESSIONS);
    await writeChunk('exercises', EXERCISE_LIBRARY);
    this._cache.students  = [...MOCK_STUDENTS];
    this._cache.sessions  = [...MOCK_SESSIONS];
    this._cache.exercises = [...EXERCISE_LIBRARY];
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
        _fsdb.collection('students').doc(student.id).set(student);
      }
    }
    _fsdb.collection('sessions').doc(session.id).set(session);
    return session;
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

  // ── 課表（保留介面，由 Google Calendar 填入）──
  getSchedule() {
    return [...this._cache.schedule];
  },
};
