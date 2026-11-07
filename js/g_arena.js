/* ===== GAME 3: ĐẤU TRƯỜNG TỪ VỰNG — bản đồ đồ thị (đường rẽ, cầu nối, cổng dịch chuyển), bộ máy luật + giao diện ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

const TILE = {
  start: { icon: '🏁', name: 'Xuất phát' }, finish: { icon: '🏆', name: 'Về đích' }, plain: { icon: '', name: 'Đường đi' },
  bonus: { icon: '⭐', name: 'Thưởng +3' }, trap: { icon: '🕳️', name: 'Bẫy' }, swap: { icon: '🔄', name: 'Đổi chỗ với đối thủ' },
  steal: { icon: '🦹', name: 'Cướp 3 điểm' }, warp: { icon: '🌀', name: 'Cổng dịch chuyển' }, mystery: { icon: '❓', name: 'Hộp kỹ năng' },
  treasure: { icon: '💎', name: 'Kho báu' }, ice: { icon: '🧊', name: 'Băng giá' }, hole: { icon: '⚫', name: 'Hố đen' }
};
/* when: q = dùng khi trả lời · turn = dùng ở đầu lượt · react = tự hỏi khi bị tấn công */
const CARD = {
  fifty: { icon: '✂️', name: '50/50', desc: 'Bỏ 2 đáp án sai khi đang trả lời', when: 'q' },
  swapq: { icon: '🔁', name: 'Đổi câu', desc: 'Đổi sang một câu hỏi khác khi đang trả lời', when: 'q' },
  shield: { icon: '🛡️', name: 'Khiên', desc: 'Chặn một hiệu ứng xấu (sẽ được hỏi khi bị tấn công)', when: 'react' },
  freeze: { icon: '🥶', name: 'Đóng băng', desc: 'Đối thủ mất lượt kế tiếp', when: 'turn' },
  dice2: { icon: '🎲', name: 'Xúc xắc đôi', desc: 'Thêm 1 xúc xắc ở lượt này', when: 'turn' },
  boots: { icon: '👟', name: 'Giày bay', desc: 'Nếu trả lời đúng, đi thêm 3 ô', when: 'turn' },
  magnet: { icon: '🧲', name: 'Nam châm', desc: 'Hút 2 điểm của đối thủ', when: 'turn' }
};
const CARD_KEYS = Object.keys(CARD);
const BAD = new Set(['trap', 'ice', 'hole']);
const ROAD = { stem: 'Đường vào', up: 'Đường trên (an toàn, nhiều thưởng)', mid: 'Đường tắt giữa (ngắn, nhiều bẫy)', low: 'Đường dưới (nhiều hộp kỹ năng)', top: 'Nhánh trên về đích', bot: 'Nhánh dưới về đích', merge: 'Ngã tư', start: 'Xuất phát', end: 'Đích' };
NS.ARENA = { TILE, CARD, ROAD };

/* ---------- Hình dạng bản đồ (cố định) ---------- */
function layout() {
  const nodes = [];
  const add = (x, y, road) => { nodes.push({ id: nodes.length, x, y, road, type: 'plain', next: [] }); return nodes.length - 1; };
  const link = (a, b) => { if (!nodes[a].next.includes(b)) nodes[a].next.push(b); };
  const along = (pts, gap) => {
    const segs = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(d); L += d; }
    const n = Math.max(2, Math.round(L / gap)), res = [];
    for (let k = 1; k < n; k++) { let t = L * k / n, i = 0; while (i < segs.length - 1 && t > segs[i]) { t -= segs[i]; i++; } const f = t / segs[i]; res.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]); }
    return res;
  };
  const chain = (from, to, pts, gap, road) => { let prev = from; const ids = []; along(pts, gap).forEach(([x, y]) => { const id = add(x, y, road); link(prev, id); prev = id; ids.push(id); }); link(prev, to); return ids; };
  const S = add(5, 30, 'start'), J1 = add(22, 30, 'stem'), M = add(75, 30, 'merge');
  const F1 = add(82, 20, 'top'), F2 = add(90, 20, 'top'), G1 = add(82, 40, 'bot'), G2 = add(90, 40, 'bot'), FIN = add(96, 30, 'end');
  link(M, F1); link(F1, F2); link(F2, FIN); link(M, G1); link(G1, G2); link(G2, FIN);
  const stem = chain(S, J1, [[5, 30], [22, 30]], 5.5, 'stem');
  const up = chain(J1, M, [[22, 30], [27, 19], [37, 9], [50, 7], [63, 10], [71, 19], [75, 30]], 4.6, 'up');
  const mid = chain(J1, M, [[22, 30], [75, 30]], 4.6, 'mid');
  const low = chain(J1, M, [[22, 30], [27, 41], [37, 51], [50, 53], [63, 50], [71, 41], [75, 30]], 4.6, 'low');
  /* cầu nối giữa các đường: rẽ sang đường khác khi đi ngang */
  link(up[5], mid[4]); link(low[5], mid[4]); link(mid[7], up[11]); link(mid[7], low[11]);
  return { nodes, start: S, finish: FIN, J1, M, F1, F2, G1, G2, stem, up, mid, low, portals: [[low[3], up[13]], [up[3], mid[9]]] };
}

