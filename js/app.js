/* ===== Menu game, cài đặt, nhập từ vựng / câu hỏi ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
let root = null;

function loadHand() {
  const t = NS.LS.get('pg-questions-text', '');
  NS.handAll = t ? NS.parseQuestions(t) : { questions: [], cardSets: [], puzzles: [], lessons: [] };
  NS.applyLesson();
  NS.handText = t;
}
NS.loadHand = loadHand;

function modal(title, body, onClose) {
  let tok = 0, m = null;
  const release = () => { if (tok && window.NAV) { const t = tok; tok = 0; NAV.done(t); } };
  const close = fromBack => { if (!m.isConnected) return; rm(); if (fromBack) tok = 0; else release(); onClose && onClose(); };
  m = h('div', { class: 'gmodal' }, h('div', { class: 'gbox pix' }, h('div', { class: 'ghead' },
    h('button', { class: 'small', type: 'button', onclick: () => close() }, '◀ Quay lại'), h('h2', {}, title), h('button', { class: 'small red', type: 'button', onclick: () => close() }, '✕')), body));
  const rm = Element.prototype.remove.bind(m);
  m.remove = () => { rm(); release(); }; /* các chỗ khác gọi m.remove() trực tiếp vẫn đồng bộ lịch sử */
  root.append(m); if (window.NAV) tok = NAV.push(() => close(true));
  return m;
}
NS.modal = modal;
const toggle = (label, val, on) => { const c = h('input', { type: 'checkbox' }); c.checked = !!val; c.addEventListener('change', () => on(c.checked)); return h('label', { class: 'tg' }, c, ' ' + label); };
const select = (choices, val, on) => { const s = h('select', {}, choices.map(([v, t]) => h('option', { value: v }, t))); s.value = String(val); s.addEventListener('change', () => on(s.value)); return s; };

function renderMenu() {
  if (NS.curShell) NS.curShell.destroy();
  root.innerHTML = '';
  NS.refreshTeams();
  const v = NS.vocab;
  const cards = h('div', { class: 'gcards' }, NS.games.map(g => {
    const c = h('button', { class: 'gcard', type: 'button' }, h('span', { class: 'gic' }, g.icon), h('b', {}, g.name), h('small', {}, g.desc));
    c.addEventListener('click', () => startDialog(g)); return c;
  }));
  const status = h('div', { class: 'gstatus' }, '📚 Từ vựng: ' + v.words.length + ' từ · ' + v.topics.length + ' chủ đề · nguồn: ' + v.source + ' · bản ' + NS.BUILD + (NS.hand.questions.length + NS.hand.cardSets.length + NS.hand.puzzles.length ? ' · ✍ ' + NS.hand.questions.length + ' câu, ' + NS.hand.cardSets.length + ' bộ thẻ, ' + NS.hand.puzzles.length + ' ô chữ soạn tay' : ''));
  const tools = h('div', { class: 'gtools' },
    h('button', { type: 'button', onclick: settingsDialog }, '⚙ Cài đặt chung'),
    h('button', { type: 'button', onclick: vocabDialog }, '📚 Từ vựng'),
    h('button', { type: 'button', onclick: () => NS.contentDialog() }, '📝 Soạn nội dung từng game'),
    h('button', { type: 'button', class: 'small', onclick: questionDialog }, '🧰 Cú pháp chung (cũ)'),
    h('button', { type: 'button', onclick: () => guideDialog() }, '📖 Ký hiệu Đấu trường'),
    h('button', { type: 'button', onclick: musicDialog }, '🎵 Nhạc nền'),
    h('button', { type: 'button', onclick: async () => { const r = window.syncNow ? await window.syncNow() : { msg: 'Chưa tải xong phần đồng bộ, thử lại sau vài giây.' }; alert(r.msg); } }, '🔄 Đồng bộ ngay'),
    h('button', { type: 'button', onclick: voiceTest }, '🔊 Thử giọng đọc'));
  const how = h('div', { class: 'ghow' }, '👫 Hai bạn ngồi hai bên: ', h('b', {}, NS.TEAM_ICON[0] + ' ' + NS.cfg.teams[0]), ' và ', h('b', {}, NS.TEAM_ICON[1] + ' ' + NS.cfg.teams[1]), (NS.cfg.split ? ' (màn hình chia đôi: bạn thứ nhất ngồi phía dưới, bạn thứ hai ngồi phía đối diện). ' : '. '), 'Chọn một trò chơi để bắt đầu!');
  const lessons = (NS.handAll && NS.handAll.lessons) || [];
  const lessonPick = lessons.length ? h('div', { class: 'glesson' }, h('b', {}, '📖 Dùng bài soạn tay: '), select([['', 'Tất cả các bài']].concat(lessons.map(l => [l, l])), NS.cfg.lesson || '', v => { NS.cfg.lesson = v; NS.saveCfg(); NS.applyLesson(); renderMenu(); }), h('small', {}, ' (đổi "Nguồn câu hỏi" sang Trộn/Chỉ soạn tay trong Cài đặt chung để dùng)')) : null;
  root.append(h('div', { class: 'gmenuhead' }, h('button', { class: 'small', type: 'button', onclick: () => window.showTab && window.showTab('learn') }, '◀ Quay lại bảng thành tích'), h('h2', { class: 'gh2' }, '🎮 CHỌN TRÒ CHƠI')), how, lessonPick, cards, status, tools);
}
NS.renderMenu = renderMenu;

