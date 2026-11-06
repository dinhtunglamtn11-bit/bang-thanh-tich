/* ===== GAME 3: ĐẤU TRƯỜNG TỪ VỰNG — bộ máy luật (thuần logic) + giao diện ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

const TILE = {
  start: { icon: '🏁', name: 'Xuất phát' }, finish: { icon: '🏆', name: 'Về đích' },
  bonus: { icon: '⭐', name: 'Thưởng +3' }, trap: { icon: '🕳️', name: 'Bẫy' }, swap: { icon: '🔄', name: 'Đổi chỗ' },
  steal: { icon: '🦹', name: 'Cướp 3 điểm' }, warp: { icon: '🌀', name: 'Dịch chuyển +5' }, mystery: { icon: '❓', name: 'Bí ẩn' },
  treasure: { icon: '💎', name: 'Kho báu' }, ice: { icon: '🧊', name: 'Băng giá' }, hole: { icon: '⚫', name: 'Hố đen' }
};
const CARD = { fifty: { icon: '✂️', name: '50/50' }, freeze: { icon: '🥶', name: 'Đóng băng' }, swapq: { icon: '🔁', name: 'Đổi câu' }, shield: { icon: '🛡️', name: 'Khiên' } };
const CARD_KEYS = Object.keys(CARD);
const BAD = new Set(['trap', 'ice', 'hole']);
const LAST = 19;
NS.ARENA = { TILE, CARD };

/* Bảng 20 ô, thỏa các ràng buộc đặt ô */
NS.arenaBoard = function (rnd) {
  rnd = rnd || NS.rand;
  const mids = [].concat(Array(3).fill('bonus'), Array(3).fill('trap'), Array(2).fill('swap'), Array(2).fill('steal'), Array(2).fill('warp'), Array(3).fill('mystery'), 'treasure', 'ice', 'hole');
  for (let tries = 0; tries < 20000; tries++) {
    const m = NS.shuffle(mids, rnd), b = ['start'].concat(m, ['finish']);
    let ok = true;
    for (let i = 1; i <= 2; i++) if (BAD.has(b[i])) ok = false;
    for (let i = 2; i < b.length && ok; i++) if (BAD.has(b[i]) && BAD.has(b[i - 1])) ok = false;
    const w = b.map((t, i) => t === 'warp' ? i : -1).filter(i => i >= 0); if (w.length === 2 && Math.abs(w[0] - w[1]) < 5) ok = false;
    if (!b.slice(1, 7).includes('bonus')) ok = false;
    if (ok) return b;
  }
  return ['start', 'bonus', 'mystery', 'swap', 'steal', 'warp', 'trap', 'bonus', 'treasure', 'mystery', 'bonus', 'ice', 'steal', 'swap', 'hole', 'warp', 'mystery', 'trap', 'trap', 'finish'];
};

const MYSTERY = ['skill', 'plus2', 'adv2', 'opp2', 'minus2', 'back2', 'losecard', 'race', 'swap50', 'both1'];
const MYSTERY_TXT = { skill: '🎴 Nhận thẻ kỹ năng!', plus2: '+2 điểm', adv2: 'Tiến 2 ô', opp2: 'Đối thủ lùi 2 ô', minus2: '−2 điểm', back2: 'Lùi 2 ô', losecard: 'Mất một thẻ ngẫu nhiên', race: 'Đua nhanh: ai đúng trước +2 điểm', swap50: 'Đổi 50% điểm số với đối thủ', both1: 'Mỗi đội +1 điểm' };
const EVENTS = ['storm', 'festival', 'reverse', 'rain', 'golden'];
const EVENT_TXT = { storm: '🌪️ BÃO! Hiệu ứng xấu x2 trong 1 vòng', festival: '🎉 LỄ HỘI! Điểm thưởng x2 trong 1 vòng', reverse: '🔀 NGÀY ĐẢO NGƯỢC! Hai đội đổi chỗ', rain: '🌧️ MƯA TỪ VỰNG! Ai đúng trước +2 điểm', golden: '🌟 GIỜ VÀNG! Trả lời đúng được thêm 1 lượt (1 vòng)' };

