/* ============================================================
   شكّل — Shared JS v5.0
   Features: User greeting bar, AI chatbot, local QA cache,
             credits system, payment stubs, calendar helper
   ============================================================ */

const LOGO_SVG = `<svg width="36" height="36" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="80" height="80" rx="16" fill="#212121"/>
<path d="M26 54 L36 30 L44 38 Z" stroke="#EBC84C" stroke-width="1.8" fill="none" stroke-linejoin="round"/>
<line x1="26" y1="54" x2="22" y2="58" stroke="#EBC84C" stroke-width="1.8" stroke-linecap="round"/>
<line x1="44" y1="38" x2="56" y2="26" stroke="#EBC84C" stroke-width="1.4" stroke-linecap="round"/>
<circle cx="56" cy="26" r="3" stroke="#EBC84C" stroke-width="1.4" fill="none"/>
<circle cx="56" cy="26" r="1" fill="#EBC84C"/>
<circle cx="36" cy="30" r="3" stroke="#EBC84C" stroke-width="1.4" fill="none"/>
</svg>`;

// ── Version & State ──────────────────────────────────────
var VERSION = '5.0';

// ============================================================
// SUPABASE CONFIGURATION
// Replace these two values with your own from:
// Supabase → Settings → API
// ============================================================
var SUPABASE_URL = 'https://qudwzsmiidpynphhktuv.supabase.co/rest/v1/';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1ZHd6c21paWRweW5waGhrdHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5Mzc4MTUsImV4cCI6MjA5OTUxMzgxNX0.HPlvsHNinMRPusNGcmHWjkUiDoGMwqTtsrGj8mOkqR4';

// ── Supabase API helper ───────────────────────────────────
var _sb_ready = !!(SUPABASE_URL && !SUPABASE_URL.includes('YOUR_PROJECT'));

function sbFetch(method, table, body, filters) {
  if (!_sb_ready) return Promise.resolve(null);
  var url = SUPABASE_URL + '/rest/v1/' + table;
  if (filters) url += '?' + filters;
  var opts = {
    method: method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'resolution=merge-duplicates' : ''
    }
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(url, opts)
    .then(function(r) { return r.status === 204 ? null : r.json(); })
    .catch(function(e) { console.warn('Supabase error:', e); return null; });
}

// ── Content DB functions ──────────────────────────────────

// Save lesson content to Supabase
function dbSaveLesson(lessonId, courseId, data) {
  var row = {
    id:            'lesson_' + lessonId,
    type:          'lesson',
    course_id:     courseId,
    title:         data.title    || '',
    video_url:     data.videoUrl || '',
    duration:      data.dur      || '',
    content:       data.content  || '',
    quiz:          data.quiz     || null,
    updated_at:    new Date().toISOString()
  };
  // Also save to localStorage as fallback
  localStorage.setItem('sh_lesson_' + lessonId, JSON.stringify({
    title: data.title, videoUrl: data.videoUrl, dur: data.dur,
    content: data.content, quiz: data.quiz
  }));
  return sbFetch('POST', 'shakkel_content', row);
}

// Load lesson content from Supabase (falls back to localStorage)
function dbLoadLesson(lessonId, callback) {
  if (!_sb_ready) {
    var local = null;
    try { local = JSON.parse(localStorage.getItem('sh_lesson_' + lessonId) || 'null'); } catch(e) {}
    callback(local);
    return;
  }
  sbFetch('GET', 'shakkel_content', null, 'id=eq.lesson_' + lessonId + '&limit=1')
    .then(function(rows) {
      if (rows && rows.length) {
        var r = rows[0];
        var data = { title: r.title, videoUrl: r.video_url, dur: r.duration,
                     content: r.content, quiz: r.quiz };
        // Also cache in localStorage
        localStorage.setItem('sh_lesson_' + lessonId, JSON.stringify(data));
        callback(data);
      } else {
        // Not in Supabase — try localStorage
        var local = null;
        try { local = JSON.parse(localStorage.getItem('sh_lesson_' + lessonId) || 'null'); } catch(e) {}
        callback(local);
      }
    });
}

// Save stage content
function dbSaveStage(stageId, videoUrl, content, quiz) {
  var row = {
    id:         'stage_' + stageId,
    type:       'stage',
    video_url:  videoUrl  || '',
    content:    content   || '',
    quiz:       quiz      || null,
    updated_at: new Date().toISOString()
  };
  // localStorage fallback
  if (videoUrl)  localStorage.setItem('sh_stage_video_'   + stageId, videoUrl);
  if (content)   localStorage.setItem('sh_stage_content_' + stageId, content);
  if (quiz)      localStorage.setItem('sh_stage_quiz_'    + stageId, JSON.stringify(quiz));
  return sbFetch('POST', 'shakkel_content', row);
}

// Load all content from Supabase into localStorage cache (called on page load)
function dbSyncAllContent(callback) {
  if (!_sb_ready) { if(callback) callback(); return; }
  sbFetch('GET', 'shakkel_content', null, 'limit=500')
    .then(function(rows) {
      if (!rows) { if(callback) callback(); return; }
      rows.forEach(function(r) {
        if (r.type === 'lesson') {
          var lessonId = r.id.replace('lesson_', '');
          var data = { title: r.title, videoUrl: r.video_url, dur: r.duration,
                       content: r.content, quiz: r.quiz };
          localStorage.setItem('sh_lesson_' + lessonId, JSON.stringify(data));
        } else if (r.type === 'stage') {
          var stageId = r.id.replace('stage_', '');
          if (r.video_url) localStorage.setItem('sh_stage_video_'   + stageId, r.video_url);
          if (r.content)   localStorage.setItem('sh_stage_content_' + stageId, r.content);
          if (r.quiz)      localStorage.setItem('sh_stage_quiz_'    + stageId, JSON.stringify(r.quiz));
        }
      });
      if(callback) callback();
    });
}

// Save admin-added module
function dbSaveModule(module) {
  var row = {
    id: module.id, title: module.title, icon: module.icon,
    category: module.category, level: module.level, price: module.price,
    description: module.desc, status: module.status || 'active'
  };
  localStorage.setItem('sh_admin_modules',
    JSON.stringify(getAdminModulesLocal().concat([module])));
  return sbFetch('POST', 'shakkel_modules', row);
}

function dbLoadModules(callback) {
  if (!_sb_ready) {
    callback(getAdminModulesLocal());
    return;
  }
  sbFetch('GET', 'shakkel_modules', null, 'order=created_at.asc')
    .then(function(rows) {
      if (!rows) { callback(getAdminModulesLocal()); return; }
      var modules = rows.map(function(r) {
        return { id: r.id, title: r.title, icon: r.icon, category: r.category,
                 level: r.level, price: r.price || 0, free: !(r.price > 0),
                 desc: r.description, status: r.status, credits: 25, lessons: 0 };
      });
      localStorage.setItem('sh_admin_modules', JSON.stringify(modules));
      callback(modules);
    });
}

function getAdminModulesLocal() {
  try { return JSON.parse(localStorage.getItem('sh_admin_modules') || '[]'); } catch(e) { return []; }
}

// Save course status (active/coming_soon/inactive)
function dbSetCourseStatus(courseId, status) {
  localStorage.setItem('sh_course_status_' + courseId, status);
  var row = { id: 'status_' + courseId, type: 'status', status: status,
              course_id: courseId, updated_at: new Date().toISOString() };
  return sbFetch('POST', 'shakkel_content', row);
}

function dbLoadCourseStatuses(callback) {
  if (!_sb_ready) { if(callback) callback(); return; }
  sbFetch('GET', 'shakkel_content', null, 'type=eq.status&limit=50')
    .then(function(rows) {
      if (rows) rows.forEach(function(r) {
        if (r.course_id && r.status) {
          localStorage.setItem('sh_course_status_' + r.course_id, r.status);
        }
      });
      if(callback) callback();
    });
}


function loadState() {
  try {
    if (localStorage.getItem('sh_version') !== VERSION) {
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
      xp: 0, level: 1, streak: 0, aiCredits: 20, maxCredits: 20,
      completedLessons: [], quizScores: {}, enrolledCourses: ['dt'],
      earnedBadges: [], projects: [], lastActive: null
    };
  } catch(e) { return { xp:0, level:1, aiCredits:20, maxCredits:20, completedLessons:[], quizScores:{}, enrolledCourses:['dt'], earnedBadges:[], projects:[] }; }
}
function saveUserState(s) { localStorage.setItem('sh_state', JSON.stringify(s)); }