function startDialog(g) {
  const saved = NS.LS.get('pg-opt-' + g.id, {}), opt = {};
  g.options.forEach(o => { opt[o.key] = saved[o.key] !== undefined ? saved[o.key] : o.def; });
  const body = h('div', { class: 'gform' }), sels = {};
  g.options.forEach(o => {
    if (o.type === 'select') { const el = select(o.choices, opt[o.key], v => { opt[o.key] = isNaN(+v) ? v : +v; }); sels[o.key] = el; body.append(h('label', {}, o.label), el); }
    else if (o.type === 'toggle') body.append(toggle(o.label, opt[o.key], v => { opt[o.key] = v; }));
    else if (o.type === 'text') {
      const inp = h('input', { type: 'text', value: opt[o.key] || '', maxlength: 24 }); inp.addEventListener('input', () => { opt[o.key] = inp.value; });
      const pickSug = it => { if (it.set) { Object.keys(it.set).forEach(k => { opt[k] = it.set[k]; if (sels[k]) sels[k].value = String(it.set[k]); }); } else { inp.value = it.text; opt[o.key] = it.text; if (sels.src) { opt.src = 'auto'; sels.src.value = 'auto'; } } };
      body.append(h('label', {}, o.label), inp, o.suggest ? h('div', { class: 'sugg' }, o.suggest.map(s => { const it = typeof s === 'string' ? { text: s } : s; return h('button', { class: 'small' + (it.set ? ' mine' : ''), type: 'button', onclick: () => pickSug(it) }, (it.set ? '✍ ' : '') + it.text); })) : null);
    }
  });
  const guideBtn = g.guide ? h('button', { type: 'button', onclick: () => guideDialog(opt.map) }, '📖 Hướng dẫn ký hiệu') : null;
  const cdef = NS.content && NS.content.defs[g.id], cn = cdef ? NS.content.items(g.id).length : 0;
  const contentBox = cdef && cdef.parse ? h('div', { class: 'gcontent' }, h('div', {}, cn ? '✍ Có ' + cn + ' ' + cdef.unit + ' do bạn soạn cho game này.' : '✍ Chưa có nội dung soạn riêng: game dùng kho từ vựng.'), cn ? toggle('Dùng nội dung soạn riêng', NS.content.on(g.id), v => NS.content.setOn(g.id, v)) : null, h('button', { class: 'small', type: 'button', onclick: () => NS.contentDialog(g.id) }, '📝 Soạn / sửa nội dung cho game này')) : null;
  const m = modal(g.icon + ' ' + g.name, h('div', {}, h('p', {}, g.desc), contentBox, body, h('div', { class: 'rbtns' }, guideBtn, h('button', { class: 'green', type: 'button', onclick: () => { NS.LS.set('pg-opt-' + g.id, opt); m.remove(); launch(g, opt); } }, '▶ BẮT ĐẦU'))));
}
function launch(g, opt) {
  NS.handUsed.clear();
  const go = () => { root.innerHTML = ''; g.start({ root, opt, restart: () => launch(g, opt), exit: renderMenu }); };
  go();
}

