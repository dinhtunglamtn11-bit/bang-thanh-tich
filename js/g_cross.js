/* ===== GAME 2: Ô CHỮ GHÉP TỪ KHÓA (bộ tạo + trò chơi) ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];
const BANNED = /in|on|at|the/i;
const keyLetters = k => String(k).toUpperCase().replace(/[^A-Z]/g, '');

/* Kiểm tra tính hợp lệ của ô chữ (dùng cho cả tạo tự động lẫn kiểm thử). Trả về mảng lỗi. */
NS.validatePuzzle = function (p) {
  const bad = [], L = keyLetters(p.keyword), N = L.length;
  if (p.rows.length !== N) bad.push('Số hàng ' + p.rows.length + ' khác số chữ cái ' + N);
  const slots = p.rows.map(r => r.slot).sort((a, b) => a - b);
  if (slots.some((s, i) => s !== i + 1)) bad.push('Ô số không phải hoán vị 1..' + N);
  const assembled = [];
  p.rows.forEach(r => { const w = r.word.toUpperCase(); const c = w[r.hi - 1]; assembled[r.slot - 1] = c; if (c !== L[r.slot - 1]) bad.push('Ô cam của "' + r.word + '" không khớp từ khóa'); });
  if (assembled.join('') !== L) bad.push('Ghép ô cam theo Ô số không ra từ khóa');
  const seen = new Set();
  p.rows.forEach(r => {
    const w = r.word.toLowerCase();
    if (!/^[a-z]+$/.test(w)) bad.push('"' + r.word + '" không phải từ đơn'); if (BANNED.test(w)) bad.push('"' + r.word + '" chứa in/on/at/the');
    if (seen.has(w)) bad.push('Trùng từ "' + r.word + '"'); seen.add(w);
  });
  for (let i = 1; i < p.rows.length; i++) if (p.rows[i].hi === p.rows[i - 1].hi) bad.push('Hai hàng liền kề cùng cột ô cam (hàng ' + i + ' và ' + (i + 1) + ')');
  return bad;
};

NS.puzzleUsed = () => NS.LS.get('pg-puzzle-used', []);
NS.clearPuzzleUsed = () => NS.LS.set('pg-puzzle-used', []);

/* Bộ tạo ô chữ: trả {puzzle} hoặc {error} */
NS.genPuzzle = function (keyword, o) {
  o = o || {};
  const L = keyLetters(keyword), N = L.length;
  if (N < 3) return { error: 'Từ khóa cần ít nhất 3 chữ cái.' };
  const minLen = o.minLen || 3, maxLen = o.maxLen || 9, rnd = o.rnd || NS.rand;
  const base = (o.pool || NS.pool({ phrases: false })).filter(w => !w.isPhrase && /^[A-Za-z]+$/.test(w.text) && !w.maybePlural && !w.isProper && !w.hasBannedSub && w.length >= minLen && w.length <= maxLen);
  const attemptWith = used => {
    const cand = base.filter(w => !used.has(w.id));
    const byLetter = {};
    for (const c of new Set(L)) byLetter[c] = cand.filter(w => w.text.toUpperCase().includes(c));
    for (const c of Object.keys(byLetter)) if (!byLetter[c].length) return { error: 'Kho từ vựng chưa có từ nào chứa chữ "' + c + '" (thỏa quy tắc: từ đơn, không số nhiều, không tên riêng, không chứa in/on/at/the).' };
    for (let attempt = 0; attempt < 400; attempt++) {
      const order = NS.shuffle([...Array(N).keys()], rnd).sort((a, b) => byLetter[L[a]].length - byLetter[L[b]].length + (rnd() - .5) * 3);
      const chosen = new Array(N), usedW = new Set(), topicCount = {}; let fail = false;
      for (const k of order) {
        const opts = byLetter[L[k]].filter(w => !usedW.has(w.id));
        if (!opts.length) { fail = true; break; }
        const sc = opts.map(w => 1 / (1 + (topicCount[w.topics[0]] || 0)) + rnd() * .6);
        const w = opts[sc.indexOf(Math.max(...sc))];
        usedW.add(w.id); topicCount[w.topics[0]] = (topicCount[w.topics[0]] || 0) + 1;
        const idxs = []; [...w.text.toUpperCase()].forEach((c, i) => { if (c === L[k]) idxs.push(i + 1); });
        chosen[k] = { w, slot: k + 1, hiOpts: idxs };
      }
      if (fail) continue;
      for (let s = 0; s < 3000; s++) {
        const perm = NS.shuffle(chosen, rnd).map(r => ({ w: r.w, slot: r.slot, hiOpts: r.hiOpts, hi: NS.pick(r.hiOpts, rnd) }));
        let ok = true; for (let i = 1; i < perm.length; i++) if (perm[i].hi === perm[i - 1].hi) { ok = false; break; }
        if (!ok) continue;
        const rows = perm.map(r => {
          const clue = r.w.meaning.toLowerCase().includes(r.w.text.toLowerCase()) ? '(từ có ' + r.w.length + ' chữ cái)' : r.w.meaning;
          return { word: r.w.text, hi: r.hi, slot: r.slot, clue, wordObj: r.w };
        });
        const p = { keyword: String(keyword).toUpperCase().trim(), rows };
        if (!NS.validatePuzzle(p).length) return { puzzle: p };
      }
    }
    return { error: 'Không tìm được thứ tự hợp lệ cho "' + keyword + '" với kho từ hiện tại.' };
  };
  let r = attemptWith(new Set(o.noUsed ? [] : NS.puzzleUsed()));
  if (r.error && !o.noUsed && NS.puzzleUsed().length) { const r2 = attemptWith(new Set()); if (r2.puzzle) { r2.reused = true; return r2; } }
  return r;
};