/* ui: giao diện (hoặc bot). Mọi phương thức có thể async. */
NS.arenaRun = async function (ui, o) {
  o = o || {}; const rnd = o.rnd || NS.rand, maxRounds = o.maxRounds || 10;
  const board = o.board || NS.arenaBoard(rnd);
  const S = { pos: [0, 0], score: [0, 0], skip: [0, 0], cards: [[], []], streak: [0, 0], round: 0, mods: { storm: 0, festival: 0, golden: 0 }, lastUnder: [-9, -9], finished: -1, board, log: [] };
  const other = t => 1 - t, clamp0 = x => Math.max(0, x);
  const sync = () => ui.updated && ui.updated(S);
  const say = async (m, k) => { S.log.push(m); if (ui.say) await ui.say(m, k); };
  const giveCard = async t => {
    const c = NS.pick(CARD_KEYS, rnd);
    if (S.cards[t].length >= 3) {
      const i = await ui.choose(t, 'Đã đủ 3 thẻ! Bỏ thẻ nào?', S.cards[t].map(x => CARD[x].icon + ' ' + CARD[x].name).concat(['Không nhận thẻ mới ' + CARD[c].icon]));
      if (i >= S.cards[t].length) return; S.cards[t].splice(i, 1);
    }
    S.cards[t].push(c); await say(NS.TEAM_ICON[t] + ' nhận thẻ ' + CARD[c].icon + ' ' + CARD[c].name, 'good'); sync();
  };
  const useCard = (t, c) => { const i = S.cards[t].indexOf(c); if (i >= 0) S.cards[t].splice(i, 1); sync(); };
  const mult = bad => (bad && S.mods.storm > 0 ? 2 : 1);
  const tryBlock = async t => {
    if (!S.cards[t].includes('shield')) return false;
    const i = await ui.choose(t, '🛡️ Dùng thẻ Khiên để chặn?', ['Có, dùng Khiên', 'Không']);
    if (i === 0) { useCard(t, 'shield'); await say('🛡️ ' + NS.TEAM_ICON[t] + ' đã chặn hiệu ứng!', 'good'); return true; } return false;
  };
  const addScore = (t, d) => { S.score[t] = clamp0(S.score[t] + d); sync(); };
  const moveTo = async (t, to, kind) => { const from = S.pos[t]; to = Math.max(0, Math.min(LAST, to)); S.pos[t] = to; if (ui.move) await ui.move(t, from, to, kind); sync(); };
  const markFinish = t => { if (S.finished < 0 && S.pos[t] >= LAST) { S.finished = t; } };

  async function applyTile(t) {
    const type = board[S.pos[t]], o2 = other(t);
    if (ui.reveal) ui.reveal(S.pos[t]);
    if (type === 'start' || type === 'finish') return;
    await say(NS.TEAM_ICON[t] + ' vào ô ' + TILE[type].icon + ' ' + TILE[type].name, type);
    const f = S.mods.festival > 0 ? 2 : 1;
    switch (type) {
      case 'bonus': addScore(t, 3 * f); await say('+' + 3 * f + ' điểm!', 'good'); break;
      case 'trap': {
        if (await tryBlock(t)) break; const m = mult(true);
        const i = await ui.choose(t, 'Dính bẫy! Chọn hình phạt', ['Mất ' + m + ' lượt', 'Lùi ' + 3 * m + ' ô']);
        if (i === 0) S.skip[t] += m; else await moveTo(t, S.pos[t] - 3 * m, 'back'); sync(); break;
      }
      case 'swap': { const a = S.pos[0]; S.pos[0] = S.pos[1]; S.pos[1] = a; if (ui.swapPos) await ui.swapPos(S); sync(); break; }
      case 'steal': {
        if (await tryBlock(o2)) break; const m = mult(true), x = Math.min(3 * m, S.score[o2]);
        S.score[o2] -= x; S.score[t] += x; await say('Cướp ' + x + ' điểm!', 'good'); sync(); break;
      }
      case 'warp': await moveTo(t, Math.min(S.pos[t] + 5, 18), 'warp'); break;
      case 'mystery': await mystery(t); break;
      case 'treasure': {
        const r = await ui.ask(t, 1, { cards: [], treasure: true });
        if (r.correct) { addScore(t, 5 * f); await say('💎 +' + 5 * f + ' điểm!', 'good'); } else await say('Tiếc quá, không có kho báu!', 'bad'); break;
      }
      case 'ice': { if (await tryBlock(t)) break; S.skip[t] += mult(true); await say('🧊 Mất ' + mult(true) + ' lượt', 'bad'); sync(); break; }
      case 'hole': { if (await tryBlock(t)) break; const x = Math.min(2 * mult(true), S.score[t]); S.score[t] -= x; S.score[o2] += x; await say('⚫ Trả ' + x + ' điểm cho đối thủ', 'bad'); sync(); break; }
    }
  }
  async function mystery(t) {
    const c = NS.pick(MYSTERY, rnd), o2 = other(t); await say('❓ ' + MYSTERY_TXT[c], 'mystery');
    switch (c) {
      case 'skill': await giveCard(t); break;
      case 'plus2': addScore(t, 2 * (S.mods.festival > 0 ? 2 : 1)); break;
      case 'adv2': await moveTo(t, Math.min(S.pos[t] + 2, 18), 'fwd'); break;
      case 'opp2': await moveTo(o2, S.pos[o2] - 2, 'back'); break;
      case 'minus2': addScore(t, -2); break;
      case 'back2': await moveTo(t, S.pos[t] - 2, 'back'); break;
      case 'losecard': if (S.cards[t].length) { S.cards[t].splice(Math.floor(rnd() * S.cards[t].length), 1); sync(); } break;
      case 'race': { const w = await ui.race(); if (w >= 0) { addScore(w, 2); await say(NS.TEAM_ICON[w] + ' đúng trước +2', 'good'); } break; }
      case 'swap50': { const a = Math.floor(S.score[0] / 2), b = Math.floor(S.score[1] / 2); S.score[0] = S.score[0] - a + b; S.score[1] = S.score[1] - b + a; sync(); break; }
      case 'both1': addScore(0, 1); addScore(1, 1); break;
    }
  }

  async function turn(t, extra) {
    if (S.skip[t] > 0) { S.skip[t]--; await say(NS.TEAM_ICON[t] + ' bị mất lượt!', 'bad'); sync(); return; }
    const o2 = other(t);
    await ui.turnStart(t, S, S.round);
    let bonusDice = 0;
    if ((S.score[o2] - S.score[t] >= 8 || S.pos[o2] - S.pos[t] >= 6) && S.round - S.lastUnder[t] >= 3) {
      S.lastUnder[t] = S.round; bonusDice = 1; await say('💪 Trợ lực đội đang thua: +1 thẻ, +1 xúc xắc!', 'good'); await giveCard(t);
    }
    if (S.cards[t].includes('freeze') && !extra) {
      const i = await ui.choose(t, 'Dùng thẻ 🥶 Đóng băng lên đối thủ?', ['Không', 'Có, đóng băng!']);
      if (i === 1) { useCard(t, 'freeze'); if (!(await tryBlock(o2))) { S.skip[o2]++; await say('🥶 Đối thủ sẽ mất lượt kế tiếp!', 'good'); } sync(); }
    }
    const lv = await ui.chooseLevel(t);
    const res = await ui.ask(t, lv, { cards: S.cards[t].filter(c => c === 'fifty' || c === 'swapq') });
    (res.used || []).forEach(c => useCard(t, c));
    const f = S.mods.festival > 0 ? 2 : 1;
    let correct = !!res.correct;
    if (correct) {
      S.streak[t]++; const pts = [1, 2, 3][lv] * f; addScore(t, pts);
      if (S.streak[t] % 3 === 0) { await say('🔥 3 câu đúng liên tiếp!', 'good'); await giveCard(t); }
      const dice = []; const n = [1, 2, 3][lv]; for (let i = 0; i < n; i++) dice.push(1 + Math.floor(rnd() * 6));
      const total = dice.reduce((a, b) => a + b, 0) + bonusDice;
      if (ui.showDice) await ui.showDice(t, dice, bonusDice);
      await moveTo(t, S.pos[t] + total, 'dice');
      if (S.pos[t] < LAST) await applyTile(t);
    } else {
      S.streak[t] = 0;
      if (lv === 1) await moveTo(t, S.pos[t] - 1, 'back'); else if (lv === 2) { await moveTo(t, S.pos[t] - 2, 'back'); addScore(t, -1); }
      await say('Sai rồi! ' + ['Đứng yên', 'Lùi 1 ô', 'Lùi 2 ô và −1 điểm'][lv], 'bad');
    }
    markFinish(t);
    if (correct && S.mods.golden > 0 && !extra && S.finished < 0) { await say('🌟 Giờ vàng: thêm một lượt!', 'good'); await turn(t, true); }
  }

  for (S.round = 1; S.round <= maxRounds; S.round++) {
    sync(); if (ui.roundStart) await ui.roundStart(S.round);
    const first = (S.round - 1) % 2, order = [first, other(first)];
    for (let k = 0; k < 2; k++) {
      const t = order[k]; await turn(t);
      if (S.finished >= 0) {
        if (k === 0 && S.pos[other(t)] < LAST) { await say('🏁 ' + NS.TEAM_ICON[t] + ' về đích đầu tiên! Đội kia có lượt cuối.', 'good'); await turn(other(t)); }
        break;
      }
    }
    if (S.finished >= 0) break;
    ['storm', 'festival', 'golden'].forEach(k => { if (S.mods[k] > 0) S.mods[k]--; });
    if (S.round % 3 === 0 && S.round < maxRounds) {
      const ev = NS.pick(EVENTS, rnd); await say(EVENT_TXT[ev], 'event');
      if (ev === 'reverse') { const a = S.pos[0]; S.pos[0] = S.pos[1]; S.pos[1] = a; if (ui.swapPos) await ui.swapPos(S); sync(); }
      else if (ev === 'rain') { const w = await ui.race(); if (w >= 0) addScore(w, 2); }
      else S.mods[ev] = 1;
    }
  }
  if (S.finished >= 0) { const bonus = Math.min(S.score[S.finished], 20); addScore(S.finished, bonus); await say('🏆 Thưởng về đích đầu tiên: +' + bonus + ' điểm!', 'good'); }
  let winner = S.score[0] === S.score[1] ? (S.pos[0] === S.pos[1] ? -1 : (S.pos[0] > S.pos[1] ? 0 : 1)) : (S.score[0] > S.score[1] ? 0 : 1);
  if (winner < 0) { await say('⚔️ Hòa tuyệt đối! Đấu tay đôi!', 'event'); const w = await ui.race(); winner = w; }
  return { scores: S.score.slice(), pos: S.pos.slice(), winner, rounds: Math.min(S.round, maxRounds), finished: S.finished, S };
};