// ── Levels ───────────────────────────────────────────────
var LEVELS = [
  {n:1,label:'مستكشف',icon:'🔍',xp:0},
  {n:2,label:'متعلم',icon:'📚',xp:500},
  {n:3,label:'صانع',icon:'🛠️',xp:1500},
  {n:4,label:'مصمم',icon:'✏️',xp:3000},
  {n:5,label:'مبتكر',icon:'💡',xp:6000},
  {n:6,label:'رائد',icon:'🚀',xp:10000},
  {n:7,label:'خبير',icon:'🏆',xp:20000}
];

function getLevelFromXP(xp) {
  var level = LEVELS[0];
  for (var i = 0; i < LEVELS.length; i++) { if (xp >= LEVELS[i].xp) level = LEVELS[i]; }
  return level;
}
function getXPToNext(xp) {
  var cur = getLevelFromXP(xp);
  var next = LEVELS.find(function(l){ return l.n === cur.n + 1; });
  if (!next) return { pct:100, remaining:0, nextLabel:null };
  return { pct: Math.round((xp-cur.xp)/(next.xp-cur.xp)*100), remaining: next.xp-xp, nextLabel: next.label, nextXP: next.xp };
}
function addXP(amount) {
  var s = getUserState();
  var oldLevel = getLevelFromXP(s.xp);
  s.xp += amount;
  var newLevel = getLevelFromXP(s.xp);
  s.level = newLevel.n;
  saveUserState(s);
  if (newLevel.n > oldLevel.n) showToast('🎉 ترقية! أصبحت ' + newLevel.icon + ' ' + newLevel.label);
  return s;
}
function toAr(n) { return String(n).replace(/\d/g, function(d){ return '٠١٢٣٤٥٦٧٨٩'[d]; }); }

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
function openModal(id) { var el=document.getElementById(id); if(el) el.classList.add('open'); }
function closeModal(id) { var el=document.getElementById(id); if(el) el.classList.remove('open'); }
function switchTab(tabId, panelId, groupClass) {
  document.querySelectorAll('.'+(groupClass||'tab-btn')).forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function(p){ p.classList.remove('active'); });
  var tab=document.getElementById(tabId); var panel=document.getElementById(panelId);
  if(tab) tab.classList.add('active'); if(panel) panel.classList.add('active');
}

// ── User greeting bar ────────────────────────────────────
function renderGreetingBar() {
  var bar = document.getElementById('greeting-bar');
  if (!bar) return;
  var user = getUser();
  if (!user) { bar.style.display = 'none'; return; }
  var state = getUserState();
  var level = getLevelFromXP(state.xp);
  var hour = new Date().getHours();
  var greet = hour < 12 ? 'صباح الخير' : hour < 17 ? 'مساء الخير' : 'مساء النور';
  bar.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;flex:1">' +
      '<div style="width:30px;height:30px;border-radius:50%;background:var(--gold);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--ink)">' + (user.name||'م').charAt(0) + '</div>' +
      '<span style="font-size:13px;color:rgba(255,255,255,.85)">' + greet + '، <strong style="color:var(--gold)">' + (user.name||'متعلم') + '</strong></span>' +
      '<span style="font-size:11px;color:rgba(255,255,255,.4)">' + level.icon + ' ' + level.label + ' · ' + toAr(state.xp) + ' XP</span>' +
    '</div>' +
    '<div style="display:flex;align-items:center;gap:8px">' +
      '<div style="font-size:11px;color:rgba(255,255,255,.5);display:flex;align-items:center;gap:4px">🔋<span id="gb-credits" style="color:var(--gold)">' + toAr(state.aiCredits||0) + '</span> رصيد AI</div>' +
      '<a href="dashboard.html" style="font-size:11px;color:rgba(255,255,255,.5);text-decoration:none;padding:3px 8px;border:1px solid rgba(255,255,255,.15);border-radius:10px">لوحة التحكم</a>' +
      '<button onclick="doLogout()" style="font-size:11px;background:none;border:none;color:rgba(255,100,100,.5);cursor:pointer">خروج</button>' +
    '</div>';
  bar.style.display = 'flex';
}

function doLogout() { localStorage.removeItem('sh_user'); window.location.href = 'index.html'; }

// ── AI Credits system ─────────────────────────────────────
var CREDIT_PACKS = [
  {id:'pack_50',  label:'٥٠ رسالة',  price:29,  credits:50},
  {id:'pack_150', label:'١٥٠ رسالة', price:79,  credits:150},
  {id:'pack_500', label:'٥٠٠ رسالة', price:199, credits:500}
];
function getCredits() { return getUserState().aiCredits || 0; }
function deductCredit() {
  var s = getUserState();
  if ((s.aiCredits||0) > 0) { s.aiCredits--; saveUserState(s); }
  var gb = document.getElementById('gb-credits');
  if (gb) gb.textContent = toAr(s.aiCredits||0);
}
function addCredits(amount) {
  var s = getUserState();
  s.aiCredits = (s.aiCredits||0) + amount;
  s.maxCredits = (s.maxCredits||0) + amount;
  saveUserState(s);
}

// ── QA Library (editable by admin) ───────────────────────
function getQALibrary() {
  try {
    var stored = JSON.parse(localStorage.getItem('sh_qa_library') || 'null');
    return stored || DEFAULT_QA;
  } catch(e) { return DEFAULT_QA; }
}
function saveQALibrary(qa) { localStorage.setItem('sh_qa_library', JSON.stringify(qa)); }