NS.puzzleToText = p => NS.serializeQuestions({ puzzles: [{ keyword: p.keyword, rows: p.rows.map(r => ({ word: r.word, hi: r.hi, slot: r.slot, clue: r.clue })) }] });

NS.drawPuzzle = function (p, showAns) {
  const cell = 40, pad = 20, gapX = 16, maxLen = Math.max(...p.rows.map(r => r.word.length));
  const clueW = 360, W = pad * 2 + 40 + maxLen * (cell + 4) + gapX + clueW + 60, H = pad * 2 + 80 + p.rows.length * (cell + 8);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  g.fillStyle = '#1a1c2c'; g.fillRect(0, 0, W, H);
  g.font = 'bold 30px VT323, monospace'; g.fillStyle = '#ffcd75'; g.textBaseline = 'middle';
  g.fillText('Ô CHỮ BÍ MẬT' + (showAns ? ' — ĐÁP ÁN' : ''), pad, pad + 14);
  const L = keyLetters(p.keyword);
  for (let i = 0; i < L.length; i++) { const x = pad + i * 34; g.fillStyle = '#ef7d57'; g.fillRect(x, pad + 40, 30, 30); g.fillStyle = '#1a1c2c'; g.font = '22px VT323, monospace'; g.textAlign = 'center'; g.fillText(showAns ? L[i] : String(i + 1), x + 15, pad + 56); g.textAlign = 'left'; }
  p.rows.forEach((r, k) => {
    const y = pad + 90 + k * (cell + 8);
    g.fillStyle = '#94b0c2'; g.font = '24px VT323, monospace'; g.fillText('#' + (k + 1), pad, y + cell / 2);
    [...r.word.toUpperCase()].forEach((ch, i) => {
      const x = pad + 50 + i * (cell + 4);
      g.fillStyle = i + 1 === r.hi ? '#ef7d57' : '#b9a7f5'; g.fillRect(x, y, cell, cell);
      g.strokeStyle = '#1a1c2c'; g.lineWidth = 3; g.strokeRect(x, y, cell, cell);
      if (showAns) { g.fillStyle = '#1a1c2c'; g.font = 'bold 28px VT323, monospace'; g.textAlign = 'center'; g.fillText(ch, x + cell / 2, y + cell / 2 + 1); g.textAlign = 'left'; }
    });
    const cx = pad + 50 + maxLen * (cell + 4) + gapX;
    g.fillStyle = '#f4f4f4'; g.font = '24px VT323, monospace'; g.fillText(r.clue.slice(0, 40), cx, y + cell / 2);
    g.fillStyle = '#ffcd75'; g.beginPath(); g.arc(W - pad - 20, y + cell / 2, 16, 0, 7); g.fill(); g.fillStyle = '#1a1c2c'; g.textAlign = 'center'; g.fillText(String(r.slot), W - pad - 20, y + cell / 2 + 1); g.textAlign = 'left';
  });
  return c;
};