/* ---------- Giao diện ---------- */
NS.games.push({
  id: 'arena', name: 'Đấu trường từ vựng', icon: '🎲', desc: 'Trả lời đúng để đổ xúc xắc, đi trên bảng 20 ô có bẫy, thẻ kỹ năng và sự kiện bất ngờ!',
  options: [{ key: 'rounds', label: 'Số vòng tối đa', type: 'select', choices: [[6, '6'], [8, '8'], [10, '10']], def: 10 }],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🎲 Đấu trường', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, board = NS.arenaBoard();
    const hidden = new Set(); board.forEach((t, i) => { if (i > 0 && i < LAST && NS.rand() < 0.5) hidden.add(i); });
    const tileEls = [], stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }], wrongWords = new Map();
    const boardEl = h('div', { class: 'aboard' });
    for (let i = 0; i < 20; i++) {
      const row = Math.floor(i / 5), col = row % 2 ? 4 - (i % 5) : i % 5;
      const el = h('div', { class: 'atile2 ' + (board[i]), style: 'grid-row:' + (row + 1) + ';grid-column:' + (col + 1) }, h('span', { class: 'tn' }, i), h('span', { class: 'ti' }, ''), h('span', { class: 'tp' }));
      tileEls[i] = el; boardEl.append(el);
    }
    const paintTiles = (pos) => tileEls.forEach((el, i) => {
      el.querySelector('.ti').textContent = hidden.has(i) ? '❔' : TILE[board[i]].icon; el.title = hidden.has(i) ? 'Ô ẩn' : TILE[board[i]].name;
      el.querySelector('.tp').innerHTML = ''; [0, 1].forEach(t => { if (pos && pos[t] === i) el.querySelector('.tp').append(h('span', { class: 'pc t' + t }, NS.TEAM_ICON[t])); });
    });
    const side = h('div', { class: 'aside' }); const info = [0, 1].map(t => h('div', { class: 'ainfo t' + t }, ''));
    side.append(info[0], info[1]);
    const panel = h('div', { class: 'aq' });
    sh.area.append(h('div', { class: 'awrap' }, h('div', { class: 'atop' }, boardEl, side), panel));
    let curPos = [0, 0]; paintTiles(curPos);
    const legend = h('div', { class: 'alegend' }, Object.keys(TILE).filter(k => k !== 'start').map(k => h('span', {}, TILE[k].icon + ' ' + TILE[k].name)));
    side.append(legend);

    const wait = ms => sh.sleep(ms);
    const showMsg = (t) => { panel.innerHTML = ''; panel.append(h('div', { class: 'amsg' }, t)); };
    const upd = S => {
      curPos = S.pos.slice(); paintTiles(S.pos);
      [0, 1].forEach(t => { sh.setScore(t, S.score[t]); info[t].innerHTML = ''; info[t].append(h('b', {}, NS.TEAM_ICON[t] + ' ' + names[t]), h('div', {}, 'Ô ' + S.pos[t] + (S.skip[t] ? '  🧊×' + S.skip[t] : '') + (S.streak[t] >= 2 ? '  🔥' + S.streak[t] : '')), h('div', { class: 'acards' }, S.cards[t].map(c => h('span', { title: CARD[c].name }, CARD[c].icon + CARD[c].name)))); });
    };
    const btnRow = (t, title, labels, cls) => new Promise(res => {
      panel.innerHTML = ''; panel.append(h('div', { class: 'aqt t' + t }, title), h('div', { class: 'aqb' }, labels.map((l, i) => NS.tap(h('button', { type: 'button', class: (cls && cls[i]) || '' }, l), () => res(i)))));
    });

    const ui = {
      updated: upd,
      say: async (m) => { showMsg(m); NS.sfx(/Sai|bad|Mất|Trả/.test(m) ? 'bad' : 'pow'); await wait(m.length > 40 ? 1800 : 1200); },
      turnStart: async (t, S, r) => { sh.setActive(t); sh.setInfo('Vòng ' + r + '/' + o.rounds); showMsg('Đến lượt ' + NS.TEAM_ICON[t] + ' ' + names[t]); await wait(800); },
      roundStart: async () => {},
      chooseLevel: t => btnRow(t, NS.TEAM_ICON[t] + ' ' + names[t] + ' chọn mức câu hỏi', ['Dễ · 🎲×1 · +1đ', 'Vừa · 🎲×2 · +2đ (sai: lùi 1)', 'Khó · 🎲×3 · +3đ (sai: lùi 2, −1đ)'], ['green', '', 'red']),
      choose: (t, title, opts) => btnRow(t, title, opts),
      reveal: i => { if (hidden.delete(i)) { paintTiles(curPos); } },
      swapPos: async S => { upd(S); await wait(500); },
      showDice: async (t, dice, bonus) => {
        const faces = '⚀⚁⚂⚃⚄⚅'; const d = h('div', { class: 'adice' }, '🎲'); panel.innerHTML = ''; panel.append(d);
        for (let i = 0; i < 8; i++) { d.textContent = dice.map(() => faces[NS.randInt(0, 5)]).join(' '); NS.sfx('dice'); await wait(90); }
        d.textContent = dice.map(x => faces[x - 1]).join(' ') + '  = ' + (dice.reduce((a, b) => a + b, 0) + bonus) + (bonus ? ' (+1 trợ lực)' : ''); await wait(900);
      },
      move: async (t, from, to, kind) => {
        const step = to > from ? 1 : -1; let p = from;
        if (kind === 'warp') { curPos[t] = to; paintTiles(curPos); await wait(500); return; }
        while (p !== to) { p += step; curPos[t] = p; paintTiles(curPos); NS.sfx('tick'); await wait(170); if (hidden.has(p) && p === to) ui.reveal(p); }
      },
      ask: (t, lv, opt) => new Promise(async res => {
        let q = NS.nextMC({ level: lv + 1 }); if (!q) { res({ correct: true }); return; }
        const used = []; let done = false, tm = null;
        const render = () => {
          panel.innerHTML = ''; const bar = h('div', { class: 'tbar' }, h('i', {}));
          const stem = h('div', { class: 'aqs' }, h('span', { class: 't' + t }, NS.TEAM_ICON[t] + ' ' + names[t] + (opt.treasure ? ' 💎 KHO BÁU' : ' — ' + ['Dễ', 'Vừa', 'Khó'][lv])), h('div', { class: 'aqq' }, q.stem), q.sub ? h('div', { class: 'aipa' }, q.sub) : null, bar);
          const opts = h('div', { class: 'aqo' }); const bs = q.options.map((tx, i) => { const b = h('button', { type: 'button', class: 'lopt' }, tx); NS.tap(b, () => pick(i, b)); opts.append(b); return b; });
          const cb = h('div', { class: 'acb' });
          (opt.cards || []).forEach(c => { if (used.includes(c)) return; cb.append(NS.tap(h('button', { class: 'small', type: 'button' }, CARD[c].icon + ' ' + CARD[c].name), () => {
            if (done) return; used.push(c);
            if (c === 'fifty') { NS.shuffle(bs.map((_, i) => i).filter(i => i !== q.answer)).slice(0, 2).forEach(i => bs[i].classList.add('gone')); cb.querySelectorAll('button').forEach(x => { if (x.textContent.includes('50/50')) x.remove(); }); }
            else { const nq = NS.nextMC({ level: lv + 1 }); if (nq) { q = nq; if (tm) tm.stop(); render(); } }
          })); });
          panel.append(stem, opts, cb);
          if (tm) tm.stop(); const tl = (q.timeLimit || 12) * 1000;
          tm = NS.timer(tl, l => { bar.firstChild.style.width = (l / tl * 100) + '%'; bar.classList.toggle('low', l < 4000); }, () => pick(-1));
          function pick(i, b) {
            if (done || sh.paused) return; done = true; tm.stop();
            const ok = i === q.answer; bs.forEach((x, k) => { x.classList.add('locked'); if (k === q.answer) x.classList.add('right'); }); if (b && !ok) b.classList.add('wrong');
            stats[t][ok ? 'right' : 'wrong']++; NS.sfx(ok ? 'ok' : 'bad'); NS.vibe(ok ? 30 : 80);
            if (!ok && q.word) { NS.markWrong(q.word); wrongWords.set(q.word.id, q.word); }
            panel.append(h('div', { class: 'aans' }, (ok ? '✅ Đúng! ' : (i < 0 ? '⏰ Hết giờ! ' : '❌ ')) + (q.explanation || q.options[q.answer])));
            setTimeout(() => res({ correct: ok, used }), ok ? 900 : 2200);
          }
        };
        render();
      }),
      race: () => new Promise(res => {
        const q = NS.nextMC({ level: 2 }); if (!q) return res(-1);
        let done = false, out = [false, false];
        panel.innerHTML = ''; const bar = h('div', { class: 'tbar' }, h('i', {}));
        const ps = [0, 1].map(t => { const bs = q.options.map((tx, i) => { const b = h('button', { type: 'button', class: 'lopt' }, tx); NS.tap(b, () => ans(t, i, b)); return b; }); return h('div', { class: 'lpanel t' + t }, h('div', { class: 'aname' }, NS.TEAM_ICON[t] + ' ' + names[t]), h('div', { class: 'lopts' }, bs)); });
        panel.append(h('div', { class: 'aqs' }, '⚡ ĐUA NHANH! ', h('div', { class: 'aqq' }, q.stem), bar), h('div', { class: 'lpanels' }, ps));
        const tm = NS.timer(10000, l => { bar.firstChild.style.width = (l / 100) + '%'; }, () => fin(-1));
        function ans(t, i, b) { if (done || out[t]) return; if (i === q.answer) { b.classList.add('right'); fin(t); } else { b.classList.add('wrong'); out[t] = true; ps[t].classList.add('locked'); NS.sfx('bad'); if (out[0] && out[1]) fin(-1); } }
        function fin(w) { if (done) return; done = true; tm.stop(); NS.sfx(w >= 0 ? 'ok' : 'bad'); setTimeout(() => res(w), 900); }
      })
    };
    NS.arenaRun(ui, { maxRounds: +o.rounds, board }).then(r => {
      if (sh.dead) return;
      sh.setActive(-1); upd(r.S);
      sh.result({ scores: r.scores, stats, wrong: [...wrongWords.values()] });
    }).catch(e => { if (!sh.dead) console.error(e); });
  }
});
})();