var DEFAULT_QA = [
  {id:'qa1', keys:['تعاطف','empathy','مستخدم','احتياج','فهم'], q:'ما هو التعاطف في التفكير التصميمي؟', a:'التعاطف هو فهم المستخدمين عمقاً — ليس فقط ما يقولونه، بل ما يشعرون به ويفكرون فيه. نستخدم أدوات مثل المقابلات، الملاحظة، وخرائط التعاطف. 🔍'},
  {id:'qa2', keys:['hmw','كيف يمكننا','مشكلة','صياغة','define'], q:'كيف أكتب سؤال HMW جيد؟', a:'سؤال HMW الجيد: واسع بما يكفي للإبداع، وضيق بما يكفي للتركيز. اكتب 10 أسئلة من نفس الملاحظة واختر الأفضل. اختبار: السؤال الجيد يُنتج 10-20 فكرة مختلفة. 🎯'},
  {id:'qa3', keys:['عصف','أفكار','brainstorm','ideate','إبداع','scamper'], q:'كيف أجري جلسة عصف ذهني ناجحة؟', a:'قواعد العصف الذهني: ١) الكمية قبل الجودة ٢) لا نقد أثناء الجلسة ٣) أفكار جريئة مرحّب بها ٤) ابنِ على أفكار الآخرين. جرّب SCAMPER لتوليد أفكار جديدة. 💡'},
  {id:'qa4', keys:['نموذج','prototype','اختبار','test','بناء'], q:'ما هو النموذج الأولي وكيف أبنيه؟', a:'النموذج الأولي هو أسرع وأرخص طريقة لاختبار فكرتك. ابنِ بورق أو كرتون أولاً. القاعدة: ابنِ بسرعة، اختبر مبكراً، فشل بتكلفة منخفضة. 🛠️'},
  {id:'qa5', keys:['fusion','360','cad','تصميم','ثلاثي','sketch'], q:'كيف أبدأ في Fusion 360؟', a:'في Fusion 360: ابدأ بـ New Sketch، ارسم مقطعك، ثم Extrude لتحويله لجسم ثلاثي الأبعاد. استخدم Constraints لإبقاء التصميم ذكياً. 🖥️'},
  {id:'qa6', keys:['طباعة','3d','pla','filament','cura','slicing'], q:'ما الإعدادات المثالية للطباعة ثلاثية الأبعاد للمبتدئين؟', a:'للمبتدئين: Layer Height 0.2mm، Infill 20%، Temp 200°C مع PLA. استخدم Cura كـ Slicer. ابدأ بنموذج صغير للاختبار. 🖨️'},
  {id:'qa7', keys:['ليزر','laser','قطع','نقش','co2','svg'], q:'كيف أستخدم آلة قطع الليزر؟', a:'خطوط حمراء = قطع | ملء أزرق = نقش. جرّب بأعلى سرعة وأقل طاقة أولاً. تجنّب PVC — يُطلق غازات سامة. تأكد أن الملف SVG نظيف. 🔆'},
  {id:'qa8', keys:['arduino','برمجة','led','sensor','إلكترونيات'], q:'كيف أبدأ مع Arduino؟', a:'أول مشروع: LED Blink — هو Hello World للإلكترونيات! pinMode(13, OUTPUT); في setup ثم digitalWrite HIGH/LOW في loop. 💡'},
  {id:'qa9', keys:['مستوى','xp','شارة','badge','نقاط','level'], q:'كيف أرفع مستواي في شكّل؟', a:'تكسب XP من: إكمال الدروس (+50)، تقديم القوالب (+25)، اجتياز التقييم (+75)، إكمال المرحلة (+150). ٧ مستويات من مستكشف إلى خبير. ⚡'},
  {id:'qa10', keys:['pov','وجهة نظر','insight','استنتاج'], q:'كيف أكتب بيان POV؟', a:'صيغة POV: [المستخدم] يحتاج إلى [الحاجة] لأن [الاستنتاج المفاجئ]. الجزء الأخير هو الإبداعي — اكتشف السبب الجذري. 📌'},
  {id:'qa11', keys:['قالب','template','نموذج','ملء','تعبئة'], q:'كيف أملأ القوالب في المشروع؟', a:'اضغط على القالب، املأ الحقول، اضغط "حفظ" لحفظ مسودة أو "تقديم" لإكمال المتطلبات. يمكنك تعديل القالب بعد حفظه ما لم تقدّمه. 📋'},
  {id:'qa12', keys:['تقييم','quiz','assessment','اختبار','درجة','90'], q:'ما شرط اجتياز التقييم؟', a:'تحتاج 90% أو أعلى لفتح المرحلة التالية. يمكنك إعادة المحاولة كم مرة تريد. إذا أخفقت، راجع محتوى المرحلة وحاول مجدداً. 📝'},
  {id:'qa13', keys:['مرشد','mentor','جلسة','session','سؤال','حجز'], q:'كيف أحجز جلسة مع مرشد؟', a:'من صفحة المرشدين، اختر المرشد المناسب واضغط "جلسة". ستظهر لك روزنامة لاختيار اليوم والوقت المناسب. سيرد المرشد بالتأكيد أو الاقتراح البديل. 🧑‍🏫'},
  {id:'qa14', keys:['رصيد','credit','ai','ذكاء','شراء','سعر'], q:'كيف أحصل على رصيد AI إضافي؟', a:'تحصل على رصيد مجاني عند التسجيل في كل دورة. لشراء المزيد: اضغط على أيقونة 🔋 في أعلى الصفحة واختر حزمة المناسبة. 💳'},
  {id:'qa15', keys:['iterate','تكرار','تحسين','نتائج','تطوير'], q:'ما مرحلة التكرار في التفكير التصميمي؟', a:'التكرار هو قلب التفكير التصميمي. بناءً على نتائج الاختبار، عدّل نموذجك وأعد الاختبار. كل دورة تجعل حلّك أفضل. 🔄'},
  {id:'qa16', keys:['cnc','تفريز','router','gcode','خشب','ألومنيوم'], q:'ما هو تصنيع CNC؟', a:'CNC Router يعمل في ٣ محاور X,Y,Z. الفرق عن الليزر: CNC يقطع بعمق حقيقي ويعمل على الخشب السميك والألومنيوم. يقرأ G-code لتحديد المسار. ⚙️'},
  {id:'qa17', keys:['ux','ui','design','تجربة','مستخدم','wireframe','figma'], q:'ما الفرق بين UX وUI؟', a:'UX (تجربة المستخدم): كيف يشعر المستخدم عند استخدام المنتج — بحث، هيكل، تدفق. UI (واجهة المستخدم): كيف يبدو المنتج — ألوان، أيقونات، تصميم بصري. كلاهما ضروري! 📱'},
  {id:'qa18', keys:['اشتراك','subscription','سعر','تكلفة','كم','monthly'], q:'ما أسعار الاشتراك في شكّل؟', a:'نقدم دورة التفكير التصميمي مجاناً. الدورات المتخصصة من ١١٩-١٧٩ ر.س. هناك اشتراك شهري يتيح الوصول لكل الدورات. اضغط "الدورات" لمعرفة التفاصيل. 💰'}
];

// Semantic search in QA library
function getLocalAnswer(question) {
  var q = question.toLowerCase();
  var words = q.split(/\s+/);
  var lib = getQALibrary();
  var best = null, bestScore = 0;
  lib.forEach(function(item) {
    var score = 0;
    (item.keys||[]).forEach(function(key) {
      if (q.includes(key.toLowerCase())) score += 2;
      words.forEach(function(w) { if (w.length > 2 && key.toLowerCase().includes(w)) score += 1; });
    });
    if (score > bestScore) { bestScore = score; best = item; }
  });
  return bestScore >= 2 ? best : null;
}

// Add new Q&A to library from AI response
function learnFromAI(question, answer) {
  var lib = getQALibrary();
  var words = question.toLowerCase().split(/\s+/).filter(function(w){ return w.length > 3; });
  lib.push({ id:'qa_'+Date.now(), keys: words.slice(0,5), q: question, a: answer, auto: true });
  saveQALibrary(lib);
}

// ── AI Chatbot ────────────────────────────────────────────
var _chatOpen = false;
var _chatHistory = [];

function initChatbot() {
  if (document.getElementById('chatbot-widget')) return; // already added
  var widget = document.createElement('div');
  widget.id = 'chatbot-widget';
  widget.innerHTML = `
    <div id="chat-bubble-btn" onclick="toggleChat()" title="مساعد AI">
      <span id="chat-bubble-icon">🤖</span>
      <span id="chat-unread" style="display:none">!</span>
    </div>
    <div id="chat-panel">
      <div id="chat-panel-header">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">🤖</span>
          <div>
            <div style="font-size:13px;font-weight:700;color:#fff">مرشد AI</div>
            <div style="font-size:10px;color:rgba(255,255,255,.5)">متاح دائماً للمساعدة</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span id="chat-credits-display" style="font-size:10px;color:rgba(255,255,255,.4)"></span>
          <button onclick="toggleChat()" style="background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;font-size:16px;line-height:1">✕</button>
        </div>
      </div>
      <div id="chat-messages">
        <div class="chat-bubble ai">
          <div class="chat-avatar ai">م</div>
          <div class="chat-msg">مرحباً! أنا مرشدك الذكي في شكّل. اسألني عن التفكير التصميمي، التصنيع الرقمي، أو أي شيء آخر. 💡</div>
        </div>
      </div>
      <div id="chat-input-row">
        <input id="chat-inp" type="text" placeholder="اسأل سؤالاً..." onkeydown="if(event.key==='Enter')sendChat()">
        <button onclick="sendChat()">←</button>
      </div>
    </div>`;
  document.body.appendChild(widget);
  updateChatCredits();
}

function toggleChat() {
  _chatOpen = !_chatOpen;
  var panel = document.getElementById('chat-panel');
  var icon = document.getElementById('chat-bubble-icon');
  if (panel) panel.style.display = _chatOpen ? 'flex' : 'none';
  if (icon) icon.textContent = _chatOpen ? '✕' : '🤖';
  if (_chatOpen) {
    document.getElementById('chat-unread').style.display = 'none';
    document.getElementById('chat-inp').focus();
    updateChatCredits();
  }
}

function updateChatCredits() {
  var el = document.getElementById('chat-credits-display');
  if (el) el.textContent = '🔋 ' + toAr(getCredits()) + ' رصيد';
}