NS.games.push({
  id: 'cross', name: 'Ô chữ bí mật', icon: '🧩', desc: 'Đoán từng hàng, ghép các chữ ở ô cam thành từ khóa bí mật!',
  options: [
    { key: 'kw', label: 'Từ khóa (để trống nếu dùng ô chữ soạn tay)', type: 'text', def: 'SKIPPING ROPE', suggest: ['ANNIVERSARY', 'LIVINGROOM', 'SKIPPING ROPE', 'HIDE AND SEEK', 'SING KARAOKE'] },
    { key: 'showKey', label: 'Hiện thanh từ khóa (tắt = ẩn các ô từ khóa cho đến khi kết thúc)', type: 'toggle', def: true },
    { key: 'qtime', label: 'Thời gian trả lời mỗi lượt', type: 'select', choices: [[0, 'Không giới hạn'], [20, '20 giây'], [30, '30 giây'], [60, '60 giây']], def: 0 },
    { key: 'keyPenalty', label: 'Điểm trừ khi đoán sai từ khóa', type: 'select', choices: [[0, 'Không trừ'], [3, '−3'], [5, '−5'], [10, '−10']], def: 5 },
    { key: 'golden', label: 'Hàng vàng (điểm x2, ẩn)', type: 'toggle', def: true },
    { key: 'tools', label: 'Công cụ giáo viên (xem đáp án, xuất PNG)', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🧩 Ô chữ bí mật', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams;
    let puzzle = null;
    const kw = (o.kw || '').trim();
    if (!kw || NS.cfg.source === 'hand') {
      if (NS.hand.puzzles.length) { const p = NS.pick(NS.hand.puzzles); puzzle = { keyword: p.keyword, rows: p.rows.map(r => Object.assign({}, r)) }; }
      else if (!kw) { fail('Chưa có ô chữ soạn tay. Hãy nhập từ khóa hoặc dán ô chữ trong mục "Soạn câu hỏi".'); return; }
    }
    if (!puzzle) {
      const r = NS.genPuzzle(kw); if (r.error) { fail(r.error); return; }
      puzzle = r.puzzle; if (r.reused) setTimeout(() => sh.toast('Đã dùng lại từ cũ vì kho từ không đủ', 2500), 300);
      const used = new Set(NS.puzzleUsed()); puzzle.rows.forEach(x => x.wordObj && used.add(x.wordObj.id)); NS.LS.set('pg-puzzle-used', [...used]);
    }
    function fail(msg) { sh.area.append(h('div', { class: 'gdlg' }, h('h2', {}, 'Không tạo được ô chữ'), h('p', {}, msg), h('button', { onclick: ctx.exit }, '⌂ Về menu'))); }
    const L = keyLetters(puzzle.keyword), N = L.length, rows = puzzle.rows;
    rows.forEach(r => { r.up = r.word.toUpperCase(); r.solved = false; r.golden = false; });
    if (o.golden) NS.shuffle([...rows.keys()]).slice(0, rows.length > 8 ? 2 : 1).forEach(i => rows[i].golden = true);
    let turn = 0, over = false; const hints = [2, 2], keyFilled = Array(N).fill(false);
    const stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }];

    const keyStrip = h('div', { class: 'ckey' }), keyCells = [];
    for (let i = 0; i < N; i++) { const c = h('div', { class: 'ckc' }, h('small', {}, i + 1), h('b', {}, '')); keyCells.push(c); keyStrip.append(c); }
    const guessBtn = NS.tap(h('button', { class: 'red', type: 'button' }, '🔑 Đoán từ khóa'), () => guessKey());
    const tools = h('div', { class: 'ctools' }, guessBtn);
    if (o.tools) {
      tools.append(NS.tap(h('button', { class: 'small', type: 'button' }, '👁 Đáp án'), showAnswers),
        NS.tap(h('button', { class: 'small', type: 'button' }, '🖼 PNG'), () => { [false, true].forEach((a, i) => setTimeout(() => { const c = NS.drawPuzzle(puzzle, a); const l = h('a', { href: c.toDataURL('image/png'), download: 'o-chu-' + NS.slug(puzzle.keyword) + (a ? '-dap-an' : '') + '.png' }); document.body.append(l); l.click(); l.remove(); }, i * 400)); }),
        NS.tap(h('button', { class: 'small', type: 'button' }, '📋 Chép văn bản'), () => { const t = NS.puzzleToText(puzzle); try { navigator.clipboard.writeText(t); sh.toast('Đã chép ô chữ dạng văn bản'); } catch (e) { sh.overlay(h('div', { class: 'gdlg wide' }, h('textarea', { class: 'bigta', readonly: true }, t), h('button', { onclick: sh.closeOverlay }, 'Đóng'))); } }));
    }
    const table = h('div', { class: 'ctable' }), rowEls = [];
    const maxLen = Math.max(...rows.map(r => r.up.length));
    rows.forEach((r, k) => {
      const cells = [...r.up].map((ch, i) => h('span', { class: 'cc' + (i + 1 === r.hi ? ' hi' : '') }, ''));
      const el = h('button', { class: 'crow', type: 'button' }, h('span', { class: 'cnum' }, '#' + (k + 1)), h('span', { class: 'ccells', style: '--n:' + maxLen }, cells), h('span', { class: 'cclue' }, r.clue), h('span', { class: 'cslot' }, r.slot));
      NS.tap(el, () => openRow(k)); r.el = el; r.cells = cells; rowEls.push(el); table.append(el);
    });
    if (!o.showKey) keyStrip.style.display = 'none';
    sh.area.append(h('div', { class: 'cwrap' }, h('div', { class: 'ctop' }, keyStrip, tools), table));
    const setTurn = () => { sh.setActive(turn); sh.setInfo('Lượt: ' + NS.TEAM_ICON[turn] + ' ' + names[turn]); };
    setTurn();

    function solveRow(r, team) {
      r.solved = true; r.el.classList.add('solved', 't' + team);
      [...r.up].forEach((ch, i) => r.cells[i].textContent = ch);
      const slot = r.slot - 1; keyFilled[slot] = true; keyCells[slot].querySelector('b').textContent = L[slot]; keyCells[slot].classList.add('on');
      const flyTo = r.cells[r.hi - 1]; flyTo.classList.add('fly');
    }
    function checkAllDone() { if (rows.every(r => r.solved)) { endGame(null); return true; } return false; }
    function endGame(winner, bonus) {
      if (over) return; over = true; sh.setActive(-1);
      rows.forEach(r => { if (!r.solved) { [...r.up].forEach((ch, i) => r.cells[i].textContent = ch); } });
      keyCells.forEach((c, i) => { c.querySelector('b').textContent = L[i]; c.classList.add('on'); });
      keyStrip.style.display = ''; const wrongWords = []; setTimeout(() => sh.result({ scores: sh.scores, stats, wrong: wrongWords }), 1500);
    }
    function typeModal(title, len, fixedInit, onSubmit, extra) {
      const buf = Array(len).fill(''), fixed = Array(len).fill(false);
      (fixedInit || []).forEach(i => { });
      const cellsEl = h('div', { class: 'tcells' }), els = [];
      for (let i = 0; i < len; i++) { const e = h('span', { class: 'tcell' + (extra && extra.hi === i ? ' hi' : '') }, ''); els.push(e); cellsEl.append(e); }
      const paint = () => buf.forEach((c, i) => { els[i].textContent = c; els[i].classList.toggle('fixed', fixed[i]); });
      const kb = NS.kbd(ch => { if (ch === ' ') return; const k = buf.findIndex((c, i) => !c); if (k >= 0) { buf[k] = ch; paint(); } },
        () => { for (let i = len - 1; i >= 0; i--) if (buf[i] && !fixed[i]) { buf[i] = ''; break; } paint(); },
        () => { if (buf.some(c => !c)) { sh.toast('Hãy điền đủ ' + len + ' chữ cái'); return; } onSubmit(buf.join(''), close); });
      const hintBtn = extra && extra.hint ? NS.tap(h('button', { class: 'small', type: 'button' }, '💡 Mở 1 chữ (' + hints[turn] + ') −1đ'), () => {
        if (hints[turn] <= 0) return; const free = buf.map((c, i) => (!fixed[i] ? i : -1)).filter(i => i >= 0 && !buf[i]); const pool2 = free.length ? free : buf.map((c, i) => i).filter(i => !fixed[i]);
        if (!pool2.length) return; const i = NS.pick(pool2); buf[i] = extra.answer[i]; fixed[i] = true; hints[turn]--; sh.addScore(turn, -1, 0); hintBtn.textContent = '💡 Mở 1 chữ (' + hints[turn] + ') −1đ'; paint();
      }) : null;
      let tm = null; const bar = h('div', { class: 'tbar' }, h('i', {}));
      const close = () => { if (tm) tm.stop(); sh.closeOverlay(); };
      const qs = +o.qtime;
      if (qs > 0) tm = NS.timer(qs * 1000, l => { bar.firstChild.style.width = (l / (qs * 1000) * 100) + '%'; bar.classList.toggle('low', l < 6000); }, () => { sh.closeOverlay(); if (extra && extra.onTimeout) extra.onTimeout(); });
      sh.overlay(h('div', { class: 'gdlg tm t' + turn }, h('h3', {}, NS.TEAM_ICON[turn] + ' ' + names[turn] + ' — ' + title), extra && extra.clue ? h('p', { class: 'clue' }, extra.clue) : null, qs > 0 ? bar : null, cellsEl, kb,
        h('div', { class: 'rbtns' }, hintBtn, NS.tap(h('button', { class: 'small', type: 'button' }, '✕ Hủy'), close))), turn);
    }
    function openRow(k) {
      const r = rows[k]; if (over || sh.paused || r.solved) return;
      if (r.golden && !r.shown) { r.shown = true; sh.toast('⭐ Hàng vàng — điểm x2!', 1600); r.el.classList.add('gold'); }
      typeModal('Hàng #' + (k + 1) + (r.golden ? ' ⭐' : ''), r.up.length, null, (guess, close) => {
        close();
        if (guess === r.up) {
          const pts = Math.max(3, r.up.length) * (r.golden ? 2 : 1); stats[turn].right++; sh.addScore(turn, pts); NS.sfx('ok'); NS.vibe(40); sh.toast('+' + pts + ' điểm! Chữ "' + r.up[r.hi - 1] + '" bay lên từ khóa', 1800);
          solveRow(r, turn); if (!checkAllDone()) setTurn();
        } else { stats[turn].wrong++; NS.sfx('bad'); NS.vibe(80); sh.toast('❌ Chưa đúng — đổi lượt', 1500); turn = 1 - turn; setTurn(); }
      }, { clue: r.clue, hi: r.hi - 1, hint: true, answer: r.up, onTimeout: () => { stats[turn].wrong++; NS.sfx('bad'); sh.toast('⏰ Hết giờ — đổi lượt', 1500); turn = 1 - turn; setTurn(); } });
    }
    function guessKey() {
      if (over || sh.paused) return;
      typeModal('Đoán từ khóa (' + N + ' chữ cái)', N, null, (guess, close) => {
        close();
        if (guess === L) { const left = keyFilled.filter(x => !x).length, b = left * 3; sh.addScore(turn, b); sh.toast('🎉 Đúng rồi! +' + b + ' điểm thưởng', 2000); NS.sfx('win'); stats[turn].right++; endGame(turn); }
        else { const pen = +o.keyPenalty; if (pen) sh.addScore(turn, -pen, 0); stats[turn].wrong++; NS.sfx('bad'); sh.toast('❌ Sai từ khóa!' + (pen ? ' −' + pen + ' điểm,' : '') + ' mất lượt', 1800); turn = 1 - turn; setTurn(); }
      }, { clue: 'Gõ cả từ khóa (bỏ khoảng trắng).' + (+o.keyPenalty ? ' Sai bị trừ ' + o.keyPenalty + ' điểm.' : ''), onTimeout: () => { sh.toast('⏰ Hết giờ — đổi lượt', 1500); turn = 1 - turn; setTurn(); } });
    }
    function showAnswers() {
      const t = h('table', { class: 'ans' }, h('tr', {}, h('th', {}, '#'), h('th', {}, 'Từ'), h('th', {}, 'Nghĩa'), h('th', {}, 'Ô số')),
        rows.map((r, k) => h('tr', {}, h('td', {}, k + 1), h('td', {}, r.word), h('td', {}, r.clue), h('td', {}, r.slot))));
      sh.overlay(h('div', { class: 'gdlg wide' }, h('h3', {}, 'Đáp án — từ khóa: ' + puzzle.keyword), h('div', { class: 'scrollbox' }, t), h('button', { onclick: sh.closeOverlay }, 'Đóng')));
    }
  }
});
})();