/* Bảng chơi: cùng hình dạng, ô chức năng được xếp ngẫu nhiên theo từng con đường */
NS.arenaBoard = function (rnd) {
  rnd = rnd || NS.rand;
  for (let tries = 0; tries < 800; tries++) {
    const L = layout(), nodes = L.nodes, reserved = new Set([L.start, L.finish, L.J1, L.M, ...L.stem]);
    L.portals.forEach(([a, b]) => { nodes[a].type = 'warp'; nodes[a].warpTo = b; reserved.add(a); reserved.add(b); nodes[b].portalOut = true; });
    [[L.F1, 'bonus'], [L.F2, 'mystery'], [L.G1, 'ice'], [L.G2, 'bonus']].forEach(([i, t]) => { nodes[i].type = t; reserved.add(i); });
    nodes[L.start].type = 'start'; nodes[L.finish].type = 'finish';
    const fill = (ids, types) => { const free = NS.shuffle(ids.filter(i => !reserved.has(i)), rnd); types.forEach((t, k) => { nodes[free[k]].type = t; }); };
    fill(L.up, ['bonus', 'bonus', 'bonus', 'mystery', 'mystery', 'treasure', 'trap', 'swap']);
    fill(L.mid, ['trap', 'trap', 'steal', 'ice', 'hole', 'bonus', 'mystery']);
    fill(L.low, ['mystery', 'mystery', 'mystery', 'bonus', 'bonus', 'swap', 'steal', 'trap', 'ice']);
    let ok = true;
    [L.up, L.mid, L.low].forEach(r => { if (BAD.has(nodes[r[0]].type)) ok = false; });
    nodes.forEach(n => n.next.forEach(b => { if (BAD.has(n.type) && BAD.has(nodes[b].type)) ok = false; }));
    if (!ok) continue;
    /* khoảng cách ngắn nhất tới đích (BFS ngược) */
    const dist = Array(nodes.length).fill(Infinity); dist[L.finish] = 0; const q = [L.finish];
    while (q.length) { const x = q.shift(); nodes.forEach(n => { if (n.next.includes(x) && dist[n.id] === Infinity) { dist[n.id] = dist[x] + 1; q.push(n.id); } }); }
    return { nodes, start: L.start, finish: L.finish, dist, portals: L.portals, roads: { up: L.up, mid: L.mid, low: L.low } };
  }
  throw new Error('Không tạo được bản đồ');
};

const MYSTERY = ['skill', 'skill', 'skill', 'skill', 'skill', 'skill', 'plus2', 'adv2', 'opp2', 'minus2', 'race', 'swap50'];
const MYSTERY_TXT = { skill: '🎴 Hộp kỹ năng! Bạn được nhận một thẻ kỹ năng', plus2: '+2 điểm', adv2: 'Tiến 2 ô', opp2: 'Đối thủ lùi 2 ô', minus2: '−2 điểm', race: 'Đua nhanh: ai đúng trước +2 điểm', swap50: 'Đổi 50% điểm số với đối thủ' };
const EVENTS = ['storm', 'festival', 'reverse', 'rain', 'golden'];
const EVENT_TXT = { storm: '🌪️ BÃO! Hiệu ứng xấu x2 trong 1 vòng', festival: '🎉 LỄ HỘI! Điểm thưởng x2 trong 1 vòng', reverse: '🔀 NGÀY ĐẢO NGƯỢC! Hai đội đổi chỗ', rain: '🌧️ MƯA TỪ VỰNG! Ai đúng trước +2 điểm', golden: '🌟 GIỜ VÀNG! Trả lời đúng được thêm 1 lượt (1 vòng)' };