function addChatMsg(text, role) {
  var msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  var div = document.createElement('div');
  div.className = 'chat-bubble ' + role;
  var user = getUser();
  var initials = (role === 'user') ? ((user&&user.name) ? user.name.charAt(0) : 'أ') : 'م';
  div.innerHTML = '<div class="chat-avatar ' + role + '">' + initials + '</div>' +
    '<div class="chat-msg">' + text + '</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function showTypingIndicator() {
  var msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  var div = document.createElement('div');
  div.className = 'chat-bubble ai';
  div.id = 'typing-indicator';
  div.innerHTML = '<div class="chat-avatar ai">م</div><div class="chat-msg" style="color:var(--text3)">يكتب...</div>';
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
function removeTypingIndicator() {
  var el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

async function sendChat() {
  var inp = document.getElementById('chat-inp');
  var text = inp ? inp.value.trim() : '';
  if (!text) return;
  inp.value = '';
  addChatMsg(text, 'user');
  _chatHistory.push({ role: 'user', content: text });

  // Check local library first
  var local = getLocalAnswer(text);
  if (local) {
    setTimeout(function() {
      addChatMsg(local.a, 'ai');
      _chatHistory.push({ role: 'assistant', content: local.a });
    }, 400);
    return;
  }

  // Check credits
  if (getCredits() <= 0) {
    addChatMsg('نفد رصيد AI الخاص بك. اضغط على 🔋 لشراء رصيد إضافي أو سجّل في دورة جديدة للحصول على رصيد مجاني.', 'ai');
    return;
  }

  // Call Claude API
  deductCredit();
  updateChatCredits();
  showTypingIndicator();

  try {
    var res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: 'أنت مرشد AI في منصة شكّل التعليمية العربية. المنصة متخصصة في التفكير التصميمي (Design Thinking) والتصنيع الرقمي (Fusion 360، طباعة ثلاثية الأبعاد، قطع الليزر، Arduino، CNC). أجب بالعربية فقط، بشكل موجز ومفيد (٢-٤ جمل). استخدم مثالاً عملياً إذا أمكن.',
        messages: _chatHistory.slice(-8)
      })
    });
    removeTypingIndicator();
    if (!res.ok) { addChatMsg('حدث خطأ في الاتصال. حاول مرة أخرى.', 'ai'); return; }
    var data = await res.json();
    var reply = data.content.map(function(b){ return b.text||''; }).join('');
    addChatMsg(reply, 'ai');
    _chatHistory.push({ role: 'assistant', content: reply });
    // Learn this Q&A for future local use
    learnFromAI(text, reply);
  } catch(e) {
    removeTypingIndicator();
    addChatMsg('لا يمكن الوصول للخادم حالياً. راجع مكتبة الأسئلة أو تواصل مع المرشدين.', 'ai');
  }
}

// ── Payment stubs ─────────────────────────────────────────
var SUBSCRIPTION_PLANS = [
  {id:'free',    label:'مجاني',    price:0,   monthly:0,   features:['دورة التفكير التصميمي','٢٠ رسالة AI','الوصول للمجتمع']},
  {id:'pro',     label:'Pro',      price:149, monthly:149, features:['جميع الدورات','١٥٠ رسالة AI شهرياً','أولوية في الدعم','شهادات معتمدة']},
  {id:'premium', label:'Premium',  price:299, monthly:299, features:['جميع الدورات','٥٠٠ رسالة AI شهرياً','جلسة مرشد شهرية','دعم مباشر','شهادات معتمدة']}
];

function openPurchaseModal(type, itemId) {
  var modal = document.getElementById('purchase-modal');
  var body = document.getElementById('purchase-modal-body');
  if (!modal || !body) { showToast('خاصية الدفع قيد التطوير — سيتم الإطلاق قريباً'); return; }
  
  var content = '';
  if (type === 'credits') {
    content = '<h3 style="margin-bottom:16px">💳 شراء رصيد AI</h3>' +
      CREDIT_PACKS.map(function(p) {
        return '<div onclick="simulatePurchase(\'credits\','+p.credits+')" style="display:flex;align-items:center;gap:12px;padding:14px;border:1.5px solid var(--border);border-radius:var(--r2);margin-bottom:10px;cursor:pointer;transition:all .15s" onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
          '<div style="flex:1"><div style="font-size:14px;font-weight:700">'+p.label+'</div><div style="font-size:12px;color:var(--text3)">'+toAr(p.credits)+' رسالة</div></div>' +
          '<div style="font-size:18px;font-weight:700;color:var(--gold-dark)">'+toAr(p.price)+' ر.س</div>' +
          '</div>';
      }).join('') +
      '<div class="callout" style="margin-top:12px">💳 بوابة الدفع ستُضاف قريباً — حالياً الشراء تجريبي</div>';
  } else if (type === 'subscription') {
    content = '<h3 style="margin-bottom:16px">⭐ خطط الاشتراك</h3>' +
      SUBSCRIPTION_PLANS.filter(function(p){return p.price>0;}).map(function(p) {
        return '<div onclick="simulatePurchase(\'subscription\',0)" style="border:1.5px solid var(--border);border-radius:var(--r2);padding:16px;margin-bottom:10px;cursor:pointer" onmouseover="this.style.borderColor=\'var(--gold)\'" onmouseout="this.style.borderColor=\'var(--border)\'">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
            '<div style="font-size:15px;font-weight:700">'+p.label+'</div>' +
            '<div style="font-size:20px;font-weight:700;color:var(--gold-dark)">'+toAr(p.price)+' ر.س<span style="font-size:11px;color:var(--text3)">/شهر</span></div>' +
          '</div>' +
          p.features.map(function(f){ return '<div style="font-size:12px;color:var(--text2);margin-bottom:3px">✓ '+f+'</div>'; }).join('') +
          '</div>';
      }).join('');
  }
  body.innerHTML = content;
  openModal('purchase-modal');
}

function simulatePurchase(type, amount) {
  closeModal('purchase-modal');
  if (type === 'credits') {
    addCredits(amount);
    showToast('✅ تمت إضافة ' + toAr(amount) + ' رسالة AI لرصيدك');
    updateChatCredits();
    renderGreetingBar();
  } else {
    showToast('✅ تم تفعيل الاشتراك! (تجريبي)');
  }
}

// ── Courses / Mentors / Events data ──────────────────────
var COURSES = [
  // ── LIVE COURSE ────────────────────────────────────────
  {id:'prototyping', title:'مقدمة في النمذجة الأولية', icon:'🛠️',
   price:0, free:true, credits:30, category:'fabrication',
   level:'مبتدئ', duration:'٤ ساعات', lessons:5,
   desc:'تعلّم كيف تحوّل فكرتك إلى نموذج ملموس في ساعات — باستخدام الورق والكرتون والأدوات الرقمية',
   badge:'🛠️ بانٍ', live:true, comingSoon:false},

  // ── COMING SOON ─────────────────────────────────────────
  {id:'dt',    title:'رحلة التفكير التصميمي', icon:'🧠',
   price:0,   free:true,  credits:30, category:'design',
   level:'مبتدئ', duration:'٨ ساعات', lessons:7,
   desc:'مسار كامل عبر مراحل Design Thinking — التعاطف، تحديد المشكلة، الأفكار، النمذجة، والاختبار',
   badge:'🧠 مفكّر تصميمي', live:false, comingSoon:true},

  {id:'cad',   title:'Fusion 360 للمبتدئين', icon:'🖥️',
   price:149, free:false, credits:30, category:'fabrication',
   level:'مبتدئ', duration:'٦ ساعات', lessons:5,
   desc:'من الصفر إلى تصميم قطع ثلاثية الأبعاد احترافية',
   badge:'⚙️ مهندس CAD', live:false, comingSoon:true},

  {id:'3dp',   title:'الطباعة ثلاثية الأبعاد', icon:'🖨️',
   price:119, free:false, credits:25, category:'fabrication',
   level:'مبتدئ', duration:'٥ ساعات', lessons:4,
   desc:'إعداد الطابعة، اختيار المواد، وطباعة أول نموذج',
   badge:'🖨️ طابع ثلاثي', live:false, comingSoon:true},

  {id:'laser', title:'قطع الليزر', icon:'🔆',
   price:119, free:false, credits:25, category:'fabrication',
   level:'مبتدئ', duration:'٤ ساعات', lessons:3,
   desc:'أساسيات القطع والنقش بالليزر للمبتدئين',
   badge:'🔆 ليزر', live:false, comingSoon:true},

  {id:'ux',    title:'UX/UI Design', icon:'📱',
   price:179, free:false, credits:40, category:'design',
   level:'متوسط', duration:'١٠ ساعات', lessons:8,
   desc:'تصميم تجربة المستخدم من البحث إلى النموذج',
   badge:'📱 مصمم UX', live:false, comingSoon:true},

  {id:'elec',  title:'الإلكترونيات وArduino', icon:'💡',
   price:149, free:false, credits:30, category:'fabrication',
   level:'مبتدئ', duration:'٦ ساعات', lessons:5,
   desc:'برمجة الإلكترونيات من الصفر مع مشاريع عملية',
   badge:'💡 صانع إلكتروني', live:false, comingSoon:true},

  {id:'cnc',   title:'تصنيع CNC', icon:'⚙️',
   price:119, free:false, credits:25, category:'fabrication',
   level:'متوسط', duration:'٤ ساعات', lessons:3,
   desc:'مبادئ التفريز CNC وبرمجة G-code',
   badge:'⚙️ مصنّع CNC', live:false, comingSoon:true}
];

