/* ============================================================
   شكّل — Shared JS Utilities
   ============================================================ */

// ── Logo SVG ──────────────────────────────────────────────
const LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="80" height="80" rx="16" fill="#212121"/>
<path d="M26 54 L36 30 L44 38 Z" stroke="#EBC84C" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
<line x1="26" y1="54" x2="22" y2="58" stroke="#EBC84C" stroke-width="1.8" stroke-linecap="round"/>
<line x1="44" y1="38" x2="56" y2="26" stroke="#EBC84C" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="56" cy="26" r="3" stroke="#EBC84C" stroke-width="1.4" fill="none"/>
<circle cx="56" cy="26" r="1" fill="#EBC84C"/>
<circle cx="36" cy="30" r="3" stroke="#EBC84C" stroke-width="1.4" fill="none"/>
</svg>`;

// ── State Management ──────────────────────────────────────
const VERSION = '4.0';
function loadState() {
  try {
    var v = localStorage.getItem('sh_version');
    if (v !== VERSION) {
      var user = localStorage.getItem('sh_user');
      localStorage.clear();
      if (user) localStorage.setItem('sh_user', user);
      localStorage.setItem('sh_version', VERSION);
    }
  } catch(e) {}
}

function getUser() {
  try { return JSON.parse(localStorage.getItem('sh_user') || 'null'); } catch(e) { return null; }
}
function setUser(u) { localStorage.setItem('sh_user', JSON.stringify(u)); }

function getUserState() {
  try {
    return JSON.parse(localStorage.getItem('sh_state') || 'null') || {
      xp: 0, level: 1, streak: 0, aiCredits: 50, maxCredits: 50,
      completedLessons: [], quizScores: {}, enrolledCourses: ['dt'],
      earnedBadges: [], projects: [], lastActive: null
    };
  } catch(e) { return null; }
}
function saveUserState(s) { localStorage.setItem('sh_state', JSON.stringify(s)); }

// ── XP & Levels ──────────────────────────────────────────
var LEVELS = [
  {n:1, label:'مستكشف', icon:'🔍', xp:0},
  {n:2, label:'متعلم',   icon:'📚', xp:500},
  {n:3, label:'صانع',   icon:'🛠️', xp:1500},
  {n:4, label:'مصمم',   icon:'✏️', xp:3000},
  {n:5, label:'مبتكر',  icon:'💡', xp:6000},
  {n:6, label:'رائد',   icon:'🚀', xp:10000},
  {n:7, label:'خبير',   icon:'🏆', xp:20000}
];

function getLevelFromXP(xp) {
  var level = LEVELS[0];
  for (var i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) level = LEVELS[i];
  }
  return level;
}

function getXPToNext(xp) {
  var cur = getLevelFromXP(xp);
  var next = LEVELS.find(function(l){ return l.n === cur.n + 1; });
  if (!next) return { pct: 100, remaining: 0, nextLabel: null };
  var pct = Math.round((xp - cur.xp) / (next.xp - cur.xp) * 100);
  return { pct: pct, remaining: next.xp - xp, nextLabel: next.label, nextXP: next.xp };
}

function addXP(amount) {
  var s = getUserState();
  var oldLevel = getLevelFromXP(s.xp);
  s.xp += amount;
  var newLevel = getLevelFromXP(s.xp);
  s.level = newLevel.n;
  saveUserState(s);
  if (newLevel.n > oldLevel.n) {
    showToast('🎉 ترقية! أصبحت ' + newLevel.icon + ' ' + newLevel.label);
  }
  return s;
}

// ── Arabic numerals ──────────────────────────────────────
function toAr(n) {
  return String(n).replace(/\d/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'[d]; });
}

// ── Toast ─────────────────────────────────────────────────
var _toastTimer;
function showToast(msg, type) {
  var el = document.getElementById('toast');
  if (!el) return;
  var msgEl = document.getElementById('toast-msg');
  if (msgEl) msgEl.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ el.className = 'toast'; }, 3000);
}

// ── Modal helpers ─────────────────────────────────────────
function openModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ── Tab switching ─────────────────────────────────────────
function switchTab(tabId, panelId, groupClass) {
  document.querySelectorAll('.' + (groupClass || 'tab-btn')).forEach(function(b){
    b.classList.remove('active');
  });
  document.querySelectorAll('.tab-panel').forEach(function(p){
    p.classList.remove('active');
  });
  var tab = document.getElementById(tabId);
  var panel = document.getElementById(panelId);
  if (tab) tab.classList.add('active');
  if (panel) panel.classList.add('active');
}

// ── AI Local QA Cache ─────────────────────────────────────
var LOCAL_QA = [
  {keys:['تعاطف','empathy','مستخدم','احتياج','فهم'],a:'التعاطف هو فهم المستخدم عمقاً — ما يقوله، يفكر فيه، يشعر به، ويفعله. استخدم خريطة التعاطف لتنظيم ما تجمعه من مقابلات وملاحظات. 🔍'},
  {keys:['hmw','كيف يمكننا','مشكلة','صياغة','define'],a:'سؤال HMW الجيد: واسع بما يكفي للإبداع، وضيق بما يكفي للتركيز. اكتب 10 أسئلة HMW من نفس الملاحظة واختر الأفضل. 🎯'},
  {keys:['عصف','أفكار','brainstorm','ideate','إبداع','scamper'],a:'قواعد العصف الذهني: ١) الكمية قبل الجودة ٢) لا نقد أثناء الجلسة ٣) أفكار جريئة مرحّب بها ٤) ابنِ على أفكار الآخرين. جرّب SCAMPER لتوليد أفكار جديدة. 💡'},
  {keys:['نموذج','prototype','اختبار','test','بناء'],a:'النموذج الأولي هو أسرع وأرخص طريقة لاختبار فكرتك. ابنِ بورق أو كرتون أولاً، لا تحتاج تقنية عالية. القاعدة: ابنِ بسرعة، اختبر مبكراً. 🛠️'},
  {keys:['fusion','360','cad','تصميم','ثلاثي','sketch'],a:'في Fusion 360: ابدأ بـ New Sketch، ارسم مقطعك، ثم Extrude لتحويله لجسم ثلاثي الأبعاد. استخدم Constraints لإبقاء التصميم ذكياً.'},
  {keys:['طباعة','3d','pla','filament','cura','slicing'],a:'للمبتدئين: Layer Height 0.2mm، Infill 20%، Temp 200°C مع PLA. استخدم Cura كـ Slicer — هو الأسهل. ابدأ بنموذج صغير للاختبار. 🖨️'},
  {keys:['ليزر','laser','قطع','نقش','co2','svg'],a:'خطوط حمراء = قطع | ملء أزرق = نقش. جرّب بأعلى سرعة وأقل طاقة أولاً لتجنب الحرق. تجنّب PVC — يُطلق غازات سامة. 🔆'},
  {keys:['arduino','برمجة','led','sensor','إلكترونيات'],a:'أول مشروع: LED Blink — هو "Hello World" للإلكترونيات. digitalWrite(13, HIGH); delay(1000); digitalWrite(13, LOW); delay(1000); 💡'},
  {keys:['مستوى','xp','شارة','badge','نقاط','level'],a:'تكسب XP من: إكمال الدروس (+50)، تقديم القوالب (+25)، اجتياز التقييم (+75)، إكمال المرحلة (+150). كل 1000 XP = مستوى جديد. ⚡'},
  {keys:['pov','وجهة نظر','insight','استنتاج'],a:'صيغة POV: [المستخدم] يحتاج إلى [الحاجة] لأن [الاستنتاج المفاجئ]. الجزء الأخير هو الإبداعي — اكتشف السبب الحقيقي وليس الظاهري. 📌'},
  {keys:['مشروع','project','فكرة','idea','مشكلة','problem'],a:'ابدأ مشروعاً بالضغط على "مشروع جديد" من لوحة التحكم. ستدخل مرحلة التعاطف أولاً، وستكمل المراحل تباعاً حتى تصل لنموذج قابل للاختبار.'},
  {keys:['قالب','template','نموذج','ملء','تعبئة'],a:'القوالب متوفرة في كل مرحلة من مراحل التفكير التصميمي. اضغط على القالب، املأه، واضغط "تقديم" لإكمال المتطلبات. يحفظ تلقائياً أثناء الكتابة. 📋'},
  {keys:['تقييم','quiz','assessment','اختبار','درجة','90'],a:'تحتاج 90% أو أعلى لفتح المرحلة التالية. يمكنك إعادة المحاولة كم مرة تريد. إذا أخفقت، راجع محتوى المرحلة وحاول مجدداً. 📝'},
  {keys:['مرشد','mentor','جلسة','session','سؤال'],a:'من صفحة المرشدين، يمكنك إرسال سؤال مباشر أو حجز جلسة. سيرد المرشد خلال 24-48 ساعة. 🧑‍🏫'},
  {keys:['مجتمع','community','منشور','نقاش','سؤال'],a:'في صفحة المجتمع، يمكنك طرح سؤال أو مشاركة تقدمك مع المتعلمين الآخرين. صنّف منشورك حسب المرحلة ليصل للمهتمين. 💬'},
  {keys:['رصيد','credit','ai','ذكاء','محادثة'],a:'رصيد AI يُستخدم عند السؤال عن موضوع غير موجود في قاعدة الأسئلة المحلية. تحصل على 50 رسالة عند التسجيل في كل دورة. 🔋'},
  {keys:['iterate','تكرار','تحسين','نتائج','تطوير'],a:'مرحلة التكرار هي قلب التفكير التصميمي. بناءً على نتائج الاختبار، عدّل نموذجك وأعد الاختبار. كل دورة تجعل حلّك أفضل. 🔄'},
  {keys:['cnc','تفريز','router','gcode','خشب','ألومنيوم'],a:'CNC Router يعمل في 3 محاور X,Y,Z. يقرأ G-code لتحديد المسار. الفرق عن الليزر: CNC يقطع بعمق حقيقي ويعمل على الخشب السميك والمعادن. ⚙️'}
];

function getLocalAnswer(question) {
  var q = question.toLowerCase();
  var words = q.split(/\s+/);
  var best = null, bestScore = 0;
  LOCAL_QA.forEach(function(item) {
    var score = 0;
    item.keys.forEach(function(key) {
      if (q.includes(key.toLowerCase())) score += 2;
      words.forEach(function(w) { if (w.length > 2 && key.toLowerCase().includes(w)) score += 1; });
    });
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return bestScore >= 2 ? best : null;
}

// ── Stage hints per DT phase ─────────────────────────────
var STAGE_HINTS = {
  empathy: ['💡 تلميح: لا تفترض — اذهب للميدان وتحدث مع المستخدمين الحقيقيين.','🔍 الملاحظة الصامتة غالباً تكشف أكثر من المقابلة المباشرة.','📝 سجّل ما تراه حرفياً في عمود، والتفسير في عمود آخر.'],
  define: ['🎯 سؤال HMW الجيد يُنتج 10-20 فكرة مختلفة — إذا كان لديك حل واحد واضح، السؤال ضيق جداً.','✏️ اكتب 5 أسئلة HMW من نفس الملاحظة ثم اختر الأفضل.','💬 POV يجب أن يُفاجئك — إذا كان الاستنتاج واضحاً، احفر أعمق.'],
  ideate: ['💡 لا نقد في جلسة العصف الذهني — حتى الأفكار الجريئة مرحّب بها.','🚀 ابدأ بأكثر فكرة جنونية تخطر ببالك — هذا يحرر الإبداع.','⚡ جرّب SCAMPER: استبدل، ادمج، كيّف، عدّل، استخدم لأغراض أخرى.'],
  prototype: ['🛠️ ابنِ بأرخص المواد أولاً — الورق والكرتون كافيان لاختبار معظم الأفكار.','⏱️ أعطِ نفسك ساعة واحدة فقط لبناء النموذج — القيود تحفز الإبداع.','📐 النموذج الأولي ليس النتيجة النهائية — هو أداة تعلّم فقط.'],
  test: ['👀 راقب ولا تتدخل — دع المستخدم يتعامل مع النموذج بنفسه.','❓ اسأل "لماذا؟" ثلاث مرات على الأقل لكل ردّ فعل.','📊 اختبر مع 3-5 مستخدمين على الأقل لاكتشاف الأنماط.'],
  iterate: ['🔄 كل اختبار يُعلّمك شيئاً — حتى الفشل معلومة قيّمة.','📈 وثّق التغييرات بوضوح: ما الذي عدّلته ولماذا؟','✅ التكرار لا يعني إعادة البناء من الصفر — أحياناً تعديل صغير يكفي.']
};

function getStageHint(stage) {
  var hints = STAGE_HINTS[stage] || [];
  return hints.length ? hints[Math.floor(Math.random() * hints.length)] : null;
}

// ── DT Stages Data ────────────────────────────────────────
var DT_STAGES = [
  {id:'empathy',  label:'التعاطف',        icon:'🔍', color:'#E3F2FD', xp:150},
  {id:'define',   label:'تحديد المشكلة', icon:'🎯', color:'#FFF3E0', xp:150},
  {id:'ideate',   label:'توليد الأفكار', icon:'💡', color:'#F3E5F5', xp:150},
  {id:'prototype',label:'النمذجة',        icon:'🛠️', color:'#E8F5E9', xp:200},
  {id:'test',     label:'الاختبار',       icon:'🧪', color:'#FFF8E1', xp:200},
  {id:'iterate',  label:'التكرار',        icon:'🔄', color:'#FCE4EC', xp:250}
];

// ── Courses Data ──────────────────────────────────────────
var COURSES = [
  {id:'dt',    title:'التفكير التصميمي',      icon:'🧠', price:0,   free:true,  credits:50, category:'design',      level:'مبتدئ', duration:'٨ ساعات', lessons:7,  desc:'مسار كامل عبر المراحل الخمس بمنهج d.school', badge:'🗺️ مصمم مفكّر'},
  {id:'cad',   title:'Fusion 360 للمبتدئين', icon:'🖥️', price:149, free:false, credits:40, category:'fabrication', level:'مبتدئ', duration:'٦ ساعات', lessons:5,  desc:'من الصفر إلى تصميم قطع ثلاثية الأبعاد', badge:'⚙️ مهندس CAD'},
  {id:'3dp',   title:'الطباعة ثلاثية الأبعاد',icon:'🖨️', price:119, free:false, credits:30, category:'fabrication', level:'مبتدئ', duration:'٥ ساعات', lessons:4,  desc:'إعداد الطابعة، اختيار المواد، وطباعة أول نموذج', badge:'🖨️ طابع ثلاثي'},
  {id:'laser', title:'قطع الليزر',            icon:'🔆', price:119, free:false, credits:30, category:'fabrication', level:'مبتدئ', duration:'٤ ساعات', lessons:3,  desc:'أساسيات القطع والنقش بالليزر للمبتدئين', badge:'🔆 ليزر'},
  {id:'ux',    title:'UX/UI Design',           icon:'📱', price:179, free:false, credits:50, category:'design',      level:'متوسط', duration:'١٠ ساعات',lessons:8,  desc:'تصميم تجربة المستخدم من البحث إلى النموذج', badge:'📱 مصمم UX'},
  {id:'elec',  title:'الإلكترونيات وArduino', icon:'💡', price:149, free:false, credits:40, category:'fabrication', level:'مبتدئ', duration:'٦ ساعات', lessons:5,  desc:'برمجة الإلكترونيات من الصفر مع مشاريع عملية', badge:'💡 صانع إلكتروني'},
  {id:'cnc',   title:'تصنيع CNC',              icon:'⚙️', price:119, free:false, credits:30, category:'fabrication', level:'متوسط', duration:'٤ ساعات', lessons:3,  desc:'مبادئ التفريز CNC وبرمجة G-code', badge:'⚙️ مصنّع CNC'}
];

// ── Mentors Data ──────────────────────────────────────────
var MENTORS = [
  {id:'m1', name:'د. سارة الأحمد',   title:'خبيرة التفكير التصميمي', bio:'١٠ سنوات خبرة مع IDEO وSAP. حاصلة على شهادة d.school من ستانفورد. تساعد الفرق على تحويل مشاكلهم لفرص تصميمية.',         specs:['التعاطف','HMW','ورش العمل','POV'], av:'سا', color:'#EBC84C', available:true,  rating:4.9, sessions:47, responseTime:'٢٤ ساعة'},
  {id:'m2', name:'م. خالد المنصور',  title:'مهندس تصنيع رقمي',       bio:'مهندس ميكانيكي يدير Fab Lab في عمّان منذ ٦ سنوات. درّب أكثر من ٥٠٠ شخص على الطباعة ثلاثية الأبعاد والـ CNC.',        specs:['Fusion 360','طباعة ثلاثية','CNC'], av:'خا', color:'#1565C0', available:true,  rating:4.8, sessions:89, responseTime:'٣٦ ساعة'},
  {id:'m3', name:'أ. نورة السالم',   title:'مصممة منتجات ورائدة',     bio:'مصممة بخبرة ٨ سنوات. أسّست شركتها باستخدام Design Thinking. متخصصة في UX وإطلاق المنتجات.',                           specs:['النمذجة','UX Design','Lean Startup'], av:'نو', color:'#2E7D32', available:true,  rating:5.0, sessions:63, responseTime:'٤٨ ساعة'},
  {id:'m4', name:'م. أحمد الزهراني', title:'مهندس إلكترونيات وـ IoT',  bio:'مهندس كهربائي متخصص في Arduino وRaspberry Pi. يُصمّم مشاريع IoT تجمع بين التصنيع والبرمجة.',                         specs:['Arduino','Electronics','IoT'],       av:'أح', color:'#6A1B9A', available:false, rating:4.7, sessions:34, responseTime:'٧٢ ساعة'}
];

// ── Community seed posts ──────────────────────────────────
var SEED_POSTS = [
  {id:'s1', title:'ما الفرق الحقيقي بين التعاطف والتعاطف الفكري؟', body:'أحاول فهم الفرق في سياق التفكير التصميمي مع مثال عملي.', tag:'التعاطف', author:'سارة م.', date:Date.now()-86400000*3, votes:12, solved:true,  replies:[{author:'فريق شكّل', text:'التعاطف = تضع نفسك مكان المستخدم وتشعر بما يشعر. التعاطف الفكري = تفهم موقفه من بُعد. في التصميم نحتاج الأول — اذهب للميدان وعاش التجربة معهم.'}]},
  {id:'s2', title:'كيف أكتب سؤال HMW جيد؟', body:'كلما حاولت يكون ضيقاً جداً أو واسعاً جداً.', tag:'تحديد المشكلة', author:'خالد ع.', date:Date.now()-86400000*2, votes:8,  solved:true,  replies:[{author:'فريق شكّل', text:'الاختبار: إذا كان الجواب حلاً واحداً = ضيق. إذا كان "كل شيء" = واسع. السؤال الجيد يُنتج ١٠-٢٠ فكرة مختلفة.'}]},
  {id:'s3', title:'هل يمكن تطبيق التفكير التصميمي منفرداً دون فريق؟', body:'أنا طالب وليس عندي فريق للعمل معاً.', tag:'عام', author:'نورة س.', date:Date.now()-86400000, votes:15, solved:false, replies:[]},
  {id:'s4', title:'ما أفضل برنامج Slicer للمبتدئين؟', body:'سمعت عن Cura وPrusaSlicer وChitubox — أيهم أنصح به؟', tag:'عام', author:'أحمد ز.', date:Date.now()-86400000*5, votes:6, solved:true, replies:[{author:'فريق شكّل', text:'للمبتدئين: Cura هو الأفضل — واجهة بسيطة وإعدادات تلقائية ممتازة.'}]},
  {id:'s5', title:'شاركوا مشاريعكم — من طبّق DT على مشكلة حقيقية؟', body:'نريد نسمع تجاربكم! شاركنا المشكلة والنتيجة.', tag:'عام', author:'فريق شكّل', date:Date.now()-86400000*7, votes:20, solved:false, replies:[]},
  {id:'s6', title:'نصائح لجلسة مقابلة ناجحة مع المستخدمين؟', body:'سأجري مقابلات لأول مرة الأسبوع القادم.', tag:'التعاطف', author:'ريم ح.', date:Date.now()-3600000*2, votes:9, solved:false, replies:[{author:'فريق شكّل', text:'١) أسئلة مفتوحة ٢) اصمت واستمع ٣) اسأل لماذا؟ ثلاث مرات ٤) سجّل بالصوت إذا أذنوا.'}]}
];

function getPosts() {
  try {
    var p = JSON.parse(localStorage.getItem('sh_posts') || 'null');
    if (!p || p.length === 0) {
      localStorage.setItem('sh_posts', JSON.stringify(SEED_POSTS));
      return SEED_POSTS;
    }
    return p;
  } catch(e) { return SEED_POSTS; }
}
function savePosts(p) { localStorage.setItem('sh_posts', JSON.stringify(p)); }

// ── Events Data ───────────────────────────────────────────
var EVENTS = [
  {id:'e1', type:'webinar',     title:'وبينار: مقدمة في التفكير التصميمي', date:'2025-07-15', time:'19:00', dur:'٩٠ دقيقة', host:'د. سارة الأحمد', free:true,  price:0,   seats:200, reg:134, platform:'Zoom',           link:'https://eventbrite.com', desc:'جلسة تعريفية مجانية بمنهجية DT.', tags:['مبتدئين','مجاني']},
  {id:'e2', type:'meetup',      title:'لقاء مجتمع شكّل — جدة',             date:'2025-07-22', time:'17:30', dur:'٣ ساعات',  host:'فريق شكّل',      free:true,  price:0,   seats:50,  reg:38,  platform:'Fab Lab جدة',    link:'https://eventbrite.com', desc:'لقاء شهري لمجتمع الصانعين.',       tags:['حضوري','تواصل']},
  {id:'e3', type:'workshop',    title:'ورشة: من الفكرة إلى النموذج',        date:'2025-08-01', time:'10:00', dur:'٦ ساعات',  host:'م. خالد المنصور', free:false, price:150, seats:15,  reg:11,  platform:'Fab Lab الرياض', link:'https://eventbrite.com', desc:'تصمّم وتطبع قطعة في يوم واحد.',    tags:['حضوري','عملي']},
  {id:'e4', type:'webinar',     title:'كيف تبني منتجاً ناجحاً بـ DT',       date:'2025-08-10', time:'20:00', dur:'٦٠ دقيقة', host:'أ. نورة السالم',  free:true,  price:0,   seats:300, reg:198, platform:'Google Meet',    link:'https://eventbrite.com', desc:'قصص نجاح حقيقية من مؤسسين.',       tags:['ريادة','مجاني']},
  {id:'e5', type:'competition', title:'هاكاثون شكّل ٢٠٢٥',                  date:'2025-08-22', time:'09:00', dur:'٤٨ ساعة',  host:'فريق شكّل',      free:true,  price:0,   seats:80,  reg:64,  platform:'هجين',          link:'https://eventbrite.com', desc:'جوائز نقدية لأفضل ٣ فرق.',        tags:['مسابقة','جوائز']},
  {id:'e6', type:'workshop',    title:'ورشة: أساسيات قطع الليزر',            date:'2025-09-05', time:'14:00', dur:'٤ ساعات',  host:'م. أحمد الزهراني',free:false, price:100, seats:12,  reg:5,   platform:'Fab Lab جدة',    link:'https://eventbrite.com', desc:'تعلّم قطع الليزر من الصفر.',       tags:['حضوري','ليزر']}
];

// ── Auth guard ────────────────────────────────────────────
function requireAuth(redirect) {
  var user = getUser();
  if (!user) {
    window.location.href = (redirect || 'index.html') + '?redirect=' + encodeURIComponent(window.location.href);
    return false;
  }
  return true;
}

// ── Render logo anywhere ──────────────────────────────────
function renderLogos() {
  document.querySelectorAll('[data-logo]').forEach(function(el) {
    var size = el.dataset.logo || '36';
    el.innerHTML = LOGO_SVG.replace(/width="36"/g,'width="'+size+'"').replace(/height="36"/g,'height="'+size+'"');
  });
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadState();
  renderLogos();
});