/* ui: giao diện (hoặc bot). Mọi phương thức có thể async. */
NS.arenaRun = async function (ui, o) {
  o = o || {}; const rnd = o.rnd || NS.rand, maxRounds = o.maxRounds || 10, maxCards = o.maxCards || 3, events = o.events !== false;
  const map = o.map || NS.arenaBoard(rnd), nodes = map.nodes, FIN = map.finish;
  const S = { pos: [map.start, map.start], hist: [[map.start], [map.start]], score: [0, 0], skip: [0, 0], cards: [[], []], streak: [0, 0], round: 0, mods: { storm: 0, festival: 0, golden: 0 }, lastUnder: [-9, -9], finished: -1, map, bonus: [{ dice: 0, steps: 0 }, { dice: 0, steps: 0 }], log: [] };
  const other = t => 1 - t, clamp0 = x => Math.max(0, x);
  const sync = () => ui.updated && ui.updated(S);
  const say = async (m, k) => { S.log.push(m); if (ui.say) await ui.say(m, k); };
  const ic = t => (NS.TEAM_ICON[t] || '');
  const giveCard = async t => {
    const c = NS.pick(CARD_KEYS, rnd);
    if (S.cards[t].length >= maxCards) {
      const i = await ui.choose(t, 'Đã đủ ' + maxCards + ' thẻ! Bỏ thẻ nào?', S.cards[t].map(x => CARD[x].icon + ' ' + CARD[x].name).concat(['Không nhận thẻ mới ' + CARD[c].icon + ' ' + CARD[c].name]));
      if (i >= S.cards[t].length) return; S.cards[t].splice(i, 1);
    }
    S.cards[t].push(c); await say(ic(t) + ' nhận thẻ ' + CARD[c].icon + ' ' + CARD[c].name + ' — ' + CARD[c].desc + '. Giữ lại dùng khi nào cũng được!', 'good'); sync();
  };
  const useCard = (t, c) => { const i = S.cards[t].indexOf(c); if (i >= 0) S.cards[t].splice(i, 1); sync(); };
  const mult = bad => (bad && S.mods.storm > 0 ? 2 : 1);
  const tryBlock = async t => {
    if (!S.cards[t].includes('shield')) return false;
    const i = await ui.choose(t, '🛡️ Dùng thẻ Khiên để chặn?', ['Có, dùng Khiên', 'Không']);
    if (i === 0) { useCard(t, 'shield'); await say('🛡️ ' + ic(t) + ' đã chặn hiệu ứng!', 'good'); return true; } return false;
  };
  const addScore = (t, d) => { S.score[t] = clamp0(S.score[t] + d); sync(); };
  const markFinish = t => { if (S.finished < 0 && S.pos[t] === FIN) S.finished = t; };

  /* đi tiến từng ô; gặp ngã rẽ thì người chơi chọn đường */
  async function walk(t, steps) {
    for (let i = 0; i < steps; i++) {
      const cur = S.pos[t]; if (cur === FIN) break;
      const nx = nodes[cur].next; let to = nx[0];
      if (nx.length > 1) { const k = await ui.chooseNext(t, nx.slice(), steps - i, S); to = nx[Math.max(0, Math.min(nx.length - 1, k | 0))]; }
      S.pos[t] = to; S.hist[t].push(to);
      if (ui.step) await ui.step(t, cur, to, S);
      sync();
    }
  }
  /* lùi theo đúng đường đã đi */
  async function back(t, n) {
    const path = [];
    while (n-- > 0 && S.hist[t].length > 1) { S.hist[t].pop(); path.push(S.hist[t][S.hist[t].length - 1]); }
    if (path.length) { S.pos[t] = path[path.length - 1]; if (ui.jump) await ui.jump(t, path, 'back'); sync(); }
  }
  async function teleport(t, to) { S.pos[t] = to; S.hist[t].push(to); if (ui.jump) await ui.jump(t, [to], 'warp'); sync(); }
  const swapPos = async () => {
    [S.pos[0], S.pos[1]] = [S.pos[1], S.pos[0]]; S.hist[0].push(S.pos[0]); S.hist[1].push(S.pos[1]);
    if (ui.swapPos) await ui.swapPos(S); sync();
  };

  async function applyTile(t) {
    const nd = nodes[S.pos[t]], type = nd.type, o2 = other(t);
    if (type === 'start' || type === 'finish' || type === 'plain') return;
    await say(ic(t) + ' vào ô ' + TILE[type].icon + ' ' + TILE[type].name, type);
    const f = S.mods.festival > 0 ? 2 : 1;
    switch (type) {
      case 'bonus': addScore(t, 3 * f); await say('+' + 3 * f + ' điểm!', 'good'); break;
      case 'trap': {
        if (await tryBlock(t)) break; const m = mult(true);
        const i = await ui.choose(t, 'Dính bẫy! Chọn hình phạt', ['Mất ' + m + ' lượt', 'Lùi ' + 3 * m + ' ô (theo đường đã đi)']);
        if (i === 0) S.skip[t] += m; else await back(t, 3 * m); sync(); break;
      }
      case 'swap': await swapPos(); break;
      case 'steal': {
        if (await tryBlock(o2)) break; const m = mult(true), x = Math.min(3 * m, S.score[o2]);
        S.score[o2] -= x; S.score[t] += x; await say('Cướp ' + x + ' điểm!', 'good'); sync(); break;
      }
      case 'warp': await say('🌀 Bạn bị hút qua cổng dịch chuyển!', 'good'); await teleport(t, nd.warpTo); break;
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
      case 'adv2': await walk(t, 2); break;
      case 'opp2': await back(o2, 2); break;
      case 'minus2': addScore(t, -2); break;
      case 'race': { const w = await ui.race(); if (w >= 0) { addScore(w, 2); await say(ic(w) + ' đúng trước +2', 'good'); } break; }
      case 'swap50': { const a = Math.floor(S.score[0] / 2), b = Math.floor(S.score[1] / 2); S.score[0] = S.score[0] - a + b; S.score[1] = S.score[1] - b + a; sync(); break; }
    }
  }
  /* dùng thẻ ở đầu lượt: có thể dùng ngay hoặc giữ lại cho lượt sau */
  async function skillPhase(t) {
    for (let guard = 0; guard < 6; guard++) {
      const usable = S.cards[t].filter(c => CARD[c].when === 'turn');
      if (!usable.length) return;
      const i = await ui.skillMenu(t, usable, S);
      if (i < 0 || i >= usable.length) return;
      const c = usable[i], o2 = other(t); useCard(t, c);
      switch (c) {
        case 'freeze': if (!(await tryBlock(o2))) { S.skip[o2]++; await say('🥶 Đối thủ sẽ mất lượt kế tiếp!', 'good'); } break;
        case 'dice2': S.bonus[t].dice++; await say('🎲 Lượt này bạn có thêm 1 xúc xắc!', 'good'); break;
        case 'boots': S.bonus[t].steps += 3; await say('👟 Nếu trả lời đúng, bạn đi thêm 3 ô!', 'good'); break;
        case 'magnet': if (!(await tryBlock(o2))) { const x = Math.min(2, S.score[o2]); S.score[o2] -= x; S.score[t] += x; await say('🧲 Hút ' + x + ' điểm!', 'good'); } break;
      }
      sync();
    }
  }

  async function turn(t, extra) {
    if (S.skip[t] > 0) { S.skip[t]--; await say(ic(t) + ' bị mất lượt!', 'bad'); sync(); return; }
    const o2 = other(t); S.bonus[t] = { dice: 0, steps: 0 };
    await ui.turnStart(t, S, S.round);
    let bonusSteps = 0;
    if (o.underdog !== false && (S.score[o2] - S.score[t] >= 8 || map.dist[S.pos[t]] - map.dist[S.pos[o2]] >= 6) && S.round - S.lastUnder[t] >= 3) {
      S.lastUnder[t] = S.round; bonusSteps = 1; await say('💪 Trợ lực đội đang thua: +1 thẻ, +1 bước!', 'good'); await giveCard(t);
    }
    await skillPhase(t);
    const lv = await ui.chooseLevel(t);
    const res = await ui.ask(t, lv, { cards: S.cards[t].filter(c => CARD[c].when === 'q') });
    (res.used || []).forEach(c => useCard(t, c));
    const f = S.mods.festival > 0 ? 2 : 1;
    let correct = !!res.correct;
    if (correct) {
      S.streak[t]++; const pts = [1, 2, 3][lv] * f; addScore(t, pts);
      if (S.streak[t] % 3 === 0) { await say('🔥 3 câu đúng liên tiếp!', 'good'); await giveCard(t); }
      const dice = []; const n = [1, 2, 3][lv] + S.bonus[t].dice; for (let i = 0; i < n; i++) dice.push(1 + Math.floor(rnd() * 6));
      const extraSteps = bonusSteps + S.bonus[t].steps, total = dice.reduce((a, b) => a + b, 0) + extraSteps;
      if (ui.showDice) await ui.showDice(t, dice, extraSteps);
      await walk(t, total);
      if (S.pos[t] !== FIN) await applyTile(t);
    } else {
      S.streak[t] = 0;
      if (lv === 1) await back(t, 1); else if (lv === 2) { await back(t, 2); addScore(t, -1); }
      await say('Sai rồi! ' + ['Đứng yên', 'Lùi 1 ô', 'Lùi 2 ô và −1 điểm'][lv], 'bad');
    }
    S.bonus[t] = { dice: 0, steps: 0 };
    markFinish(t);
    if (correct && S.mods.golden > 0 && !extra && S.finished < 0) { await say('🌟 Giờ vàng: thêm một lượt!', 'good'); await turn(t, true); }
  }

  for (S.round = 1; S.round <= maxRounds; S.round++) {
    sync(); if (ui.roundStart) await ui.roundStart(S.round);
    const first = (S.round - 1) % 2, order = [first, other(first)];
    for (let k = 0; k < 2; k++) {
      const t = order[k]; await turn(t);
      if (S.finished >= 0) {
        if (k === 0 && S.pos[other(t)] !== FIN) { await say('🏁 ' + ic(t) + ' về đích đầu tiên! Đội kia có lượt cuối.', 'good'); await turn(other(t)); }
        break;
      }
    }
    if (S.finished >= 0) break;
    ['storm', 'festival', 'golden'].forEach(k => { if (S.mods[k] > 0) S.mods[k]--; });
    if (events && S.round % 3 === 0 && S.round < maxRounds) {
      const ev = NS.pick(EVENTS, rnd); await say(EVENT_TXT[ev], 'event');
      if (ev === 'reverse') await swapPos();
      else if (ev === 'rain') { const w = await ui.race(); if (w >= 0) addScore(w, 2); }
      else S.mods[ev] = 1;
    }
  }
  if (S.finished >= 0) { const bonus = Math.min(S.score[S.finished], 20); addScore(S.finished, bonus); await say('🏆 Thưởng về đích đầu tiên: +' + bonus + ' điểm!', 'good'); }
  const d0 = map.dist[S.pos[0]], d1 = map.dist[S.pos[1]];
  let winner = S.score[0] === S.score[1] ? (d0 === d1 ? -1 : (d0 < d1 ? 0 : 1)) : (S.score[0] > S.score[1] ? 0 : 1);
  if (winner < 0) { await say('⚔️ Hòa tuyệt đối! Đấu tay đôi!', 'event'); const w = await ui.race(); winner = w; }
  return { scores: S.score.slice(), pos: S.pos.slice(), winner, rounds: Math.min(S.round, maxRounds), finished: S.finished, S };
};