var MENTORS = [
  {id:'m1',name:'د. سارة الأحمد',  title:'خبيرة التفكير التصميمي',bio:'١٠ سنوات خبرة مع IDEO وSAP. حاصلة على شهادة d.school من ستانفورد.',specs:['التعاطف','HMW','ورش العمل','POV'],av:'سا',color:'#EBC84C',available:true, rating:4.9,sessions:47,responseTime:'٢٤ ساعة'},
  {id:'m2',name:'م. خالد المنصور', title:'مهندس تصنيع رقمي',       bio:'مهندس ميكانيكي يدير Fab Lab في عمّان منذ ٦ سنوات. درّب +٥٠٠ شخص.',specs:['Fusion 360','طباعة ثلاثية','CNC'],av:'خا',color:'#1565C0',available:true, rating:4.8,sessions:89,responseTime:'٣٦ ساعة'},
  {id:'m3',name:'أ. نورة السالم',  title:'مصممة منتجات ورائدة',    bio:'مصممة بخبرة ٨ سنوات. أسّست شركتها باستخدام Design Thinking.',specs:['النمذجة','UX Design','Lean Startup'],av:'نو',color:'#2E7D32',available:true, rating:5.0,sessions:63,responseTime:'٤٨ ساعة'},
  {id:'m4',name:'م. أحمد الزهراني',title:'مهندس إلكترونيات وـ IoT', bio:'متخصص في Arduino وRaspberry Pi وأنظمة IoT.',specs:['Arduino','Electronics','IoT'],av:'أح',color:'#6A1B9A',available:false,rating:4.7,sessions:34,responseTime:'٧٢ ساعة'}
];

var EVENTS = [
  {id:'e1',type:'webinar',    title:'وبينار: مقدمة في التفكير التصميمي',date:'2025-07-15',time:'19:00',dur:'٩٠ دقيقة',host:'د. سارة الأحمد',free:true, price:0,  seats:200,reg:134,platform:'Zoom',          link:'https://eventbrite.com',desc:'جلسة تعريفية مجانية.',         tags:['مبتدئين','مجاني']},
  {id:'e2',type:'meetup',     title:'لقاء مجتمع شكّل — جدة',            date:'2025-07-22',time:'17:30',dur:'٣ ساعات', host:'فريق شكّل',     free:true, price:0,  seats:50, reg:38, platform:'Fab Lab جدة',   link:'https://eventbrite.com',desc:'لقاء شهري للصانعين.',         tags:['حضوري','تواصل']},
  {id:'e3',type:'workshop',   title:'ورشة: من الفكرة إلى النموذج',       date:'2025-08-01',time:'10:00',dur:'٦ ساعات', host:'م. خالد المنصور',free:false,price:150,seats:15, reg:11, platform:'Fab Lab الرياض',link:'https://eventbrite.com',desc:'تصمّم وتطبع قطعة في يوم.',   tags:['حضوري','عملي']},
  {id:'e4',type:'webinar',    title:'كيف تبني منتجاً ناجحاً بـ DT',      date:'2025-08-10',time:'20:00',dur:'٦٠ دقيقة',host:'أ. نورة السالم', free:true, price:0,  seats:300,reg:198,platform:'Google Meet',  link:'https://eventbrite.com',desc:'قصص نجاح حقيقية.',            tags:['ريادة','مجاني']},
  {id:'e5',type:'competition',title:'هاكاثون شكّل ٢٠٢٥',                 date:'2025-08-22',time:'09:00',dur:'٤٨ ساعة', host:'فريق شكّل',     free:true, price:0,  seats:80, reg:64, platform:'هجين',         link:'https://eventbrite.com',desc:'جوائز لأفضل ٣ فرق.',         tags:['مسابقة','جوائز']},
  {id:'e6',type:'workshop',   title:'ورشة: أساسيات قطع الليزر',           date:'2025-09-05',time:'14:00',dur:'٤ ساعات', host:'م. أحمد الزهراني',free:false,price:100,seats:12, reg:5,  platform:'Fab Lab جدة',   link:'https://eventbrite.com',desc:'تعلّم قطع الليزر.',           tags:['حضوري','ليزر']}
];