function settingsDialog() {
  const c = NS.cfg, save = () => NS.saveCfg();
  const topics = h('div', { class: 'tgrid' }, NS.vocab.topics.map((t, i) => {
    const n = NS.vocab.words.filter(w => w.topics.includes(i)).length;
    return toggle(t + ' (' + n + ')', !c.topics.length || c.topics.includes(i), on => {
      let cur = c.topics.length ? c.topics.slice() : NS.vocab.topics.map((_, k) => k);
      cur = on ? [...new Set(cur.concat(i))] : cur.filter(x => x !== i);
      c.topics = cur.length === NS.vocab.topics.length ? [] : cur; save();
    });
  }));
  const n0 = h('input', { type: 'text', value: c.teams[0], maxlength: 14 }), n1 = h('input', { type: 'text', value: c.teams[1], maxlength: 14 });
  [n0, n1].forEach((e, i) => e.addEventListener('input', () => { c.teams[i] = e.value.trim() || NS.TEAM_TAG[i]; save(); }));
  const body = h('div', { class: 'gform' },
    h('label', {}, 'Tên hai đội'), h('div', { class: 'two' }, h('span', {}, NS.TEAM_ICON[0] + ' CAM', n0), h('span', {}, NS.TEAM_ICON[1] + ' XANH', n1)),
    (typeof S !== 'undefined' && S.students && S.students.length > 1) ? h('button', { class: 'small', type: 'button', onclick: () => { c.teams = [S.students[0].name, S.students[1].name]; n0.value = c.teams[0]; n1.value = c.teams[1]; save(); } }, '↧ Lấy tên từ bảng thành tích') : null,
    h('label', {}, 'Chủ đề từ vựng'), topics,
    toggle('Bao gồm cụm từ (nhiều từ)', c.phrases, v => { c.phrases = v; save(); }),
    h('label', {}, 'Độ khó đáp án nhiễu'), select([[1, 'Dễ (ngẫu nhiên)'], [2, 'Vừa (cùng chủ đề)'], [3, 'Khó (gần giống)']], c.level, v => { c.level = +v; save(); }),
    h('label', {}, 'Chiều hỏi'), select([['mix', 'Xen kẽ'], ['vi2en', 'Việt → Anh'], ['en2vi', 'Anh → Việt']], c.dir, v => { c.dir = v; save(); }),
    h('label', {}, 'Nguồn câu hỏi'), select([['auto', 'Tự sinh từ kho từ vựng'], ['hand', 'Chỉ dùng câu soạn tay'], ['mix', 'Trộn cả hai']], c.source, v => { c.source = v; save(); }),
    toggle('📱 Chia đôi màn hình: hai bạn ngồi hai đầu tablet, mỗi bạn một nửa (nửa trên xoay ngược)', c.split, v => { c.split = v; save(); }),
    h('p', { class: 'note' }, 'Hình con vật đại diện lấy từ mục "Hình đại diện" của từng học sinh trong tab Quá trình học (nút ⚙ Cài đặt).'),
    toggle('Âm thanh hiệu ứng', c.sound, v => { c.sound = v; save(); }), toggle('Rung khi chạm', c.vibrate, v => { c.vibrate = v; save(); }),
    toggle('Ưu tiên file âm thanh thu sẵn audio/<từ>.mp3', c.audioFiles, v => { c.audioFiles = v; save(); }),
    h('div', { class: 'rbtns' }, h('button', { class: 'small red', type: 'button', onclick: () => { NS.clearWrong(); NS.clearPuzzleUsed && NS.clearPuzzleUsed(); alert('Đã xóa thống kê từ hay sai và lịch sử ô chữ.'); } }, 'Xóa thống kê từ sai / lịch sử ô chữ')));
  modal('⚙ Cài đặt chung', body, renderMenu);
}