/* ---------- Giao diện ---------- */
NS.games.push({
  id: 'arena', name: 'Đấu trường từ vựng', icon: '🎲', desc: 'Trả lời đúng để đổ xúc xắc, đi trên bản đồ có ngã rẽ, cầu nối, cổng dịch chuyển. Thu thập thẻ kỹ năng và dùng khi cần!',
  options: [
    { key: 'rounds', label: 'Số vòng tối đa', type: 'select', choices: [[6, '6'], [8, '8'], [10, '10'], [14, '14']], def: 10 },
    { key: 'qtime', label: 'Thời gian trả lời mỗi câu', type: 'select', choices: [[8, '8 giây'], [12, '12 giây'], [20, '20 giây'], [30, '30 giây'], [0, 'Không giới hạn']], def: 12 },
    { key: 'maxCards', label: 'Số thẻ kỹ năng được giữ tối đa', type: 'select', choices: [[2, '2'], [3, '3'], [4, '4'], [5, '5']], def: 3 },
    { key: 'events', label: 'Sự kiện bất ngờ mỗi 3 vòng (bão, lễ hội, giờ vàng...)', type: 'toggle', def: true },
    { key: 'underdog', label: 'Trợ lực cho đội đang thua', type: 'toggle', def: true },
    { key: 'legend', label: 'Hiện chú thích các ô dưới bản đồ', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🎲 Đấu trường', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, map = NS.arenaBoard(), nodes = map.nodes, split = sh.split, qsec = +o.qtime;
    const stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }], wrongWords = new Map();
    const ic = t => NS.TEAM_ICON[t];
    /* bản đồ */
    const mapEl = h('div', { class: 'amap' }), NS_SVG = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS_SVG, 'svg'); svg.setAttribute('viewBox', '0 0 100 60'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'aedges');
    const seg = (a, b, cls, dash) => { const l = document.createElementNS(NS_SVG, 'line'); l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y); l.setAttribute('class', cls + (dash ? ' dash' : '')); svg.append(l); };
    nodes.forEach(n => n.next.forEach(b => { const m = nodes[b]; seg(n, m, 'e-' + (n.road === m.road ? n.road : 'bridge'), n.road !== m.road && n.road !== 'stem' && n.road !== 'merge' && m.road !== 'merge'); }));
    map.portals.forEach(([a, b]) => { const l = document.createElementNS(NS_SVG, 'path'); const A = nodes[a], B = nodes[b]; l.setAttribute('d', 'M' + A.x + ' ' + A.y + ' Q' + ((A.x + B.x) / 2) + ' ' + ((A.y + B.y) / 2 + (A.y < 30 ? -14 : 14)) + ' ' + B.x + ' ' + B.y); l.setAttribute('class', 'e-portal'); svg.append(l); });
    mapEl.append(svg);
    const nodeEls = [];
    nodes.forEach(n => {
      const el = h('div', { class: 'anode ' + n.type + (n.portalOut ? ' pout' : ''), style: 'left:' + n.x + '%;top:' + (n.y / 0.6) + '%', title: (n.portalOut ? '🌀 Cổng ra' : TILE[n.type].name) }, n.portalOut ? '🌀' : (TILE[n.type].icon || ''));
      nodeEls[n.id] = el; mapEl.append(el);
    });
    const pawns = [0, 1].map(t => { const p = h('div', { class: 'pawn t' + t }, ic(t)); mapEl.append(p); return p; });
    const place = (t, id) => { const n = nodes[id]; pawns[t].style.left = n.x + '%'; pawns[t].style.top = (n.y / 0.6) + '%'; };
    place(0, map.start); place(1, map.start);
    const legend = o.legend ? h('div', { class: 'alegend' }, ['bonus', 'mystery', 'treasure', 'trap', 'ice', 'hole', 'steal', 'swap', 'warp'].map(k => h('span', {}, TILE[k].icon + ' ' + TILE[k].name)).concat([h('span', {}, '┄ cầu nối: rẽ sang đường khác'), h('span', {}, '🌀 → cổng ra')])) : null;
    /* khung đội: tên, điểm, thẻ kỹ năng */
    const info = [0, 1].map(t => h('div', { class: 'aphead t' + t })), tagEl = [sh.tag(0), sh.tag(1)];
    const mkBody = () => h('div', { class: 'apbody' });
    const bodies = split ? [mkBody(), mkBody()] : [mkBody()];
    const body = t => (split ? bodies[t] : bodies[0]);
    const wrap = h('div', { class: 'awrap' + (split ? ' split' : '') });
    const mapBox = h('div', { class: 'amapbox' }, mapEl, legend);
    if (split) {
      wrap.append(h('div', { class: 'apanel2 t1' }, info[1], bodies[1]), mapBox, h('div', { class: 'apanel2 t0' }, info[0], bodies[0]));
      wrap.firstChild.classList.add('flip');
    } else wrap.append(h('div', { class: 'aheads' }, info[0], info[1]), mapBox, h('div', { class: 'aq' }, bodies[0]));
    sh.area.append(wrap);
    sh.area.classList.add('arena');

    const wait = ms => sh.sleep(ms);
    let active = -1;
    const idleView = t => h('div', { class: 'await' }, '⏳ Đến lượt ' + ic(1 - t) + ' ' + names[1 - t] + '…');
    /* hiển thị nội dung cho đội t (đội kia thấy "đang chờ" khi chia đôi màn hình) */
    const setPanel = (t, node) => { body(t).innerHTML = ''; body(t).append(node); if (split) { body(1 - t).innerHTML = ''; body(1 - t).append(idleView(1 - t)); } };
    const showMsg = m => { [0, 1].forEach(t => { if (!split && t === 1) return; body(t).innerHTML = ''; body(t).append(h('div', { class: 'amsg' }, m)); }); };
    const upd = S => {
      [0, 1].forEach(t => { place(t, S.pos[t]); sh.setScore(t, S.score[t]); });
      [0, 1].forEach(t => {
        info[t].innerHTML = '';
        info[t].append(h('b', { class: 'aphn' }, ic(t) + ' ' + names[t] + '  '), tagEl[t], h('span', { class: 'aphs' }, (S.skip[t] ? '  🧊×' + S.skip[t] : '') + (S.streak[t] >= 2 ? '  🔥' + S.streak[t] : '') + '  · còn ' + map.dist[S.pos[t]] + ' ô'),
          h('span', { class: 'acards' }, S.cards[t].length ? S.cards[t].map(c => NS.tap(h('span', { class: 'cchip', title: CARD[c].name + ': ' + CARD[c].desc }, CARD[c].icon + ' ' + CARD[c].name), () => sh.toast(CARD[c].icon + ' ' + CARD[c].name + ': ' + CARD[c].desc, 2600))) : h('span', { class: 'cnone' }, ' (chưa có thẻ)')));
      });
    };
    const btnRow = (t, title, labels, cls, sub) => new Promise(res => {
      const box = h('div', {}, h('div', { class: 'aqt t' + t }, title), sub ? h('div', { class: 'asub' }, sub) : null, h('div', { class: 'aqb' }, labels.map((l, i) => NS.tap(h('button', { type: 'button', class: (cls && cls[i]) || '' }, l), () => res(i)))));
      setPanel(t, box);
    });

    const ui = {
      updated: upd,
      say: async m => { showMsg(m); NS.sfx(/Sai|bad|Mất|Trả/.test(m) ? 'bad' : 'pow'); await wait(m.length > 50 ? 2100 : 1400); },
      turnStart: async (t, S, r) => { active = t; sh.setActive(t); sh.setInfo('Vòng ' + r + '/' + o.rounds); showMsg('Đến lượt ' + ic(t) + ' ' + names[t]); await wait(800); },
      roundStart: async () => {},
      chooseLevel: t => btnRow(t, ic(t) + ' ' + names[t] + ' chọn mức câu hỏi', ['Dễ · 🎲×1 · +1đ', 'Vừa · 🎲×2 · +2đ (sai: lùi 1)', 'Khó · 🎲×3 · +3đ (sai: lùi 2, −1đ)'], ['green', '', 'red']),
      choose: (t, title, opts) => btnRow(t, title, opts),
      skillMenu: (t, usable) => btnRow(t, '🎴 Thẻ kỹ năng của ' + ic(t) + ' ' + names[t], usable.map(c => CARD[c].icon + ' ' + CARD[c].name + ' — ' + CARD[c].desc).concat(['▶ Không dùng (giữ lại), bắt đầu trả lời']), usable.map(() => 'gold').concat(['green']), 'Dùng ngay hoặc giữ lại cho lượt sau — tùy bạn!').then(i => (i >= usable.length ? -1 : i)),
      chooseNext: (t, nexts, left) => new Promise(res => {
        const clear = () => nexts.forEach(i => { nodeEls[i].classList.remove('choice'); nodeEls[i]._pick = null; });
        const pick = k => { clear(); res(k); };
        const labels = nexts.map(i => { const n = nodes[i]; return (ROAD[n.road] || 'Đường') + '  ' + (TILE[n.type].icon || '·'); });
        nexts.forEach((i, k) => { nodeEls[i].classList.add('choice'); nodeEls[i]._pick = () => pick(k); });
        setPanel(t, h('div', {}, h('div', { class: 'aqt t' + t }, '🔀 Ngã rẽ! ' + ic(t) + ' ' + names[t] + ' chọn đường (còn ' + left + ' bước)'), h('div', { class: 'asub' }, 'Bấm nút hoặc bấm thẳng vào ô sáng trên bản đồ'),
          h('div', { class: 'aqb' }, labels.map((l, k) => NS.tap(h('button', { type: 'button', class: k === 0 ? 'green' : '' }, l), () => pick(k))))));
      }),
      swapPos: async S => { upd(S); await wait(500); },
      showDice: async (t, dice, bonus) => {
        const faces = '⚀⚁⚂⚃⚄⚅'; const d = h('div', { class: 'adice' }, '🎲'); setPanel(t, d);
        for (let i = 0; i < 8; i++) { d.textContent = dice.map(() => faces[NS.randInt(0, 5)]).join(' '); NS.sfx('dice'); await wait(90); }
        d.textContent = dice.map(x => faces[x - 1]).join(' ') + '  = ' + (dice.reduce((a, b) => a + b, 0) + bonus) + (bonus ? ' (+' + bonus + ' thêm)' : ''); await wait(900);
      },
      step: async (t, from, to) => { place(t, to); NS.sfx('tick'); await wait(230); },
      jump: async (t, path, kind) => {
        if (kind === 'warp') { pawns[t].classList.add('zap'); place(t, path[0]); await wait(650); pawns[t].classList.remove('zap'); return; }
        for (const id of path) { place(t, id); NS.sfx('tick'); await wait(230); }
      },
      ask: (t, lv, opt) => new Promise(async res => {
        let q = NS.nextMC({ level: lv + 1 }); if (!q) { res({ correct: true }); return; }
        const used = []; let done = false, tm = null;
        const render = () => {
          const bar = h('div', { class: 'tbar' }, h('i', {}));
          const stem = h('div', { class: 'aqs' }, h('span', { class: 't' + t }, ic(t) + ' ' + names[t] + (opt.treasure ? ' 💎 KHO BÁU' : ' — ' + ['Dễ', 'Vừa', 'Khó'][lv])), h('div', { class: 'aqq' }, q.stem), q.sub ? h('div', { class: 'aipa' }, q.sub) : null, qsec > 0 || q.timeLimit ? bar : null);
          const opts = h('div', { class: 'aqo' }); const bs = q.options.map((tx, i) => { const b = h('button', { type: 'button', class: 'lopt' }, tx); NS.tap(b, () => pick(i, b)); opts.append(b); return b; });
          const cb = h('div', { class: 'acb' });
          (opt.cards || []).forEach(c => { if (used.includes(c)) return; cb.append(NS.tap(h('button', { class: 'small', type: 'button', 'data-c': c }, CARD[c].icon + ' ' + CARD[c].name), () => {
            if (done) return; used.push(c);
            if (c === 'fifty') { NS.shuffle(bs.map((_, i) => i).filter(i => i !== q.answer)).slice(0, 2).forEach(i => bs[i].classList.add('gone')); cb.querySelector('[data-c=fifty]').remove(); }
            else { const nq = NS.nextMC({ level: lv + 1 }); if (nq) { q = nq; if (tm) tm.stop(); render(); } }
          })); });
          const box = h('div', {}, stem, opts, cb); setPanel(t, box);
          if (tm) tm.stop(); const tl = (q.timeLimit || qsec) * 1000;
          tm = NS.timer(tl, l => { bar.firstChild.style.width = (l / tl * 100) + '%'; bar.classList.toggle('low', l < 4000); }, () => pick(-1));
          function pick(i, b) {
            if (done || sh.paused) return; done = true; tm.stop();
            const ok = i === q.answer; bs.forEach((x, k) => { x.classList.add('locked'); if (k === q.answer) x.classList.add('right'); }); if (b && !ok) b.classList.add('wrong');
            stats[t][ok ? 'right' : 'wrong']++; NS.sfx(ok ? 'ok' : 'bad'); NS.vibe(ok ? 30 : 80);
            if (!ok && q.word) { NS.markWrong(q.word); wrongWords.set(q.word.id, q.word); }
            box.append(h('div', { class: 'aans' }, (ok ? '✅ Đúng! ' : (i < 0 ? '⏰ Hết giờ! ' : '❌ ')) + (q.explanation || q.options[q.answer])));
            setTimeout(() => res({ correct: ok, used }), ok ? 900 : 2200);
          }
        };
        render();
      }),
      race: () => new Promise(res => {
        const q = NS.nextMC({ level: 2 }); if (!q) return res(-1);
        let done = false, out = [false, false];
        const bar = h('div', { class: 'tbar' }, h('i', {}));
        const ps = [0, 1].map(t => { const bs = q.options.map((tx, i) => { const b = h('button', { type: 'button', class: 'lopt' }, tx); NS.tap(b, () => ans(t, i, b)); return b; }); return h('div', { class: 'lpanel t' + t }, h('div', { class: 'aname' }, ic(t) + ' ' + names[t]), h('div', { class: 'lopts' }, bs)); });
        const head = h('div', { class: 'aqs' }, '⚡ ĐUA NHANH! ', h('div', { class: 'aqq' }, q.stem), bar);
        if (split) { [0, 1].forEach(t => { body(t).innerHTML = ''; body(t).append(h('div', { class: 'aqs' }, '⚡ ĐUA NHANH! ', h('div', { class: 'aqq' }, q.stem)), ps[t]); }); body(0).append(bar); }
        else { body(0).innerHTML = ''; body(0).append(head, h('div', { class: 'lpanels' }, ps)); }
        const tm = NS.timer(10000, l => { bar.firstChild.style.width = (l / 100) + '%'; }, () => fin(-1));
        function ans(t, i, b) { if (done || out[t]) return; if (i === q.answer) { b.classList.add('right'); fin(t); } else { b.classList.add('wrong'); b.classList.add('locked'); out[t] = true; ps[t].classList.add('locked'); NS.sfx('bad'); if (out[0] && out[1]) fin(-1); } }
        function fin(w) { if (done) return; done = true; tm.stop(); NS.sfx(w >= 0 ? 'ok' : 'bad'); setTimeout(() => res(w), 900); }
      })
    };
    /* bấm thẳng vào ô sáng khi chọn đường */
    nodeEls.forEach(el => NS.tap(el, () => { if (el._pick) el._pick(); }));
    showMsg('Chuẩn bị xuất phát!');
    NS.arenaRun(ui, { maxRounds: +o.rounds, map, maxCards: +o.maxCards, events: !!o.events, underdog: !!o.underdog }).then(r => {
      if (sh.dead) return;
      sh.setActive(-1); upd(r.S);
      sh.result({ scores: r.scores, stats, wrong: [...wrongWords.values()] });
    }).catch(e => { if (!sh.dead) console.error(e); });
  }
});
})();