// ── Prototyping course lessons (LIVE) ────────────────────
var PROTOTYPING_LESSONS = [
  {
    id: 'proto_1',
    title: 'ما هو النموذج الأولي؟',
    type: 'video',
    dur: '١٢ دقيقة',
    xp: 50,
    videoUrl: '', // Admin fills via admin panel → sh_lesson_proto_1
    objectives: [
      'فهم مفهوم النمذجة الأولية',
      'الفرق بين النموذج والمنتج النهائي',
      'لماذا نبني بسرعة؟'
    ],
    content: `
<h3>ما هو النموذج الأولي (Prototype)؟</h3>
<p>النموذج الأولي هو <strong>أسرع وأرخص</strong> طريقة لاختبار فكرتك قبل الاستثمار فيها. إنه ليس المنتج النهائي — بل هو أداة تعلّم.</p>
<div class="callout gold">⚡ <strong>المبدأ الذهبي:</strong> ابنِ بسرعة، اختبر مبكراً، وتعلّم من الفشل الرخيص.</div>
<h3>النموذج الأولي مقابل المنتج النهائي</h3>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">
  <div style="background:var(--red-light);border-radius:var(--r);padding:12px">
    <strong>المنتج النهائي</strong>
    <ul style="margin-top:8px"><li>يستغرق شهوراً</li><li>تكلفة عالية</li><li>يصعب تعديله</li></ul>
  </div>
  <div style="background:var(--teal-light);border-radius:var(--r);padding:12px">
    <strong>النموذج الأولي</strong>
    <ul style="margin-top:8px"><li>يستغرق ساعات</li><li>تكلفة منخفضة جداً</li><li>سهل التعديل والتغيير</li></ul>
  </div>
</div>
<h3>لماذا نبني بسرعة؟</h3>
<p>كلما أسرعت في بناء نموذج واختباره، كلما تعلمت أسرع. الهدف ليس البناء المثالي — بل <strong>التعلم السريع</strong>.</p>
<div class="callout">💡 شركة IDEO تبني ما يصل لـ ١٠ نماذج في اليوم الواحد — هذا سر ابتكارها!</div>`,
    quiz: [
      {q: 'ما الهدف الأساسي من النموذج الأولي؟', opts: ['بناء المنتج النهائي', 'التعلم بأقل تكلفة وأسرع وقت', 'إرضاء العميل', 'الحصول على تمويل'], a: 1},
      {q: 'ما الفرق الرئيسي بين النموذج الأولي والمنتج النهائي؟', opts: ['لا فرق بينهما', 'النموذج أرخص وأسرع وأسهل تعديلاً', 'المنتج النهائي أفضل دائماً', 'النموذج للعرض فقط'], a: 1},
      {q: 'ما المبدأ الذهبي في النمذجة الأولية؟', opts: ['ابنِ ببطء وإتقان', 'انتظر حتى تجمع كل المعلومات', 'ابنِ بسرعة، اختبر مبكراً، تعلّم', 'لا تبنِ قبل الحصول على ميزانية كافية'], a: 2}
    ]
  },
  {
    id: 'proto_2',
    title: 'أنواع النماذج الأولية',
    type: 'video',
    dur: '١٥ دقيقة',
    xp: 50,
    videoUrl: '',
    objectives: [
      'التعرف على أنواع النماذج الأربعة',
      'كيف تختار النوع المناسب لفكرتك',
      'مثال عملي لكل نوع'
    ],
    content: `
<h3>أنواع النماذج الأولية الأربعة</h3>
<h4>١. النموذج الورقي 📄</h4>
<p>الأسرع والأرخص. مناسب لـ: التطبيقات، الواجهات، عمليات الخدمات.</p>
<div class="callout teal">✅ مثال: ارسم شاشات التطبيق على أوراق وضعها أمام المستخدم. كلّفك ٠ ريال!</div>
<h4>٢. النموذج المادي 📦</h4>
<p>كرتون، صمغ، مقص، فوم. مناسب لـ: المنتجات المادية، الأثاث، الأجهزة.</p>
<div class="callout gold">💡 نصيحة: لا تستخدم مواد غالية في المرحلة الأولى. الكرتون يؤدي نفس الغرض!</div>
<h4>٣. النموذج الرقمي 💻</h4>
<p>Figma, PowerPoint, Canva. مناسب لـ: الخدمات، المواقع، تدفق العمل.</p>
<div class="callout">🎨 Figma مجاني للاستخدام الأساسي وسهل التعلم.</div>
<h4>٤. النموذج المطبوع ثلاثياً 🖨️</h4>
<p>للقطع الدقيقة التي لا يمكن بناؤها يدوياً. يحتاج وقتاً أطول وتكلفة أعلى.</p>
<div class="callout red">⚠️ لا تقفز للطباعة ثلاثية الأبعاد مبكراً — جرّب الكرتون أولاً!</div>
<h3>كيف تختار؟</h3>
<p>اختر <strong>أسرع طريقة</strong> لاختبار الفرضية الأكثر خطورة في فكرتك.</p>`,
    quiz: [
      {q: 'ما أسرع وأرخص نوع من النماذج؟', opts: ['المطبوع ثلاثياً', 'الورقي', 'الرقمي', 'المادي بالكرتون'], a: 1},
      {q: 'ما البرنامج المجاني الموصى به للنماذج الرقمية؟', opts: ['Adobe XD', 'Sketch', 'Figma', 'Photoshop'], a: 2},
      {q: 'متى تستخدم النموذج المطبوع ثلاثياً؟', opts: ['دائماً', 'أبداً', 'للقطع الدقيقة التي لا يمكن بناؤها يدوياً', 'في أول مرحلة دائماً'], a: 2}
    ]
  },
  {
    id: 'proto_3',
    title: 'تمرين: ابنِ في ٦٠ دقيقة',
    type: 'exercise',
    dur: '٢٥ دقيقة',
    xp: 75,
    videoUrl: '',
    objectives: [
      'تطبيق قاعدة الساعة الواحدة',
      'بناء نموذج ورقي أو كرتوني',
      'توثيق عملية البناء'
    ],
    content: `
<h3>قاعدة الساعة الواحدة ⏱️</h3>
<p>أعطِ نفسك <strong>٦٠ دقيقة فقط</strong> لبناء نموذجك. القيود الزمنية تحفز الإبداع وتمنعك من الإفراط في التفاصيل.</p>
<div class="callout gold">🎯 الهدف ليس الكمال — الهدف هو <strong>شيء ملموس يمكن اختباره</strong>.</div>
<h3>الأدوات التي تحتاجها (كلها متاحة في المنزل)</h3>
<ul>
  <li>📦 كرتون أو ورق مقوى</li>
  <li>✂️ مقص أو سكين</li>
  <li>🖊️ أقلام وماركر</li>
  <li>📎 دبابيس أو شريط لاصق</li>
  <li>📝 ملاحظات لاصقة (Post-it)</li>
</ul>
<h3>خطوات التمرين</h3>
<ol>
  <li><strong>٥ دقائق:</strong> ارسم مخططاً سريعاً لما ستبنيه</li>
  <li><strong>٤٥ دقيقة:</strong> ابنِ النموذج دون توقف</li>
  <li><strong>١٠ دقائق:</strong> التقط صوراً ووثّق ما بنيته</li>
</ol>
<div class="callout teal">📸 شارك صورة نموذجك في مجتمع شكّل!</div>`,
    quiz: [
      {q: 'ما قاعدة الساعة الواحدة في النمذجة؟', opts: ['الراحة لساعة قبل البناء', 'إعطاء نفسك ٦٠ دقيقة فقط لبناء النموذج', 'بناء نموذج كل ساعة', 'العمل لساعة يومياً'], a: 1},
      {q: 'ما أهمية القيود الزمنية في البناء؟', opts: ['تقلل الجودة', 'تحفز الإبداع وتمنع الإفراط في التفاصيل', 'لا فائدة منها', 'تجعل العمل أصعب فقط'], a: 1},
      {q: 'ما الهدف من نموذجك بعد ٦٠ دقيقة؟', opts: ['نموذج مثالي', 'شيء ملموس يمكن اختباره مع الآخرين', 'نموذج للعرض فقط', 'تقرير مكتوب'], a: 1}
    ]
  },
  {
    id: 'proto_4',
    title: 'اختبار النموذج مع المستخدمين',
    type: 'video',
    dur: '١٨ دقيقة',
    xp: 75,
    videoUrl: '',
    objectives: [
      'كيف تُجري جلسة اختبار بسيطة',
      'ما تراقبه أثناء الاختبار',
      'كيف تجمع التغذية الراجعة'
    ],
    content: `
<h3>اختبار النموذج</h3>
<p>النموذج بلا اختبار لا قيمة له. الاختبار هو <strong>قلب النمذجة الأولية</strong>.</p>
<div class="callout">🎯 هدفك: <strong>تعلّم</strong> ما لا يعمل، لا إثبات أن فكرتك صحيحة.</div>
<h3>كيف تجري جلسة اختبار بسيطة؟</h3>
<ol>
  <li><strong>اختر ٣ أشخاص</strong> من شريحتك المستهدفة</li>
  <li><strong>أعطهم مهمة</strong> واضحة — لا توجيه مسبق</li>
  <li><strong>اصمت وراقب</strong> — لا تتدخل حتى ينتهوا</li>
  <li><strong>اسأل بعدها</strong> — "ما الذي كان صعباً؟ ما الذي أعجبك؟ لماذا؟"</li>
</ol>
<h3>ما تراقبه؟</h3>
<ul>
  <li>أين يتوقفون أو يشعرون بالارتباك</li>
  <li>ما يقولونه مقارنةً بما يفعلونه</li>
  <li>ردود الفعل التلقائية (ابتسامة، تجهّم، تساؤل)</li>
</ul>
<div class="callout gold">💡 القاعدة الذهبية: اسأل "لماذا؟" ثلاث مرات بعد كل رد فعل.</div>`,
    quiz: [
      {q: 'ما هدف اختبار النموذج؟', opts: ['إثبات أن الفكرة صحيحة', 'التعلم ما لا يعمل وتحسين الحل', 'إقناع المستثمرين', 'الانتهاء من المشروع'], a: 1},
      {q: 'كم شخصاً يكفي لاختبار النموذج في الجولة الأولى؟', opts: ['١ شخص', '٣ أشخاص', '٢٠ شخصاً', 'لا يهم العدد'], a: 1},
      {q: 'ماذا تفعل أثناء اختبار المستخدم للنموذج؟', opts: ['تشرح كيف يستخدمه', 'تتدخل عند كل خطأ', 'تصمت وتراقب', 'تحكي عن مميزات الفكرة'], a: 2}
    ]
  },
  {
    id: 'proto_5',
    title: 'التكرار: تحسين النموذج بناءً على التغذية الراجعة',
    type: 'exercise',
    dur: '٢٠ دقيقة',
    xp: 100,
    videoUrl: '',
    objectives: [
      'كيف تحلل نتائج الاختبار',
      'ما الذي تعدّله وما تبقيه',
      'دورة البناء-الاختبار-التعلم'
    ],
    content: `
<h3>دورة البناء — الاختبار — التعلم</h3>
<p>هذه هي الدورة الأساسية لكل صانع ومصمم ناجح. كلما كررتها أسرع، كلما وصلت للحل الصح بشكل أسرع.</p>
<div style="display:flex;align-items:center;justify-content:center;gap:20px;padding:20px;background:var(--warm3);border-radius:var(--r2);margin:12px 0">
  <div style="text-align:center"><div style="font-size:32px">🛠️</div><div style="font-size:12px;font-weight:600;margin-top:4px">ابنِ</div></div>
  <div style="font-size:24px;color:var(--gold-dark)">→</div>
  <div style="text-align:center"><div style="font-size:32px">🧪</div><div style="font-size:12px;font-weight:600;margin-top:4px">اختبر</div></div>
  <div style="font-size:24px;color:var(--gold-dark)">→</div>
  <div style="text-align:center"><div style="font-size:32px">📚</div><div style="font-size:12px;font-weight:600;margin-top:4px">تعلّم</div></div>
  <div style="font-size:24px;color:var(--gold-dark)">→</div>
  <div style="text-align:center"><div style="font-size:32px">🔄</div><div style="font-size:12px;font-weight:600;margin-top:4px">كرّر</div></div>
</div>
<h3>كيف تحلل نتائج الاختبار؟</h3>
<ol>
  <li>اجمع كل ملاحظاتك في مكان واحد</li>
  <li>ابحث عن <strong>الأنماط</strong> — ما تكرّر عند أكثر من شخص</li>
  <li>صنّف: ما يجب تعديله / ما يبقى / ما يُحذف</li>
  <li>عدّل شيئاً <strong>واحداً</strong> في كل مرة لتعرف ما الذي أحدث الفرق</li>
</ol>
<div class="callout teal">🏆 مبروك! أكملت دورة النمذجة الأولية. الآن أنت جاهز لتحويل أفكارك لواقع!</div>`,
    quiz: [
      {q: 'ما الدورة الأساسية للنمذجة الأولية؟', opts: ['فكّر، اكتب، انشر', 'ابنِ، اختبر، تعلّم', 'خطّط، نفّذ، سلّم', 'اسأل، اجب، انتهِ'], a: 1},
      {q: 'عند تعديل النموذج، كم شيئاً تعدّله في كل مرة؟', opts: ['كل شيء', 'لا شيء', 'شيئاً واحداً لتعرف ما أحدث الفرق', 'اثنان'], a: 2},
      {q: 'ما أهم ما تبحث عنه في ملاحظات الاختبار؟', opts: ['ردود الفعل الإيجابية فقط', 'الأنماط المتكررة عند أكثر من مستخدم', 'أطول التعليقات', 'آراء الخبراء فقط'], a: 1}
    ]
  }
];