function vocabDialog() {
  const v = NS.vocab;
  const ta = h('textarea', { class: 'bigta', placeholder: '## 1. Tên chủ đề\n```\nlamp /læmp/ :: đèn\n```' });
  const msg = h('div', { class: 'gmsg' });
  const body = h('div', { class: 'gform' },
    h('p', {}, 'Đang dùng: ', h('b', {}, v.words.length + ' từ'), ' · ' + v.topics.length + ' chủ đề · nguồn ' + v.source + (v.warn.length ? ' · ⚠ ' + v.warn.length + ' dòng bị bỏ qua' : '')),
    h('ul', { class: 'tl' }, v.topics.map((t, i) => h('li', {}, t + ': ' + v.words.filter(w => w.topics.includes(i)).length + ' từ'))),
    h('p', { class: 'note' }, 'Để dùng từ vựng thật: đặt file ', h('code', {}, 'data/vocab.txt'), ' cạnh index.html (rồi đẩy lên GitHub), hoặc dán nội dung vào ô dưới.'),
    ta, msg,
    h('div', { class: 'rbtns' },
      h('button', { class: 'green', type: 'button', onclick: () => { const r = NS.parseVocab(ta.value); if (!r.words.length) { msg.textContent = '❌ Không đọc được từ nào. Kiểm tra định dạng (tiêu đề "## 1. ..." và khối ```).'; return; } NS.LS.set('pg-vocab-text', ta.value); NS.setVocab(ta.value, 'đã nhập tay'); msg.textContent = '✔ Đã dùng ' + r.words.length + ' từ, ' + r.topics.length + ' chủ đề' + (r.warn.length ? ' (bỏ qua ' + r.warn.length + ' dòng lỗi: ' + r.warn.slice(0, 3).join('; ') + ')' : ''); NS.cfg.topics = []; NS.saveCfg(); } }, 'Dùng bộ từ này'),
      h('button', { class: 'small red', type: 'button', onclick: async () => { NS.LS.set('pg-vocab-text', null); await NS.loadVocab(); msg.textContent = '↺ Đã quay về nguồn: ' + NS.vocab.source + ' (' + NS.vocab.words.length + ' từ)'; } }, 'Bỏ từ đã nhập')));
  modal('📚 Từ vựng', body, renderMenu);
}

