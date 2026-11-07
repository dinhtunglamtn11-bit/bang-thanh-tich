/* ===== GAME 4: LẬT THẺ GHÉP CẶP ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

NS.buildMemoryPairs = function (nPairs) {
  const src = NS.cfg.source;
  if (src !== 'auto' && NS.hand.cardSets.length) {
    const set = NS.pick(NS.hand.cardSets);
    const pairs = NS.shuffle(set.pairs).slice(0, nPairs);
    if (pairs.length >= 4) return pairs.map(p => ({ en: p.left, ipa: p.ipa, vi: p.right, word: null }));
  }
  const pool = NS.shuffle(NS.pool({ phrases: true })), used = new Set(), usedM = new Set(), out = [];
  const byTopic = {};
  pool.forEach(w => { (byTopic[w.topics[0]] = byTopic[w.topics[0]] || []).push(w); });
  const order = []; let more = true, k = 0;
  while (more) { more = false; Object.keys(byTopic).forEach(t => { if (byTopic[t][k]) { order.push(byTopic[t][k]); more = true; } }); k++; }
  for (const w of order) {
    if (used.has(w.text.toLowerCase()) || usedM.has(w.meaning.toLowerCase())) continue;
    used.add(w.text.toLowerCase()); usedM.add(w.meaning.toLowerCase());
    out.push({ en: w.text, ipa: w.ipa, vi: w.meaning, word: w }); if (out.length === nPairs) break;
  }
  return out;
};

NS.games.push({
  id: 'memory', name: 'Lật thẻ ghép cặp', icon: '🃏', desc: 'Lật 2 thẻ, ghép từ tiếng Anh với nghĩa tiếng Việt. Ghép đúng thì chơi tiếp!',
  options: [
    { key: 'size', label: 'Kích thước bảng', type: 'select', choices: [['4x4', '4x4 (8 cặp)'], ['4x5', '4x5 (10 cặp)'], ['5x6', '5x6 (15 cặp)']], def: '4x4' },
    { key: 'special', label: 'Thẻ đặc biệt', type: 'select', choices: [['off', 'Không dùng'], ['classic', 'Cổ điển: ⭐ cặp sao + 💣 bom'], ['many', 'Nhiều thẻ: ⚡ lượt thêm, 🧊 đóng băng, 👁 soi bài, 🎁 quà, 🔀 xáo, 💣 bom']], def: 'off' },
    { key: 'speed', label: 'Chế độ tốc độ (giới hạn thời gian mỗi lượt)', type: 'toggle', def: false },
    { key: 'sec', label: 'Số giây mỗi lượt (khi bật chế độ tốc độ)', type: 'select', choices: [[5, '5 giây'], [8, '8 giây'], [10, '10 giây'], [15, '15 giây'], [20, '20 giây']], def: 10 },
    { key: 'peek', label: 'Cho xem trước toàn bộ thẻ 3 giây lúc bắt đầu', type: 'toggle', def: false },
    { key: 'ipa', label: 'Hiện phiên âm trên thẻ', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🃏 Lật thẻ', onRestart: ctx.restart, onExit: ctx.exit });
    const [a, b] = o.size.split('x').map(Number); const cells = a * b, cols = Math.max(a, b), rows = Math.min(a, b);
    const mode = o.special === true || o.special === 'true' ? 'classic' : (o.special === false || !o.special ? 'off' : o.special);
    const SPECIALS = { bomb: ['💣', 'Bom'], flash: ['⚡', 'Lượt thêm'], freeze: ['🧊', 'Đóng băng'], peek: ['👁', 'Soi bài'], gift: ['🎁', 'Quà +2'], shuffle: ['🔀', 'Xáo bài'] };
    const kSpecial = mode === 'classic' ? 1 : mode === 'many' ? (cells === 16 ? 2 : 4) : 0;
    const specials = mode === 'classic' ? ['bomb'] : NS.shuffle(Object.keys(SPECIALS)).slice(0, kSpecial);
    let nPairs = Math.floor((cells - specials.length) / 2);
    const pairs = NS.buildMemoryPairs(nPairs); nPairs = pairs.length;
    if (nPairs < 4) { sh.area.append(h('div', { class: 'gdlg' }, h('h2', {}, 'Chưa đủ từ vựng'), h('p', {}, 'Cần ít nhất 4 từ khác nghĩa nhau. Hãy bật thêm chủ đề hoặc nhập từ vựng.'))); return; }
    const starIdx = mode !== 'off' ? NS.randInt(0, nPairs - 1) : -1;
    let cards = [];
    pairs.forEach((p, i) => { cards.push({ pair: i, side: 'en', text: p.en, ipa: p.ipa, word: p.word, star: i === starIdx }, { pair: i, side: 'vi', text: p.vi, word: p.word, star: i === starIdx }); });
    specials.forEach(k => cards.push({ special: k, bomb: k === 'bomb', text: SPECIALS[k][0], label: SPECIALS[k][1], pair: -1 }));
    cards = NS.shuffle(cards);
    const grid = h('div', { class: 'mgrid', style: 'grid-template-columns:repeat(' + cols + ',1fr);grid-template-rows:repeat(' + rows + ',1fr)' });
    cards.forEach(c => {
      const len = c.text.length;
      c.el = h('button', { class: 'mcard' + (len > 14 ? ' long' : len > 9 ? ' mid' : ''), type: 'button' },
        h('span', { class: 'mfront' }, '?'),
        h('span', { class: 'mback' }, h('b', {}, c.text), c.ipa && o.ipa ? h('small', {}, '/' + c.ipa + '/') : null, c.label ? h('small', {}, c.label) : null, c.side === 'en' ? h('i', {}, 'EN') : c.side === 'vi' ? h('i', {}, 'VI') : null));
      NS.tap(c.el, () => flip(c));
      grid.append(c.el);
    });
    sh.area.append(grid);
    let turn = 0, flipped = [], lock = false, matched = 0, chain = [0, 0], tm = null, flash = false, frozen = -1;
    const stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }], wrongWords = new Map();
    const names = NS.cfg.teams;
    function nextTurn() {
      if (flash) { flash = false; sh.toast('⚡ Lượt thêm! ' + NS.TEAM_ICON[turn] + ' chơi tiếp', 1500); setTurn(); return; }
      turn = 1 - turn;
      if (frozen === turn) { frozen = -1; sh.toast('🧊 ' + NS.TEAM_ICON[turn] + ' bị đóng băng, mất lượt', 1700); turn = 1 - turn; }
      setTurn();
    }
    const setTurn = () => { sh.setActive(turn); sh.setInfo('Lượt: ' + NS.TEAM_ICON[turn] + ' ' + names[turn]); grid.dataset.turn = turn; startTimer(); };
    function startTimer() {
      if (tm) tm.stop(); if (!o.speed) return;
      tm = NS.timer((+o.sec || 10) * 1000, l => sh.setInfo('Lượt: ' + NS.TEAM_ICON[turn] + ' ' + names[turn] + '  ⏱ ' + Math.ceil(l / 1000)), () => {
        if (lock) { return; }
        flipped.forEach(c => c.el.classList.remove('up')); flipped = []; chain[turn] = 0; stats[turn].wrong++; nextTurn();
      });
    }
    function end() {
      if (tm) tm.stop();
      stats[0].avg = 0; stats[1].avg = 0;
      setTimeout(() => sh.result({ scores: sh.scores, stats, tie: [stats[0].right, stats[1].right], wrong: [...wrongWords.values()] }), 700);
    }
    function flip(c) {
      if (sh.paused || lock || c.matched || c.el.classList.contains('up')) return;
      c.el.classList.add('up'); NS.sfx('flip'); NS.vibe(15);
      if (c.bomb) {
        lock = true; sh.addScore(turn, -1); NS.sfx('bad'); sh.toast('💣 Bom! -1 điểm, mất lượt');
        setTimeout(() => { c.el.classList.remove('up'); flipped.forEach(x => x.el.classList.remove('up')); flipped = []; chain[turn] = 0; lock = false; nextTurn(); }, 1100); return;
      }
      if (c.special) {
        c.matched = true; c.el.classList.add('matched', 'spc'); NS.sfx('pow'); NS.vibe(30);
        const k = c.special;
        if (k === 'flash') { flash = true; sh.toast('⚡ Được thêm một lượt khi lật hụt!', 1800); }
        else if (k === 'freeze') { frozen = 1 - turn; sh.toast('🧊 Đối thủ sẽ mất lượt kế tiếp!', 1800); }
        else if (k === 'gift') { sh.addScore(turn, 2); sh.toast('🎁 Quà! +2 điểm', 1600); }
        else if (k === 'peek') {
          const hid = cards.filter(x => !x.matched && !x.el.classList.contains('up')); lock = true; sh.toast('👁 Soi bài: ghi nhớ nhanh!', 1600);
          hid.forEach(x => x.el.classList.add('up'));
          sh.sleep(1800).then(() => { hid.forEach(x => { if (!x.matched) x.el.classList.remove('up'); }); lock = false; });
        } else if (k === 'shuffle') {
          const mv = cards.filter(x => !x.matched && !x.el.classList.contains('up')), kids = [...grid.children], idx = mv.map(x => kids.indexOf(x.el)), els = NS.shuffle(mv.map(x => x.el));
          idx.forEach((p, n) => { kids[p] = els[n]; }); grid.replaceChildren(...kids); sh.toast('🔀 Các thẻ đã bị xáo trộn!', 1800);
        }
        return;
      }
      flipped.push(c);
      if (flipped.length < 2) return;
      lock = true; const [x, y] = flipped;
      if (x.pair === y.pair) {
        chain[turn]++; let pts = Math.min(chain[turn], 3) + (x.star ? 3 : 0);
        NS.sfx('ok'); NS.vibe(30);
        [x, y].forEach(k => { k.matched = true; k.owner = turn; k.el.classList.add('matched', 't' + turn); });
        sh.addScore(turn, pts); stats[turn].right++;
        sh.toast((x.star ? '⭐ ' : '') + '+' + pts + ' điểm' + (chain[turn] > 1 ? '  🔥 chuỗi ' + chain[turn] : ''));
        matched++; flipped = []; lock = false; flash = false;
        if (matched === nPairs) end(); else startTimer();
      } else {
        NS.sfx('bad'); stats[turn].wrong++;
        [x, y].forEach(k => { if (k.word) { NS.markWrong(k.word); wrongWords.set(k.word.id, k.word); } });
        setTimeout(() => { x.el.classList.remove('up'); y.el.classList.remove('up'); flipped = []; chain[turn] = 0; lock = false; nextTurn(); }, 1300);
      }
    }
    if (o.peek) {
      lock = true; cards.forEach(c => c.el.classList.add('up')); sh.setInfo('👀 Ghi nhớ nhanh!');
      sh.sleep(3000).then(() => { if (sh.dead) return; cards.forEach(c => c.el.classList.remove('up')); lock = false; setTurn(); });
    } else setTurn();
  }
});
})();