var DT_STAGES = [
  {id:'empathy',  label:'التعاطف',       icon:'🔍',color:'#E3F2FD',xp:150},
  {id:'define',   label:'تحديد المشكلة',icon:'🎯',color:'#FFF3E0',xp:150},
  {id:'ideate',   label:'توليد الأفكار',icon:'💡',color:'#F3E5F5',xp:150},
  {id:'prototype',label:'النمذجة',       icon:'🛠️',color:'#E8F5E9',xp:200},
  {id:'test',     label:'الاختبار',      icon:'🧪',color:'#FFF8E1',xp:200},
  {id:'iterate',  label:'التكرار',       icon:'🔄',color:'#FCE4EC',xp:250}
];

// Community posts
var SEED_POSTS = [
  {id:'s1',title:'ما الفرق الحقيقي بين التعاطف والتعاطف الفكري؟',body:'أحاول فهم الفرق في سياق التفكير التصميمي.',tag:'التعاطف',author:'سارة م.',date:Date.now()-86400000*3,votes:12,solved:true,replies:[{author:'فريق شكّل',text:'التعاطف = تضع نفسك مكان المستخدم. التعاطف الفكري = تفهم موقفه من بُعد. في التصميم نحتاج الأول.'}]},
  {id:'s2',title:'كيف أكتب سؤال HMW جيد؟',body:'كلما حاولت يكون ضيقاً أو واسعاً جداً.',tag:'تحديد المشكلة',author:'خالد ع.',date:Date.now()-86400000*2,votes:8,solved:true,replies:[{author:'فريق شكّل',text:'السؤال الجيد يُنتج ١٠-٢٠ فكرة مختلفة — إذا كان الجواب واحداً فهو ضيق جداً.'}]},
  {id:'s3',title:'هل يمكن تطبيق التفكير التصميمي منفرداً؟',body:'أنا طالب وليس عندي فريق.',tag:'عام',author:'نورة س.',date:Date.now()-86400000,votes:15,solved:false,replies:[]},
  {id:'s4',title:'ما أفضل برنامج Slicer للمبتدئين؟',body:'سمعت عن Cura وPrusaSlicer.',tag:'عام',author:'أحمد ز.',date:Date.now()-86400000*5,votes:6,solved:true,replies:[{author:'فريق شكّل',text:'Cura للمبتدئين هو الأفضل — واجهة بسيطة وإعدادات تلقائية ممتازة.'}]},
  {id:'s5',title:'شاركوا مشاريعكم — من طبّق DT على مشكلة حقيقية؟',body:'نريد نسمع تجاربكم!',tag:'عام',author:'فريق شكّل',date:Date.now()-86400000*7,votes:20,solved:false,replies:[]}
];
function getPosts() {
  try {
    var p = JSON.parse(localStorage.getItem('sh_posts')||'null');
    if (!p||p.length===0) { localStorage.setItem('sh_posts',JSON.stringify(SEED_POSTS)); return SEED_POSTS; }
    return p;
  } catch(e) { return SEED_POSTS; }
}
function savePosts(p) { localStorage.setItem('sh_posts', JSON.stringify(p)); }

function getStageHint(stage) {
  var hints = {
    empathy:['💡 لا تفترض — اذهب للميدان وتحدث مع المستخدمين الحقيقيين.','🔍 الملاحظة الصامتة تكشف أكثر من المقابلة أحياناً.'],
    define:['🎯 سؤال HMW الجيد يُنتج 10-20 فكرة مختلفة.','✏️ اكتب 5 أسئلة HMW ثم اختر الأفضل.'],
    ideate:['💡 لا نقد في جلسة العصف الذهني.','🚀 ابدأ بأكثر فكرة جنونية — هذا يحرر الإبداع.'],
    prototype:['🛠️ ابنِ بأرخص المواد أولاً.','⏱️ أعطِ نفسك ساعة واحدة فقط لبناء النموذج.'],
    test:['👀 راقب ولا تتدخل.','❓ اسأل "لماذا؟" ثلاث مرات على كل رد فعل.'],
    iterate:['🔄 كل اختبار يُعلّمك شيئاً — حتى الفشل معلومة.','📈 وثّق التغييرات: ما الذي عدّلته ولماذا؟']
  };
  var h = hints[stage]||[];
  return h.length ? h[Math.floor(Math.random()*h.length)] : null;
}

// ── Calendar helper ───────────────────────────────────────
function renderCalendar(containerId, onSelect) {
  var container = document.getElementById(containerId);
  if (!container) return;
  var now = new Date();
  var year = now.getFullYear(), month = now.getMonth();
  
  function draw(y, m) {
    var firstDay = new Date(y, m, 1).getDay();
    var daysInMonth = new Date(y, m+1, 0).getDate();
    var monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var html = '<div style="font-family:inherit">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
        '<button onclick="calNav(-1)" style="background:none;border:1px solid var(--border);border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px">‹</button>' +
        '<strong style="font-size:13px">' + monthNames[m] + ' ' + y + '</strong>' +
        '<button onclick="calNav(1)" style="background:none;border:1px solid var(--border);border-radius:6px;width:28px;height:28px;cursor:pointer;font-size:14px">›</button>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;font-size:10px;color:var(--text3);margin-bottom:4px">' +
        ['أح','إث','ث','أر','خ','ج','س'].map(function(d){return '<div>'+d+'</div>';}).join('') +
      '</div>' +
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">';
    // Empty cells
    var adjustedFirst = (firstDay + 1) % 7;
    for (var i = 0; i < adjustedFirst; i++) html += '<div></div>';
    var today = new Date();
    for (var d = 1; d <= daysInMonth; d++) {
      var date = new Date(y, m, d);
      var isPast = date < today && !(d===today.getDate()&&m===today.getMonth()&&y===today.getFullYear());
      var isWeekend = date.getDay() === 5 || date.getDay() === 6;
      var dateStr = y+'-'+(m+1<10?'0'+(m+1):(m+1))+'-'+(d<10?'0'+d:d);
      html += '<div onclick="'+(isPast||isWeekend?'':'calSelect(\''+dateStr+'\')')+'" style="padding:5px 2px;border-radius:5px;font-size:11px;cursor:'+(isPast||isWeekend?'not-allowed':'pointer')+';color:'+(isPast?'var(--text3)':isWeekend?'var(--red)':'var(--text)')+';background:transparent;transition:background .1s;text-align:center" onmouseover="'+(isPast||isWeekend?'':'this.style.background=\'rgba(235,200,76,.2)\'')+'" onmouseout="this.style.background=\'transparent\'" id="cal-d-'+d+'">'+d+'</div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
    container._onSelect = onSelect;
    container._year = y; container._month = m;
  }
  
  window.calNav = function(dir) {
    month += dir;
    if (month > 11) { month = 0; year++; }
    if (month < 0) { month = 11; year--; }
    draw(year, month);
  };
  window.calSelect = function(dateStr) {
    container.querySelectorAll('[id^="cal-d-"]').forEach(function(el){ el.style.background='transparent'; el.style.fontWeight=''; });
    var day = parseInt(dateStr.split('-')[2]);
    var dayEl = document.getElementById('cal-d-'+day);
    if (dayEl) { dayEl.style.background='var(--gold)'; dayEl.style.fontWeight='700'; }
    if (container._onSelect) container._onSelect(dateStr);
  };
  
  draw(year, month);
}

// ── Render helpers ────────────────────────────────────────
function renderLogos() {
  document.querySelectorAll('[data-logo]').forEach(function(el) {
    var size = el.dataset.logo || '36';
    el.innerHTML = LOGO_SVG.replace(/width="36"/g,'width="'+size+'"').replace(/height="36"/g,'height="'+size+'"');
  });
}




// ── Image URL normalizer ──────────────────────────────────
// Converts Google Drive share/preview links to direct image URLs
function normalizeImageUrl(url) {
  if (!url || !url.trim()) return url;
  url = url.trim();

  // Extract Google Drive file ID from any Drive URL
  var driveId = null;

  // /file/d/FILE_ID/view or /file/d/FILE_ID/preview
  var m1 = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m1) driveId = m1[1];

  // open?id=FILE_ID
  var m2 = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (m2) driveId = m2[1];

  // uc?id=FILE_ID or uc?export=view&id=FILE_ID
  var m3 = url.match(/drive\.google\.com\/uc\?(?:[^&]+&)?id=([a-zA-Z0-9_-]+)/);
  if (m3) driveId = m3[1];

  // thumbnail?id=FILE_ID
  var m4 = url.match(/drive\.google\.com\/thumbnail\?(?:[^&]+&)?id=([a-zA-Z0-9_-]+)/);
  if (m4) driveId = m4[1];

  if (driveId) {
    // thumbnail API: works cross-origin, no redirect issues
    // sz=w1200 gives high resolution
    return 'https://drive.google.com/thumbnail?id=' + driveId + '&sz=w1200';
  }

  // Not a Drive URL — return as-is
  return url;
}