function questionDialog() {
  let mode = 'replace';
  const ta = h('textarea', { class: 'bigta', spellcheck: 'false' }); ta.value = NS.handText || '';
  const rep = h('div', { class: 'report' }), saved = h('div', { class: 'gmsg' });
  const showSaved = () => { const a = NS.handAll || { questions: [], cardSets: [], puzzles: [], lessons: [] }; saved.textContent = '💾 Đang lưu: ' + a.questions.length + ' câu · ' + a.cardSets.length + ' bộ thẻ · ' + a.puzzles.length + ' ô chữ' + (a.lessons && a.lessons.length ? ' · bài: ' + a.lessons.join(', ') : ''); };
  showSaved();
  const countBy = (r) => { const m = {}; r.questions.forEach(q => { const k = q.lesson || '(chưa gán bài)'; m[k] = m[k] || { q: 0, c: 0, p: 0 }; m[k].q++; }); r.cardSets.forEach(c => { const k = c.lesson || '(chưa gán bài)'; m[k] = m[k] || { q: 0, c: 0, p: 0 }; m[k].c++; }); r.puzzles.forEach(p => { const k = p.lesson || '(chưa gán bài)'; m[k] = m[k] || { q: 0, c: 0, p: 0 }; m[k].p++; }); return m; };
  const check = () => {
    const r = NS.parseQuestions(ta.value), st = r.stats;
    rep.innerHTML = '';
    rep.append(h('div', { class: 'rsum' }, '📊 ' + r.total + ' khối · ✔ ' + (r.questions.length + r.cardSets.length + r.puzzles.length) + ' hợp lệ (' + r.questions.length + ' câu, ' + r.cardSets.length + ' bộ thẻ, ' + r.puzzles.length + ' ô chữ) · ❌ ' + r.errors.length + ' lỗi · ⚠ ' + r.warnings.length + ' cảnh báo'),
      Object.keys(st.type).length ? h('div', { class: 'rsub' }, 'Theo dạng: ' + Object.keys(st.type).map(k => k + '=' + st.type[k]).join(', ') + ' · Độ khó: ' + Object.keys(st.diff).map(k => ['', 'Dễ', 'Vừa', 'Khó'][k] + '=' + st.diff[k]).join(', ')) : null,
      h('div', { class: 'rsub' }, '📖 Theo bài: ' + (Object.entries(countBy(r)).map(([k, v]) => k + ' (' + v.q + ' câu, ' + v.c + ' thẻ, ' + v.p + ' ô chữ)').join(' · ') || 'chưa có')));
    const item = (e, cls) => h('button', { class: 'ritem ' + cls, type: 'button', onclick: () => { const ls = ta.value.split(/\r\n|\r|\n/); let pos = 0; for (let i = 0; i < e.line - 1; i++) pos += ls[i].length + 1; ta.focus(); ta.setSelectionRange(pos, pos + (ls[e.line - 1] || '').length); } },
      h('b', {}, e.code + ' · dòng ' + e.line), ' ' + e.msg, e.excerpt ? h('code', {}, e.excerpt) : null, e.hint ? h('i', {}, '💡 ' + e.hint) : null);
    r.errors.slice(0, 60).forEach(e => rep.append(item(e, 'err'))); r.warnings.slice(0, 60).forEach(e => rep.append(item(e, 'wrn')));
    return r;
  };
  const sel = select([['replace', 'Thay toàn bộ nội dung đang lưu bằng ô bên dưới'], ['append', 'NỐI THÊM vào cuối nội dung đang lưu (dán nhiều lần, nhiều bài)']], 'replace', v => {
    mode = v; if (v === 'append') { ta.value = ''; ta.placeholder = 'Dán nội dung MỚI ở đây (nhiều bài, nhiều dạng, nhiều game cùng lúc đều được). Nội dung cũ vẫn được giữ.'; } else { ta.value = NS.handText || ''; ta.placeholder = ''; }
    rep.innerHTML = '';
  });
  const importIt = () => {
    const r = check(); const base = NS.handText || '';
    const text = mode === 'append' && base.trim() ? base.replace(/\s+$/, '') + '\n\n' + ta.value : ta.value;
    NS.LS.set('pg-questions-text', text); loadHand(); showSaved();
    rep.prepend(h('div', { class: 'rsum ok' }, '✔ Đã ' + (mode === 'append' ? 'nối thêm ' : 'nhập ') + (r.questions.length + r.cardSets.length + r.puzzles.length) + ' mục hợp lệ. Khối lỗi bị bỏ qua. Chọn "Nguồn câu hỏi" trong Cài đặt để dùng.'));
    if (mode === 'append') ta.value = '';
  };
  const body = h('div', { class: 'gform' },
    h('p', { class: 'note' }, 'Nhập NHIỀU bài, NHIỀU dạng game, NHIỀU câu trong cùng một lần dán. Chia bài bằng dòng ', h('code', {}, '@bài: Tên bài'), ' (áp dụng cho mọi khối bên dưới đến khi gặp dòng ', h('code', {}, '@bài:'), ' khác hoặc ', h('code', {}, '@hết'), '); chia mức bằng ', h('code', {}, '== DỄ =='), ' / ', h('code', {}, '== VỪA =='), ' / ', h('code', {}, '== KHÓ =='), '. Câu hỏi: ', h('code', {}, 'Câu 1: ...'), '; thẻ: ', h('code', {}, 'Bộ thẻ: tên'), '; ô chữ: ', h('code', {}, 'Ô chữ: TỪ KHÓA'), '. Từ chưa có trong kho từ vựng vẫn được nhận (chỉ cảnh báo, bạn tự duyệt).'),
    h('label', {}, 'Chế độ nhập'), sel, saved, ta, rep,
    h('div', { class: 'rbtns' },
      h('button', { type: 'button', onclick: check }, '🔍 Kiểm tra'),
      h('button', { class: 'green', type: 'button', onclick: importIt }, '✔ Nhập các khối hợp lệ'),
      h('button', { class: 'small', type: 'button', onclick: () => { const r = NS.parseQuestions(NS.handText || ''), t = NS.serializeQuestions(r); const a = h('a', { href: URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' })), download: 'cau-hoi-da-luu.txt' }); document.body.append(a); a.click(); a.remove(); } }, '⬇ Tải toàn bộ đã lưu'),
      h('button', { class: 'small red', type: 'button', onclick: () => { if (confirm('Xóa toàn bộ câu hỏi soạn tay đã lưu?')) { ta.value = ''; NS.LS.set('pg-questions-text', ''); loadHand(); showSaved(); rep.innerHTML = ''; } } }, 'Xóa hết')));
  modal('📝 Soạn câu hỏi', body, renderMenu);
}

function voiceTest() {
  if (!NS.hasTTS()) { alert('Trình duyệt này không hỗ trợ giọng đọc.'); return; }
  const v = NS.enVoice(); NS.speak('Hello! This is a test of the English voice.');
  if (!v) alert('Chưa tìm thấy giọng tiếng Anh. Hãy cài giọng English (US/UK) trong phần cài đặt giọng nói của thiết bị.');
}

NS.reloadFromStorage = async function () {
  const saved = NS.LS.get('pg-cfg', null); if (saved) Object.assign(NS.cfg, saved);
  if (NS.content) NS.content.load();
  await NS.loadVocab(); loadHand();
  if (root && !NS.curShell && root.querySelector('.gcards')) renderMenu();
};
NS.initGameUI = async function () {
  root = document.getElementById('gameRoot'); if (!root) return;
  await NS.loadVocab(); loadHand(); NS.music.load(); renderMenu();
  if (NS.hasTTS()) { try { speechSynthesis.getVoices(); } catch (e) {} }
};
})();

/* ===== Hướng dẫn ký hiệu + nhạc nền (mở từ menu) ===== */
(function () {
  const NS = window.PG, h = NS.h;
  const root = () => document.getElementById('gameRoot');
  const mod = (title, body, onClose) => NS.modal(title, body, onClose);
  const modOld = (title, body, onClose) => {
    const m = h('div', { class: 'gmodal' }, h('div', { class: 'gbox pix' }, h('div', { class: 'ghead' }, h('h2', {}, title), h('button', { class: 'small red', type: 'button', onclick: () => { m.remove(); onClose && onClose(); } }, '✕')), body));
    root().append(m); return m;
  };
  window.guideDialog = function (mapId) { mod('📖 Hướng dẫn ký hiệu — Đấu trường', NS.arenaGuide(mapId)); };
  window.musicDialog = async function () {
    await NS.music.load();
    const M = NS.music, st = h('div', { class: 'gmsg' });
    const vol = h('input', { type: 'range', min: 0, max: 100, value: Math.round(M.vol * 100) }); vol.addEventListener('input', () => { M.vol = vol.value / 100; });
    const tg = h('label', { class: 'tg' }), cb = h('input', { type: 'checkbox' }); cb.checked = M.on; cb.addEventListener('change', () => { M.on = cb.checked; if (!cb.checked) M.stop(); });
    tg.append(cb, ' Bật nhạc nền khi chơi game');
    const list = M.list.length ? h('ol', { class: 'tl' }, M.list.map((t, i) => h('li', {}, h('span', {}, t.name + ' '), h('button', { class: 'small', type: 'button', onclick: () => { M.on = true; cb.checked = true; M.play(false, i); st.textContent = '▶ Đang nghe thử: ' + t.name; } }, '▶ Nghe thử')))) :
      h('p', { class: 'note' }, 'Chưa có bài nào. Để thêm nhạc: (1) chép file mp3 vào thư mục ', h('code', {}, 'music/'), ' cạnh index.html; (2) tạo file ', h('code', {}, 'music/list.txt'), ', mỗi dòng một bài, dạng ', h('code', {}, 'Tên bài | ten-file.mp3'), ' hoặc chỉ ', h('code', {}, 'ten-file.mp3'), '; (3) đẩy lên GitHub. Nhạc sẽ tự phát khi chơi, tự giảm nhỏ khi máy đọc từ.');
    mod('🎵 Nhạc nền', h('div', { class: 'gform' }, tg, h('label', {}, 'Âm lượng'), vol, list, st, h('div', { class: 'rbtns' }, h('button', { class: 'small', type: 'button', onclick: () => { M.stop(); st.textContent = '■ Đã dừng'; } }, '■ Dừng'))), () => M.stop());
  };
})();