// ── Video URL normalizer ──────────────────────────────────
function normalizeVideoUrl(url) {
  if (!url || !url.trim()) return null;
  url = url.trim();
  if (url.includes('/preview') || url.includes('/embed') ||
      url.includes('player.vimeo') || url.includes('youtube.com/embed')) {
    return url;
  }
  var driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return 'https://drive.google.com/file/d/' + driveMatch[1] + '/preview';
  var driveOpen = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (driveOpen) return 'https://drive.google.com/file/d/' + driveOpen[1] + '/preview';
  var ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return 'https://www.youtube.com/embed/' + ytMatch[1] + '?rel=0';
  var vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return 'https://player.vimeo.com/video/' + vimeoMatch[1];
  return url;
}

function isDirectVideo(url) {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

// ── Image Carousel ────────────────────────────────────────
// Extract Google Drive file ID from any Drive URL
function extractDriveId(url) {
  if (!url) return null;
  var patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?(?:[^&]+&)*id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?(?:[^&]+&)*id=([a-zA-Z0-9_-]+)/
  ];
  for (var i = 0; i < patterns.length; i++) {
    var m = url.match(patterns[i]);
    if (m) return m[1];
  }
  return null;
}


// Usage in lesson content HTML:
//   <div class="carousel" data-carousel='[
//     {"src":"https://...","caption":"وصف الصورة"},
//     {"src":"https://...","caption":""},
//     {"src":"https://..."}
//   ]' data-height="320"></div>
//
// Or call directly: renderCarousel(el, slides, height)

function renderCarousel(el, slides, height) {
  if (!slides || !slides.length) return;

  // height param is now optional — if omitted or 0, carousel auto-sizes to image
  var fixedHeight = height && parseInt(height) > 0 ? parseInt(height) : 0;
  var current = 0;

  // Outer wrapper — no fixed height unless explicitly set
  if (fixedHeight) {
    el.style.height = fixedHeight + 'px';
  } else {
    el.style.height = 'auto';
    el.style.minHeight = '80px';
  }

  // Track
  var track = document.createElement('div');
  track.className = 'carousel-track';
  track.style.height = fixedHeight ? fixedHeight + 'px' : 'auto';

  slides.forEach(function(slide, idx) {
    var slideEl = document.createElement('div');
    slideEl.className = 'carousel-slide';
    if (fixedHeight) { slideEl.style.height = fixedHeight + 'px'; slideEl.style.overflow = 'hidden'; }

    var rawSrc = slide.src || slide;
    var driveId = extractDriveId(rawSrc);

    if (driveId) {
      // Google Drive: iframe — use fixed height or fallback to 400px
      var iframeH = fixedHeight || 420;
      slideEl.style.height = iframeH + 'px';
      slideEl.style.background = 'var(--warm3)';
      if (!fixedHeight) track.style.height = iframeH + 'px';
      var iframe = document.createElement('iframe');
      iframe.src = 'https://drive.google.com/file/d/' + driveId + '/preview?rm=minimal';
      iframe.style.cssText = 'width:100%;height:' + iframeH + 'px;border:none;display:block';
      iframe.setAttribute('allow', 'autoplay');
      iframe.setAttribute('allowfullscreen', '');
      slideEl.appendChild(iframe);
    } else {
      // Regular image — let it define the height naturally
      var img = document.createElement('img');
      img.src = rawSrc;
      img.alt = slide.caption || '';
      img.style.cssText = 'width:100%;display:block;' + (fixedHeight ? 'height:' + fixedHeight + 'px;object-fit:cover;' : 'height:auto;');

      if (!fixedHeight) {
        // When first image loads, set track height to match
        img.onload = (function(t, s, i) {
          return function() {
            if (i === 0) {
              // Set all slide heights to match first image
              var h = this.naturalHeight * (el.offsetWidth / this.naturalWidth);
              t.style.height = h + 'px';
              Array.prototype.forEach.call(t.children, function(ch){ ch.style.height = h + 'px'; });
            }
          };
        })(track, slideEl, idx);
      }

      img.onerror = function() {
        this.parentNode.innerHTML =
          '<div style="width:100%;padding:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--warm2);color:var(--text3);gap:8px;text-align:center">' +
            '<span style="font-size:28px">🖼️</span>' +
            '<span style="font-size:13px;font-weight:600">تعذّر تحميل الصورة</span>' +
            '<span style="font-size:11px;color:var(--text3)">تأكد أن الرابط صحيح ومتاح للعموم</span>' +
          '</div>';
      };
      slideEl.appendChild(img);
    }

    if (slide.caption) {
      var cap = document.createElement('div');
      cap.className = 'slide-caption';
      cap.textContent = slide.caption;
      slideEl.appendChild(cap);
    }
    track.appendChild(slideEl);
  });

  el.appendChild(track);

  // Navigation (only needed for multiple slides)
  if (slides.length > 1) {
    var prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-btn prev';
    prevBtn.innerHTML = '›';
    prevBtn.title = 'السابق';
    prevBtn.onclick = function(e) { e.stopPropagation(); go(current - 1); };

    var nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-btn next';
    nextBtn.innerHTML = '‹';
    nextBtn.title = 'التالي';
    nextBtn.onclick = function(e) { e.stopPropagation(); go(current + 1); };

    el.appendChild(prevBtn);
    el.appendChild(nextBtn);

    // Dots
    var dotsRow = document.createElement('div');
    dotsRow.className = 'carousel-dots';
    var dots = [];
    slides.forEach(function(_, i) {
      var dot = document.createElement('button');
      dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
      dot.onclick = function(e) { e.stopPropagation(); go(i); };
      dotsRow.appendChild(dot);
      dots.push(dot);
    });
    el.appendChild(dotsRow);

    // Touch swipe
    var touchStartX = 0;
    el.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, {passive: true});
    el.addEventListener('touchend', function(e) {
      var diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) go(diff > 0 ? current + 1 : current - 1);
    }, {passive: true});

    function go(n) {
      current = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(' + (current * 100) + '%)';
      dots.forEach(function(d, i) {
        d.className = 'carousel-dot' + (i === current ? ' active' : '');
      });
    }
  }
}

// Auto-initialize any carousel in rendered content
function initCarousels(container) {
  var carousels = (container || document).querySelectorAll('[data-carousel]');
  carousels.forEach(function(el) {
    if (el.dataset.initialized) return;
    el.dataset.initialized = '1';
    try {
      var slides = JSON.parse(el.dataset.carousel);
      var height = parseInt(el.dataset.height || '320');
      renderCarousel(el, slides, height);
    } catch(e) { console.warn('Carousel parse error:', e); }
  });
}

// ── Admin content overrides ───────────────────────────────
function getAdminStageContent(stageId) {
  try {
    var override = JSON.parse(localStorage.getItem('sh_stage_content_' + stageId) || 'null');
    return override;
  } catch(e) { return null; }
}

function getAdminStageQuiz(stageId) {
  try {
    var override = JSON.parse(localStorage.getItem('sh_stage_quiz_' + stageId) || 'null');
    return override && override.length ? override : null;
  } catch(e) { return null; }
}

function getAdminStageVideo(stageId) {
  try {
    return localStorage.getItem('sh_stage_video_' + stageId) || null;
  } catch(e) { return null; }
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  loadState();
  renderLogos();
  renderGreetingBar();
  initChatbot();
});
