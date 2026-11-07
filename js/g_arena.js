/* ===== GAME 3: ĐẤU TRƯỜNG TỪ VỰNG — nhiều bản đồ đồ thị (đường rẽ, cầu nối, cổng dịch chuyển), bộ máy luật + giao diện ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

const TILE = {
  start: { icon: '🏁', name: 'Xuất phát', desc: 'Nơi hai đội bắt đầu.' },
  finish: { icon: '🏆', name: 'Về đích', desc: 'Đội về đích trước nhận thưởng bằng số điểm đang có (tối đa +20). Đội kia còn một lượt cuối.' },
  plain: { icon: '', name: 'Ô trống', desc: 'Chấm xám nhỏ: không có gì xảy ra.' },
  bonus: { icon: '⭐', name: 'Thưởng', desc: 'Cộng 3 điểm (nhân đôi khi có Lễ hội).' },
  treasure: { icon: '💎', name: 'Kho báu', desc: 'Trả lời một câu mức vừa. Đúng được +5 điểm, sai thì không có gì.' },
  mystery: { icon: '❓', name: 'Hộp kỹ năng', desc: 'Một nửa số lần nhận 1 thẻ kỹ năng để GIỮ LẠI dùng sau. Còn lại là: +2 điểm, tiến 2 ô, đối thủ lùi 2 ô, −2 điểm, đua nhanh hoặc đổi 50% điểm.' },
  wheel: { icon: '🎡', name: 'Vòng quay may mắn', desc: 'Quay ngẫu nhiên: nhận từ 1 đến 5 điểm, hoặc 1 thẻ kỹ năng.' },
  rocket: { icon: '🚀', name: 'Tên lửa', desc: 'Bay thêm 2 ô về phía trước (gặp ngã rẽ vẫn được chọn đường).' },
  warp: { icon: '🌀', name: 'Cổng dịch chuyển', desc: 'Bị hút qua cổng. Đường chấm xanh trên bản đồ nối tới 🌀 mờ là cổng ra.' },
  swap: { icon: '🔄', name: 'Đổi chỗ', desc: 'Đổi vị trí với đối thủ (có thể lợi hoặc thiệt!).' },
  duel: { icon: '⚔️', name: 'Đấu tay đôi', desc: 'Cả hai đội cùng trả lời một câu. Đúng trước +3 điểm, đội kia −1 điểm.' },
  shop: { icon: '🛒', name: 'Cửa hàng', desc: 'Trả 3 điểm để đổi lấy 1 thẻ kỹ năng ngẫu nhiên (nếu còn chỗ giữ thẻ).' },
  flag: { icon: '🚩', name: 'Cột mốc', desc: '+1 điểm. Từ đó trở đi bạn KHÔNG bị lùi qua ô này nữa (bẫy, sai câu, dung nham...).' },
  steal: { icon: '🦹', name: 'Cướp điểm', desc: 'Cướp 3 điểm của đối thủ.' },
  trap: { icon: '🕳️', name: 'Bẫy', desc: 'Chọn: mất 1 lượt, hoặc lùi 3 ô theo đường đã đi.' },
  ice: { icon: '🧊', name: 'Băng giá', desc: 'Mất 1 lượt. (Ở Băng Địa: trượt thêm 1 ô về phía trước thay vì mất lượt.)' },
  hole: { icon: '⚫', name: 'Hố đen', desc: 'Trả 2 điểm cho đối thủ.' },
  lava: { icon: '🌋', name: 'Dung nham', desc: 'Lùi 2 ô và mất 1 điểm. Ở Núi Lửa, dung nham dâng thêm ô mới mỗi 2 vòng!' }
};
/* when: q = dùng khi trả lời · turn = dùng ở đầu lượt · react = tự hỏi khi bị tấn công */
const CARD = {
  fifty: { icon: '✂️', name: '50/50', desc: 'Bỏ 2 đáp án sai khi đang trả lời (chỉ câu trắc nghiệm)', when: 'q' },
  swapq: { icon: '🔁', name: 'Đổi câu', desc: 'Đổi sang một câu hỏi khác khi đang trả lời', when: 'q' },
  shield: { icon: '🛡️', name: 'Khiên', desc: 'Chặn một hiệu ứng xấu (sẽ được hỏi khi bị tấn công)', when: 'react' },
  freeze: { icon: '🥶', name: 'Đóng băng', desc: 'Đối thủ mất lượt kế tiếp', when: 'turn' },
  dice2: { icon: '🎲', name: 'Xúc xắc đôi', desc: 'Tung 2 lần, lấy kết quả cao hơn (vẫn tối đa 2 ô)', when: 'turn' },
  boots: { icon: '👟', name: 'Giày bay', desc: 'Nếu trả lời đúng, đi thêm 1 ô', when: 'turn' },
  magnet: { icon: '🧲', name: 'Nam châm', desc: 'Hút 2 điểm của đối thủ', when: 'turn' }
};
const CARD_KEYS = Object.keys(CARD);
const BAD = new Set(['trap', 'ice', 'hole', 'lava']);
const MYSTERY = ['skill', 'skill', 'skill', 'skill', 'skill', 'skill', 'plus2', 'adv2', 'opp2', 'minus2', 'race', 'swap50'];
const MYSTERY_TXT = { skill: '🎴 Hộp kỹ năng! Bạn được nhận một thẻ kỹ năng', plus2: '+2 điểm', adv2: 'Tiến 2 ô', opp2: 'Đối thủ lùi 2 ô', minus2: '−2 điểm', race: 'Đua nhanh: ai đúng trước +2 điểm', swap50: 'Đổi 50% điểm số với đối thủ' };
const EVENTS = ['storm', 'festival', 'reverse', 'rain', 'golden'];
const EVENT_TXT = { storm: '🌪️ BÃO! Hiệu ứng xấu x2 trong 1 vòng', festival: '🎉 LỄ HỘI! Điểm thưởng x2 trong 1 vòng', reverse: '🔀 NGÀY ĐẢO NGƯỢC! Hai đội đổi chỗ', rain: '🌧️ MƯA TỪ VỰNG! Ai đúng trước +2 điểm', golden: '🌟 GIỜ VÀNG! Trả lời đúng được thêm 1 lượt (1 vòng)' };
const EVENT_NAME = { storm: ['🌪️ Bão', 'Hiệu ứng xấu (bẫy, băng, hố đen, dung nham, cướp điểm...) nặng gấp đôi trong 1 vòng.'], festival: ['🎉 Lễ hội', 'Mọi điểm thưởng nhân đôi trong 1 vòng.'], reverse: ['🔀 Ngày đảo ngược', 'Hai đội đổi chỗ cho nhau trên bản đồ.'], rain: ['🌧️ Mưa từ vựng', 'Cả hai đội đua một câu, đúng trước +2 điểm.'], golden: ['🌟 Giờ vàng', 'Trả lời đúng được thêm 1 lượt trong 1 vòng.'] };
const ROADNAME = { up: 'Đường trên', mid: 'Đường giữa', low: 'Đường dưới', top: 'Nhánh trên', bot: 'Nhánh dưới', stem: 'Đường vào', merge: 'Ngã tư', start: 'Xuất phát', end: 'Đích', hub: 'Trung tâm', north: 'Bờ bắc', south: 'Bờ nam', inner: 'Đường xuyên đảo', left: 'Sườn trái (dốc, nhiều dung nham)', center: 'Sườn giữa (nhiều cột mốc)', right: 'Sườn phải (dài, an toàn)', ice: 'Đường băng', maze: 'Mê cung', main: 'Đại lộ giữa', high: 'Cao tốc', low2: 'Đại lộ dưới', street: 'Phố ngang' };
NS.ARENA = { TILE, CARD, ROADNAME, EVENT_NAME };

/* ---------- Dựng đồ thị ---------- */
function mk() {
  const nodes = [];
  const add = (x, y, road, type) => { nodes.push({ id: nodes.length, x, y, road, type: type || 'plain', next: [] }); return nodes.length - 1; };
  const link = (a, b) => { if (a !== b && !nodes[a].next.includes(b)) nodes[a].next.push(b); };
  const along = (pts, gap) => {
    const segs = []; let L = 0;
    for (let i = 0; i < pts.length - 1; i++) { const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); segs.push(d); L += d; }
    const n = Math.max(2, Math.round(L / gap)), res = [];
    for (let k = 1; k < n; k++) { let t = L * k / n, i = 0; while (i < segs.length - 1 && t > segs[i]) { t -= segs[i]; i++; } const f = t / segs[i]; res.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]); }
    return res;
  };
  const chain = (from, to, pts, gap, road) => { let prev = from; const ids = []; along(pts, gap).forEach(([x, y]) => { const id = add(x, y, road); link(prev, id); prev = id; ids.push(id); }); link(prev, to); return ids; };
  const dists = fin => { const d = Array(nodes.length).fill(Infinity); d[fin] = 0; const q = [fin]; while (q.length) { const x = q.shift(); nodes.forEach(n => { if (n.next.includes(x) && d[n.id] === Infinity) { d[n.id] = d[x] + 1; q.push(n.id); } }); } return d; };
  /* đường tắt: nối các nút gần nhau trên bản đồ nhưng xa nhau trên đường đi */
  const shortcuts = (fin, maxD, minDrop, count) => {
    const d = dists(fin), c = [];
    nodes.forEach(a => nodes.forEach(b => { if (a.id !== b.id && isFinite(d[a.id]) && isFinite(d[b.id]) && d[a.id] - d[b.id] >= minDrop && Math.hypot(a.x - b.x, a.y - b.y) <= maxD && !a.next.includes(b.id)) c.push([a.id, b.id, d[a.id] - d[b.id]]); }));
    c.sort((p, q) => q[2] - p[2] || p[0] - q[0] || p[1] - q[1]);
    const used = new Set(); let n = 0;
    for (const [a, b] of c) {
      if (n >= count) break; if (used.has(a) || used.has(b)) continue;
      link(a, b); n++;
      [a, b].forEach(k => nodes.forEach(m => { if (Math.hypot(m.x - nodes[k].x, m.y - nodes[k].y) < 11) used.add(m.id); }));
    }
  };
  return { nodes, add, link, chain, dists, shortcuts };
}

const MAPS = {
  classic: {
    name: 'Vương quốc ba ngả', icon: '🏰', desc: 'Bản đồ cân bằng, dễ làm quen.',
    traits: ['Ba con đường: trên an toàn, giữa ngắn nhiều bẫy, dưới nhiều hộp kỹ năng', 'Cầu nối giữa các đường và 2 cổng dịch chuyển', 'Hai nhánh về đích'],
    rule: {}, colors: { up: '#38b764', mid: '#ef7d57', low: '#41a6f6' },
    build() {
      const m = mk(), { add, link, chain } = m;
      const S = add(5, 30, 'start', 'start'), J1 = add(22, 30, 'stem'), M = add(75, 30, 'merge');
      const F1 = add(82, 20, 'top'), F2 = add(90, 20, 'top'), G1 = add(82, 40, 'bot'), G2 = add(90, 40, 'bot'), FIN = add(96, 30, 'end', 'finish');
      link(M, F1); link(F1, F2); link(F2, FIN); link(M, G1); link(G1, G2); link(G2, FIN);
      const stem = chain(S, J1, [[5, 30], [22, 30]], 5.5, 'stem');
      const up = chain(J1, M, [[22, 30], [27, 19], [37, 9], [50, 7], [63, 10], [71, 19], [75, 30]], 7, 'up');
      const mid = chain(J1, M, [[22, 30], [75, 30]], 7, 'mid');
      const low = chain(J1, M, [[22, 30], [27, 41], [37, 51], [50, 53], [63, 50], [71, 41], [75, 30]], 7, 'low');
      link(up[3], mid[2]); link(low[3], mid[2]); link(mid[4], up[7]); link(mid[4], low[7]);
      return { m, start: S, finish: FIN, reserved: [J1, M, ...stem], portals: [[low[2], up[8]], [up[1], mid[5]]], fixed: [[F1, 'bonus'], [F2, 'mystery'], [G1, 'ice'], [G2, 'bonus']],
        groups: { up, mid, low }, fills: [['up', ['bonus', 'bonus', 'mystery', 'mystery', 'treasure', 'trap', 'wheel']], ['mid', ['trap', 'steal', 'ice', 'hole', 'bonus', 'duel']], ['low', ['mystery', 'mystery', 'mystery', 'bonus', 'swap', 'steal', 'trap', 'shop', 'flag']]] };
    }
  },
  treasure: {
    name: 'Đảo Kho Báu', icon: '🏝️', desc: 'Đi vòng quanh đảo hoặc xuyên qua trung tâm đầy kho báu.',
    traits: ['Điểm thưởng ⭐ và kho báu 💎 được cộng thêm', 'Bờ bắc dài nhiều của cải, bờ nam ngắn nhiều cướp', 'Đường xuyên đảo qua trung tâm kho báu và cổng dịch chuyển'],
    rule: { bonusPlus: 1 }, colors: { north: '#38b764', south: '#41a6f6', inner: '#ffcd75', hub: '#ffcd75' },
    build() {
      const m = mk(), { add, link, chain } = m;
      const S = add(8, 52, 'start', 'start'), F = add(92, 52, 'end', 'finish'), A = add(35, 6, 'north'), B = add(65, 57, 'south'), H = add(50, 30, 'inner');
      const n1 = chain(S, A, [[8, 52], [6, 30], [14, 12], [35, 6]], 7, 'north'), n2 = chain(A, F, [[35, 6], [60, 6], [84, 12], [92, 30], [92, 52]], 7, 'north');
      const s1 = chain(S, B, [[8, 52], [35, 57], [65, 57]], 7, 'south'), s2 = chain(B, F, [[65, 57], [92, 52]], 7, 'south');
      const i1 = chain(A, H, [[35, 6], [50, 30]], 7, 'inner'), i2 = chain(H, B, [[50, 30], [65, 57]], 7, 'inner');
      link(s1[3], H);
      const north = [...n1, A, ...n2], south = [...s1, B, ...s2], inner = [...i1, H, ...i2];
      return { m, start: S, finish: F, reserved: [], portals: [[north[5], s2[1]], [s1[2], i2[0]]], fixed: [],
        groups: { north, south, inner }, fills: [['north', ['bonus', 'bonus', 'bonus', 'wheel', 'wheel', 'mystery', 'mystery', 'treasure', 'shop', 'flag', 'trap']], ['south', ['trap', 'trap', 'steal', 'ice', 'bonus', 'mystery']], ['inner', ['treasure', 'wheel', 'duel', 'mystery', 'bonus', 'trap']]] };
    }
  },
  volcano: {
    name: 'Núi Lửa', icon: '🌋', desc: 'Leo lên miệng núi lửa. Dung nham ngày càng dâng cao!',
    traits: ['Cứ 2 vòng, dung nham 🌋 phủ thêm ô mới (tối đa 5 ô)', 'Sườn trái ngắn nhưng đầy dung nham, sườn phải dài và an toàn', 'Nhiều cột mốc 🚩 giúp không bị lùi quá xa'],
    rule: { lavaRise: true }, colors: { left: '#ef7d57', center: '#ffcd75', right: '#38b764' },
    build() {
      const m = mk(), { add, chain, shortcuts } = m;
      const S = add(6, 54, 'start', 'start'), F = add(50, 5, 'end', 'finish');
      const left = chain(S, F, [[6, 54], [14, 40], [10, 26], [22, 16], [36, 8], [50, 5]], 7, 'left');
      const center = chain(S, F, [[6, 54], [30, 48], [50, 38], [46, 22], [50, 5]], 7, 'center');
      const right = chain(S, F, [[6, 54], [50, 57], [84, 50], [92, 30], [78, 14], [50, 5]], 7, 'right');
      shortcuts(F, 16, 3, 5);
      return { m, start: S, finish: F, reserved: [], portals: [], fixed: [],
        groups: { left, center, right }, fills: [['left', ['lava', 'lava', 'trap', 'bonus', 'duel', 'rocket']], ['center', ['flag', 'flag', 'mystery', 'mystery', 'bonus', 'bonus', 'steal', 'rocket']], ['right', ['mystery', 'mystery', 'shop', 'bonus', 'bonus', 'wheel', 'flag', 'trap']]] };
    }
  },
  ice: {
    name: 'Băng Địa', icon: '❄️', desc: 'Đường xoắn ốc vào tâm băng với nhiều lối tắt.',
    traits: ['Ô băng 🧊 làm bạn TRƯỢT thêm 1 ô về phía trước (không mất lượt)', 'Đường xoắn ốc dài nhưng có nhiều đường tắt vượt băng', 'Nhiều ô đấu tay đôi ⚔️'],
    rule: { slide: true }, colors: { ice: '#73eff7' },
    build() {
      const m = mk(), { add, chain, shortcuts } = m;
      const S = add(6, 54, 'start', 'start'), F = add(56, 33, 'end', 'finish');
      const ice = chain(S, F, [[6, 54], [6, 8], [94, 8], [94, 54], [24, 54], [24, 24], [76, 24], [76, 40], [44, 40], [44, 33], [56, 33]], 9, 'ice');
      shortcuts(F, 24, 5, 7);
      return { m, start: S, finish: F, reserved: [], portals: [], fixed: [], groups: { ice },
        fills: [['ice', ['ice', 'ice', 'ice', 'ice', 'ice', 'ice', 'duel', 'duel', 'bonus', 'bonus', 'bonus', 'mystery', 'mystery', 'mystery', 'flag', 'flag', 'rocket', 'trap', 'trap', 'steal', 'wheel', 'shop']]] };
    }
  },
  mirror: {
    name: 'Mê Cung Gương', icon: '🪞', desc: 'Mê cung nhiều ngã rẽ, có cổng xuyên gương và sự kiện dồn dập.',
    traits: ['Gần như ô nào cũng có ngã rẽ, có thể đi lên/xuống', 'Cổng dịch chuyển xuyên gương 🌀 nối các góc xa nhau', 'Sự kiện bất ngờ xảy ra MỖI 2 vòng'],
    rule: { eventEvery: 2 }, colors: { maze: '#b36cff' },
    build() {
      const m = mk(), { add, link } = m, C = 9, R = 4, xs = c => 6 + c * 11.0, ys = r => 8 + r * 15;
      const lat = []; for (let r = 0; r < R; r++) { lat[r] = []; for (let c = 0; c < C; c++) lat[r][c] = add(xs(c), ys(r), 'maze'); }
      const S = lat[1][0], F = lat[2][C - 1]; m.nodes[S].road = 'start'; m.nodes[S].type = 'start'; m.nodes[F].road = 'end'; m.nodes[F].type = 'finish';
      for (let r = 0; r < R; r++) for (let c = 0; c < C - 1; c++) if ((c + 2 * r) % 4 !== 3) link(lat[r][c], lat[r][c + 1]);
      for (let r = 0; r < R - 1; r++) for (let c = 0; c < C; c++) if ((c + r) % 6 !== 5) { link(lat[r][c], lat[r + 1][c]); link(lat[r + 1][c], lat[r][c]); }
      const maze = []; lat.forEach(row => row.forEach(id => { if (id !== S && id !== F) maze.push(id); }));
      return { m, start: S, finish: F, reserved: [], portals: [[lat[0][1], lat[3][5]], [lat[3][2], lat[0][6]], [lat[1][3], lat[2][7]]], fixed: [],
        groups: { maze }, fills: [['maze', ['mystery', 'mystery', 'mystery', 'mystery', 'bonus', 'bonus', 'bonus', 'trap', 'trap', 'steal', 'swap', 'duel', 'wheel', 'flag', 'shop', 'ice', 'rocket']]] };
    }
  },
  city: {
    name: 'Thành Phố Tốc Độ', icon: '🏙️', desc: 'Đại lộ, cao tốc và phố ngang. Nhanh và căng thẳng!',
    traits: ['Giờ cao điểm: thời gian trả lời chỉ còn 60% nhưng ĐIỂM nhân đôi', 'Cao tốc phía trên có nhiều tên lửa 🚀', 'Đại lộ dưới có cửa hàng 🛒 và vòng quay 🎡'],
    rule: { scoreMul: 2, timeMul: 0.6 }, colors: { main: '#ef7d57', high: '#ffcd75', low2: '#41a6f6', street: '#c2c3c7' },
    build() {
      const m = mk(), { add, link } = m, C = 13, xs = c => 6 + c * (88 / 12), ys = [12, 30, 48], lat = [];
      for (let r = 0; r < 3; r++) { lat[r] = []; for (let c = 0; c < C; c++) lat[r][c] = add(xs(c), ys[r], ['high', 'main', 'low2'][r]); }
      const S = lat[1][0], F = lat[1][C - 1]; m.nodes[S].road = 'start'; m.nodes[S].type = 'start'; m.nodes[F].road = 'end'; m.nodes[F].type = 'finish';
      for (let r = 0; r < 3; r++) for (let c = 0; c < C - 1; c++) link(lat[r][c], lat[r][c + 1]);
      link(lat[0][C - 1], F); link(lat[2][C - 1], F);
      const street = [];
      [3, 6, 9].forEach(c => [[0, 1], [1, 2]].forEach(([a, b]) => { const mid = add(xs(c), (ys[a] + ys[b]) / 2, 'street'); street.push(mid); link(lat[a][c], mid); link(mid, lat[a][c]); link(lat[b][c], mid); link(mid, lat[b][c]); }));
      const g = r => lat[r].filter(id => id !== S && id !== F);
      return { m, start: S, finish: F, reserved: [], portals: [], fixed: [],
        groups: { main: g(1), high: g(0), low2: g(2), street }, fills: [['main', ['trap', 'trap', 'steal', 'bonus', 'bonus', 'duel', 'flag']], ['high', ['rocket', 'rocket', 'rocket', 'bonus', 'bonus', 'trap', 'mystery']], ['low2', ['shop', 'shop', 'mystery', 'mystery', 'mystery', 'wheel', 'bonus']], ['street', ['mystery', 'bonus', 'trap']]] };
    }
  }
};
const MAP_IDS = Object.keys(MAPS);
NS.ARENA.MAPS = MAPS; NS.ARENA.MAP_IDS = MAP_IDS;

/* Bảng chơi: mapId = 'classic' | 'treasure' | 'volcano' | 'ice' | 'mirror' | 'city' | 'random' */
NS.arenaBoard = function (rnd, mapId) {
  rnd = rnd || NS.rand;
  const id = mapId === 'random' ? NS.pick(MAP_IDS, rnd) : (MAPS[mapId] ? mapId : 'classic'), def = MAPS[id];
  for (let tries = 0; tries < 1500; tries++) {
    const B = def.build(), nodes = B.m.nodes, reserved = new Set([B.start, B.finish, ...(B.reserved || [])]);
    (B.portals || []).forEach(([a, b]) => { nodes[a].type = 'warp'; nodes[a].warpTo = b; reserved.add(a); reserved.add(b); nodes[b].portalOut = true; });
    (B.fixed || []).forEach(([i, t]) => { nodes[i].type = t; reserved.add(i); });
    B.fills.forEach(([g, types]) => { const free = NS.shuffle((B.groups[g] || []).filter(i => !reserved.has(i)), rnd); types.slice(0, free.length).forEach((t, k) => { nodes[free[k]].type = t; }); });
    let ok = true;
    Object.values(B.groups).forEach(g => { if (g.length && BAD.has(nodes[g[0]].type)) ok = false; });
    nodes.forEach(n => n.next.forEach(b => { if (BAD.has(n.type) && BAD.has(nodes[b].type)) ok = false; }));
    nodes[B.start].next.forEach(b => { if (BAD.has(nodes[b].type)) ok = false; });
    if (!ok) continue;
    const dist = B.m.dists(B.finish);
    if (dist.some(d => !isFinite(d))) throw new Error('Bản đồ ' + id + ' có ô không tới được đích');
    return { id, name: def.name, icon: def.icon, desc: def.desc, traits: def.traits, rule: def.rule || {}, colors: def.colors || {}, nodes, start: B.start, finish: B.finish, dist, portals: B.portals || [], groups: B.groups, roads: B.groups };
  }
  throw new Error('Không tạo được bản đồ ' + id);
};

/* ui: giao diện (hoặc bot). Mọi phương thức có thể async. */
NS.arenaRun = async function (ui, o) {
  o = o || {}; const rnd = o.rnd || NS.rand, maxRounds = o.maxRounds || 14, maxCards = o.maxCards || 3;
  const map = o.map || NS.arenaBoard(rnd), nodes = map.nodes, FIN = map.finish, rule = map.rule || {}, events = o.events !== false;
  const S = { pos: [map.start, map.start], hist: [[map.start], [map.start]], score: [0, 0], skip: [0, 0], cards: [[], []], streak: [0, 0], round: 0, mods: { storm: 0, festival: 0, golden: 0 }, lastUnder: [-9, -9], finished: -1, map, bonus: [{ dice: 0, steps: 0 }, { dice: 0, steps: 0 }], lava: 0, log: [] };
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
      const nx = nodes[cur].next; if (!nx.length) break; let to = nx[0];
      if (nx.length > 1) { const k = await ui.chooseNext(t, nx.slice(), steps - i, S); to = nx[Math.max(0, Math.min(nx.length - 1, k | 0))]; }
      S.pos[t] = to; S.hist[t].push(to);
      if (ui.step) await ui.step(t, cur, to, S);
      sync();
    }
  }
  /* lùi theo đúng đường đã đi, nhưng không lùi qua cột mốc 🚩 */
  async function back(t, n) {
    const path = [];
    if (nodes[S.pos[t]].type === 'flag') return;
    while (n-- > 0 && S.hist[t].length > 1) {
      S.hist[t].pop(); const top = S.hist[t][S.hist[t].length - 1]; path.push(top);
      if (nodes[top].type === 'flag') break;
    }
    if (path.length) { S.pos[t] = path[path.length - 1]; if (ui.jump) await ui.jump(t, path, 'back'); sync(); }
  }
  async function teleport(t, to) { S.pos[t] = to; S.hist[t].push(to); if (ui.jump) await ui.jump(t, [to], 'warp'); sync(); }
  const swapPos = async () => {
    [S.pos[0], S.pos[1]] = [S.pos[1], S.pos[0]]; S.hist[0].push(S.pos[0]); S.hist[1].push(S.pos[1]);
    if (ui.swapPos) await ui.swapPos(S); sync();
  };

  async function applyTile(t, depth) {
    depth = depth || 0;
    const nd = nodes[S.pos[t]], type = nd.type, o2 = other(t);
    if (type === 'start' || type === 'finish' || type === 'plain') return;
    await say(ic(t) + ' vào ô ' + TILE[type].icon + ' ' + TILE[type].name, type);
    const f = S.mods.festival > 0 ? 2 : 1, bp = rule.bonusPlus || 0;
    switch (type) {
      case 'bonus': addScore(t, (3 + bp) * f); await say('+' + (3 + bp) * f + ' điểm!', 'good'); break;
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
        if (r.correct) { addScore(t, (5 + 2 * bp) * f); await say('💎 +' + (5 + 2 * bp) * f + ' điểm!', 'good'); } else await say('Tiếc quá, không có kho báu!', 'bad'); break;
      }
      case 'ice': {
        if (rule.slide) { await say('🧊 Bạn trượt trên băng thêm 1 ô!', 'good'); await walk(t, 1); if (S.pos[t] !== FIN && depth < 2) await applyTile(t, depth + 1); break; }
        if (await tryBlock(t)) break; S.skip[t] += mult(true); await say('🧊 Mất ' + mult(true) + ' lượt', 'bad'); sync(); break;
      }
      case 'hole': { if (await tryBlock(t)) break; const x = Math.min(2 * mult(true), S.score[t]); S.score[t] -= x; S.score[o2] += x; await say('⚫ Trả ' + x + ' điểm cho đối thủ', 'bad'); sync(); break; }
      case 'lava': { if (await tryBlock(t)) break; const m = mult(true); addScore(t, -m); await back(t, 2 * m); await say('🌋 Dung nham! Lùi ' + 2 * m + ' ô, −' + m + ' điểm', 'bad'); break; }
      case 'rocket': await say('🚀 Tên lửa! Bay thêm 2 ô!', 'good'); await walk(t, 2); if (S.pos[t] !== FIN && depth < 2) await applyTile(t, depth + 1); break;
      case 'wheel': {
        const r = Math.floor(rnd() * 6);
        if (r === 5) { await say('🎡 Vòng quay dừng ở: 🎴 thẻ kỹ năng!', 'good'); await giveCard(t); }
        else { const p = (r + 1) * f; addScore(t, p); await say('🎡 Vòng quay dừng ở: +' + p + ' điểm!', 'good'); }
        break;
      }
      case 'flag': addScore(t, 1); await say('🚩 Cột mốc! +1 điểm. Bạn sẽ không bị lùi qua ô này nữa.', 'good'); break;
      case 'duel': {
        await say('⚔️ Đấu tay đôi! Cả hai đội cùng trả lời, đúng trước +3, đội kia −1', 'event');
        const w = await ui.race();
        if (w >= 0) { addScore(w, 3); addScore(other(w), -1); await say(ic(w) + ' thắng đấu tay đôi!', 'good'); } else await say('Hòa, không ai ghi điểm.', 'bad');
        break;
      }
      case 'shop': {
        if (S.score[t] < 3) { await say('🛒 Cửa hàng: cần ít nhất 3 điểm để mua thẻ.', 'bad'); break; }
        const i = await ui.choose(t, '🛒 Cửa hàng: trả 3 điểm đổi 1 thẻ kỹ năng?', ['Mua thẻ (−3 điểm)', 'Không mua']);
        if (i === 0) { addScore(t, -3); await giveCard(t); }
        break;
      }
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
        case 'dice2': S.bonus[t].dice++; await say('🎲 Lượt này bạn tung 2 lần, lấy kết quả cao hơn!', 'good'); break;
        case 'boots': S.bonus[t].steps += 1; await say('👟 Nếu trả lời đúng, bạn đi thêm 1 ô!', 'good'); break;
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
      S.streak[t]++; const pts = [1, 2, 3][lv] * f * (rule.scoreMul || 1); addScore(t, pts);
      if (S.streak[t] % 3 === 0) { await say('🔥 3 câu đúng liên tiếp!', 'good'); await giveCard(t); }
      const dice = [1 + Math.floor(rnd() * 2)]; if (S.bonus[t].dice > 0) dice.push(1 + Math.floor(rnd() * 2));
      const extraSteps = bonusSteps + S.bonus[t].steps, total = Math.max(...dice) + extraSteps;
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

  /* núi lửa: dung nham dâng thêm ô mới */
  async function lavaRise() {
    if (S.lava >= 5) return;
    const cand = nodes.filter(n => n.type === 'plain' && n.id !== map.start && n.id !== FIN && map.dist[n.id] > 2 && !S.pos.includes(n.id) && n.next.length > 0);
    const pick = NS.shuffle(cand, rnd).slice(0, Math.min(2, 5 - S.lava)); if (!pick.length) return;
    pick.forEach(n => { n.type = 'lava'; S.lava++; });
    await say('🌋 Dung nham dâng lên, phủ thêm ' + pick.length + ' ô!', 'event');
    if (ui.tileChanged) ui.tileChanged(pick.map(n => n.id), S);
  }

  const every = rule.eventEvery || 3;
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
    if (rule.lavaRise && S.round % 2 === 0) await lavaRise();
    if (events && S.round % every === 0 && S.round < maxRounds) {
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

/* ---------- Trang hướng dẫn ký hiệu (dùng ngoài màn hình chơi và trong game) ---------- */
NS.arenaGuide = function (focusMapId) {
  const sec = (title, node) => h('div', { class: 'gsec' }, h('h3', {}, title), node);
  const rows = (arr) => h('table', { class: 'gtab' }, arr.map(r => h('tr', {}, h('td', { class: 'gi' }, r[0]), h('td', { class: 'gn' }, r[1]), h('td', {}, r[2]))));
  const tileOrder = ['start', 'finish', 'plain', 'bonus', 'treasure', 'mystery', 'wheel', 'rocket', 'warp', 'swap', 'duel', 'shop', 'flag', 'steal', 'trap', 'ice', 'hole', 'lava'];
  return h('div', { class: 'gguide' },
    sec('🎯 Cách chơi', h('ol', {}, [
      'Hai đội luân phiên. Đến lượt, chọn mức câu hỏi rồi trả lời. Đúng thì được điểm và tiến 1 hoặc 2 ô trên bản đồ.',
      'Gặp ngã rẽ (ô có nhiều đường đi tiếp) thì chọn đường: bấm nút hoặc bấm thẳng vào ô đang nhấp nháy.',
      'Dừng ở ô nào thì nhận hiệu ứng của ô đó (xem bảng bên dưới).',
      'Đội về đích đầu tiên được thưởng điểm; hết số vòng thì đội nhiều điểm hơn thắng.',
      'Thẻ kỹ năng lấy ở ô ❓: được GIỮ LẠI, dùng ở đầu lượt hoặc khi trả lời, tùy bạn.'].map(t => h('li', {}, t)))),
    sec('📝 Ba mức câu hỏi', rows([
      ['🟢', 'Dễ (+1 điểm)', 'Nhìn nghĩa tiếng Việt rồi GÕ từ tiếng Anh bằng bàn phím trong game. Sai: đứng yên.'],
      ['🟡', 'Vừa (+2 điểm)', 'NGHE phát âm từ tiếng Anh rồi CHỌN nghĩa đúng. Sai: lùi 1 ô.'],
      ['🔴', 'Khó (+3 điểm)', 'ĐỌC câu mô tả bằng tiếng Anh rồi CHỌN từ đúng. Sai: lùi 2 ô và −1 điểm.']])),
    sec('🗺️ Ô trên bản đồ', rows(tileOrder.map(k => [TILE[k].icon || '·', TILE[k].name, TILE[k].desc]))),
    sec('🎴 Thẻ kỹ năng', rows(CARD_KEYS.map(k => [CARD[k].icon, CARD[k].name, CARD[k].desc + ({ q: ' — dùng khi đang trả lời', turn: ' — dùng ở đầu lượt', react: '' }[CARD[k].when]) + '.']))),
    sec('⚡ Sự kiện bất ngờ (mỗi 3 vòng)', rows(EVENTS.map(k => [EVENT_NAME[k][0].split(' ')[0], EVENT_NAME[k][0].split(' ').slice(1).join(' '), EVENT_NAME[k][1]]))),
    sec('🛤️ Đường nối trên bản đồ', rows([
      ['━', 'Đường đi', 'Màu khác nhau là các con đường khác nhau.'], ['┄', 'Cầu nối', 'Đường chấm vàng nối hai con đường: rẽ sang đường khác khi đi ngang.'],
      ['🌀', 'Cổng dịch chuyển', 'Đường chấm xanh nối cổng vào với cổng ra (🌀 mờ).'], ['🐱', 'Con vật', 'Vị trí hiện tại của mỗi đội (hình đại diện học sinh).']])),
    sec('🌍 Các bản đồ', h('div', { class: 'gmaps' }, MAP_IDS.map(id => { const m = MAPS[id]; return h('div', { class: 'gmap' + (id === focusMapId ? ' focus' : '') }, h('b', {}, m.icon + ' ' + m.name), h('div', {}, m.desc), h('ul', {}, m.traits.map(t => h('li', {}, t)))); }))));
};

/* ---------- Giao diện ---------- */
const mapChoices = () => [['random', '🎲 Ngẫu nhiên'], ...MAP_IDS.map(id => [id, MAPS[id].icon + ' ' + MAPS[id].name])];
NS.games.push({
  id: 'arena', name: 'Đấu trường từ vựng', icon: '🎲', guide: true,
  desc: 'Trả lời đúng để đi 1–2 ô trên bản đồ có ngã rẽ, cổng dịch chuyển, bẫy và thẻ kỹ năng. 6 bản đồ khác nhau!',
  options: [
    { key: 'map', label: 'Bản đồ', type: 'select', choices: mapChoices(), def: 'random' },
    { key: 'rounds', label: 'Số vòng tối đa', type: 'select', choices: [[8, '8'], [10, '10'], [14, '14'], [20, '20'], [30, '30']], def: 14 },
    { key: 'levelTypes', label: 'Dạng câu hỏi theo mức: Dễ gõ từ · Vừa nghe chọn nghĩa · Khó đọc mô tả chọn từ (tắt = trắc nghiệm thường)', type: 'toggle', def: true },
    { key: 'qtime', label: 'Thời gian trả lời mỗi câu (câu gõ từ được gấp đôi)', type: 'select', choices: [[8, '8 giây'], [12, '12 giây'], [20, '20 giây'], [30, '30 giây'], [0, 'Không giới hạn']], def: 20 },
    { key: 'maxCards', label: 'Số thẻ kỹ năng được giữ tối đa', type: 'select', choices: [[2, '2'], [3, '3'], [4, '4'], [5, '5']], def: 3 },
    { key: 'events', label: 'Sự kiện bất ngờ (bão, lễ hội, giờ vàng...)', type: 'toggle', def: true },
    { key: 'underdog', label: 'Trợ lực cho đội đang thua', type: 'toggle', def: true },
    { key: 'legend', label: 'Hiện chú thích các ô dưới bản đồ', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt;
    const openGuide = () => { const was = sh.paused; sh.paused = true; const box = h('div', { class: 'gdlg wide' }, h('h2', {}, '📖 Hướng dẫn ký hiệu'), NS.arenaGuide(map.id), h('button', { class: 'green', type: 'button', onclick: () => { sh.paused = was; sh.closeOverlay(); } }, '✔ Đã hiểu, chơi tiếp')); sh.overlay(box); };
    const sh = NS.shell(ctx.root, { title: '🎲 Đấu trường', onRestart: ctx.restart, onExit: ctx.exit, onGuide: () => openGuide() });
    const names = NS.cfg.teams, map = NS.arenaBoard(null, o.map), nodes = map.nodes, split = sh.split, rule = map.rule || {};
    const qsec = +o.qtime * (rule.timeMul || 1);
    const stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }], wrongWords = new Map();
    const ic = t => NS.TEAM_ICON[t];
    /* bản đồ */
    const mapEl = h('div', { class: 'amap' }), NS_SVG = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS_SVG, 'svg'); svg.setAttribute('viewBox', '0 0 100 60'); svg.setAttribute('preserveAspectRatio', 'none'); svg.setAttribute('class', 'aedges');
    const NODASH = new Set(['stem', 'merge', 'start', 'end', 'top', 'bot', 'hub', 'inner']);
    const seg = (a, b) => {
      const l = document.createElementNS(NS_SVG, 'line'); l.setAttribute('x1', a.x); l.setAttribute('y1', a.y); l.setAttribute('x2', b.x); l.setAttribute('y2', b.y);
      const bridge = a.road !== b.road && !NODASH.has(a.road) && !NODASH.has(b.road); const col = map.colors[a.road] || map.colors[b.road];
      l.setAttribute('class', bridge ? 'dash' : ''); if (!bridge && col) l.style.stroke = col; svg.append(l);
    };
    nodes.forEach(n => n.next.forEach(b => seg(n, nodes[b])));
    map.portals.forEach(([a, b]) => { const l = document.createElementNS(NS_SVG, 'path'); const A = nodes[a], B = nodes[b]; l.setAttribute('d', 'M' + A.x + ' ' + A.y + ' Q' + ((A.x + B.x) / 2) + ' ' + ((A.y + B.y) / 2 + (A.y < 30 ? -14 : 14)) + ' ' + B.x + ' ' + B.y); l.setAttribute('class', 'e-portal'); svg.append(l); });
    mapEl.append(svg);
    const nodeEls = [];
    const paintNode = n => { const el = nodeEls[n.id]; el.className = 'anode tt-' + n.type + (n.portalOut ? ' pout' : '') + (el._choice ? ' choice' : ''); el.textContent = n.portalOut ? '🌀' : (TILE[n.type].icon || ''); el.title = n.portalOut ? '🌀 Cổng ra' : TILE[n.type].name + ' — ' + TILE[n.type].desc; };
    nodes.forEach(n => { const el = h('div', { class: 'anode', style: 'left:' + n.x + '%;top:' + (n.y / 0.6) + '%' }); nodeEls[n.id] = el; mapEl.append(el); paintNode(n); });
    const pawns = [0, 1].map(t => { const p = h('div', { class: 'pawn t' + t }, ic(t)); mapEl.append(p); return p; });
    const place = (t, id) => { const n = nodes[id]; pawns[t].style.left = n.x + '%'; pawns[t].style.top = (n.y / 0.6) + '%'; };
    place(0, map.start); place(1, map.start);
    const present = [...new Set(nodes.map(n => n.type))].filter(k => !['start', 'plain'].includes(k) && TILE[k]);
    const legend = o.legend ? h('div', { class: 'alegend' }, present.map(k => h('span', { title: TILE[k].desc }, TILE[k].icon + ' ' + TILE[k].name)).concat([h('span', {}, '┄ cầu nối'), h('span', {}, '🌀 cổng ra')])) : null;
    const guideBtn = NS.tap(h('button', { class: 'small gbtn', type: 'button' }, '📖 Ký hiệu'), () => openGuide());
    const mapName = h('div', { class: 'amapname' }, h('b', {}, map.icon + ' ' + map.name), h('span', {}, ' · ' + map.traits[0]), guideBtn);
    /* khung đội: tên, điểm, thẻ kỹ năng */
    const info = [0, 1].map(t => h('div', { class: 'aphead t' + t })), tagEl = [sh.tag(0), sh.tag(1)];
    const mkBody = () => h('div', { class: 'apbody' });
    const bodies = split ? [mkBody(), mkBody()] : [mkBody()];
    const body = t => (split ? bodies[t] : bodies[0]);
    const wrap = h('div', { class: 'awrap' + (split ? ' split' : '') });
    const mapBox = h('div', { class: 'amapbox' }, mapName, mapEl, legend);
    if (split) {
      wrap.append(h('div', { class: 'apanel2 t1' }, info[1], bodies[1]), mapBox, h('div', { class: 'apanel2 t0' }, info[0], bodies[0]));
      wrap.firstChild.classList.add('flip');
    } else wrap.append(h('div', { class: 'aheads' }, info[0], info[1]), mapBox, h('div', { class: 'aq' }, bodies[0]));
    sh.area.append(wrap);
    sh.area.classList.add('arena');

    const wait = ms => sh.sleep(ms);
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
      say: async m => { showMsg(m); NS.sfx(/Sai|bad|Mất|Trả|Dung nham/.test(m) ? 'bad' : 'pow'); await wait(m.length > 50 ? 2100 : 1400); },
      turnStart: async (t, S, r) => { sh.setActive(t); sh.setInfo('Vòng ' + r + '/' + o.rounds); showMsg('Đến lượt ' + ic(t) + ' ' + names[t]); await wait(800); },
      roundStart: async () => {},
      chooseLevel: t => btnRow(t, ic(t) + ' ' + names[t] + ' chọn mức câu hỏi', o.levelTypes
        ? ['🟢 Dễ · GÕ từ theo nghĩa · +1đ', '🟡 Vừa · NGHE chọn nghĩa · +2đ (sai: lùi 1 ô)', '🔴 Khó · ĐỌC mô tả chọn từ · +3đ (sai: lùi 2 ô, −1đ)']
        : ['Dễ · +1đ', 'Vừa · +2đ (sai: lùi 1 ô)', 'Khó · +3đ (sai: lùi 2 ô, −1đ)'], ['green', '', 'red']),
      choose: (t, title, opts) => btnRow(t, title, opts),
      skillMenu: (t, usable) => btnRow(t, '🎴 Thẻ kỹ năng của ' + ic(t) + ' ' + names[t], usable.map(c => CARD[c].icon + ' ' + CARD[c].name + ' — ' + CARD[c].desc).concat(['▶ Không dùng (giữ lại), bắt đầu trả lời']), usable.map(() => 'gold').concat(['green']), 'Dùng ngay hoặc giữ lại cho lượt sau — tùy bạn!').then(i => (i >= usable.length ? -1 : i)),
      chooseNext: (t, nexts, left, S) => new Promise(res => {
        const clear = () => nexts.forEach(i => { nodeEls[i]._choice = false; nodeEls[i]._pick = null; paintNode(nodes[i]); });
        const pick = k => { clear(); res(k); };
        const cur = nodes[S.pos[t]], arrows = ['➡️', '↘️', '⬇️', '↙️', '⬅️', '↖️', '⬆️', '↗️'];
        const labels = nexts.map(i => { const n = nodes[i], a = Math.atan2(n.y - cur.y, n.x - cur.x); return arrows[(Math.round(a / (Math.PI / 4)) + 8) % 8] + ' ' + (ROADNAME[n.road] || 'Đường') + '  ' + (TILE[n.type].icon || '·'); });
        nexts.forEach((i, k) => { nodeEls[i]._choice = true; nodeEls[i]._pick = () => pick(k); paintNode(nodes[i]); });
        setPanel(t, h('div', {}, h('div', { class: 'aqt t' + t }, '🔀 Ngã rẽ! ' + ic(t) + ' ' + names[t] + ' chọn đường (còn ' + left + ' bước)'), h('div', { class: 'asub' }, 'Bấm nút hoặc bấm thẳng vào ô sáng trên bản đồ'),
          h('div', { class: 'aqb' }, labels.map((l, k) => NS.tap(h('button', { type: 'button', class: k === 0 ? 'green' : '' }, l), () => pick(k))))));
      }),
      tileChanged: ids => ids.forEach(i => paintNode(nodes[i])),
      swapPos: async S => { upd(S); await wait(500); },
      showDice: async (t, dice, bonus) => {
        const faces = '⚀⚁⚂⚃⚄⚅'; const d = h('div', { class: 'adice' }, '🎲'); setPanel(t, d);
        for (let i = 0; i < 8; i++) { d.textContent = dice.map(() => faces[NS.randInt(0, 5)]).join(' '); NS.sfx('dice'); await wait(90); }
        d.textContent = dice.map(x => faces[x - 1]).join(' ') + '  = ' + (Math.max(...dice) + bonus) + (dice.length > 1 ? ' (lấy số cao hơn)' : '') + (bonus ? ' (+' + bonus + ' thêm)' : ''); await wait(900);
      },
      step: async (t, from, to) => { place(t, to); NS.sfx('tick'); await wait(230); },
      jump: async (t, path, kind) => {
        if (kind === 'warp') { pawns[t].classList.add('zap'); place(t, path[0]); await wait(650); pawns[t].classList.remove('zap'); return; }
        for (const id of path) { place(t, id); NS.sfx('tick'); await wait(230); }
      },
      ask: (t, lv, opt) => new Promise(async res => {
        const mkQ = () => (o.levelTypes ? NS.levelQ(lv) : NS.nextMC({ level: lv + 1 }));
        let q = mkQ(); if (!q) { res({ correct: true }); return; }
        const used = []; let done = false, tm = null;
        const finishQ = (ok, i, box, bs, btn) => {
          done = true; if (tm) tm.stop();
          stats[t][ok ? 'right' : 'wrong']++; NS.sfx(ok ? 'ok' : 'bad'); NS.vibe(ok ? 30 : 80);
          if (!ok && q.word) { NS.markWrong(q.word); wrongWords.set(q.word.id, q.word); }
          box.append(h('div', { class: 'aans' }, (ok ? '✅ Đúng! ' : (i < 0 ? '⏰ Hết giờ! ' : '❌ ')) + (q.explanation || (q.kind === 'type' ? q.text : q.options[q.answer]))));
          setTimeout(() => res({ correct: ok, used }), ok ? 900 : 2300);
        };
        const render = () => {
          const typed = q.kind === 'type', tl = (q.timeLimit || (typed ? qsec * 2 : qsec)) * 1000;
          const bar = h('div', { class: 'tbar' }, h('i', {}));
          const lvTag = o.levelTypes ? ['🟢 Dễ · gõ từ', '🟡 Vừa · nghe', '🔴 Khó · mô tả'][lv] : ['Dễ', 'Vừa', 'Khó'][lv];
          const stem = h('div', { class: 'aqs' }, h('span', { class: 't' + t }, ic(t) + ' ' + names[t] + (opt.treasure ? ' 💎 KHO BÁU' : ' — ' + lvTag)), h('div', { class: 'aqq' }, q.stem), q.sub ? h('div', { class: q.dir === 'def' ? 'adef' : 'aipa' }, q.sub) : null, tl > 0 ? bar : null);
          const cb = h('div', { class: 'acb' });
          const cardBtns = () => (opt.cards || []).forEach(c => {
            if (used.includes(c) || (c === 'fifty' && typed)) return;
            cb.append(NS.tap(h('button', { class: 'small', type: 'button', 'data-c': c }, CARD[c].icon + ' ' + CARD[c].name), () => {
              if (done) return; used.push(c);
              if (c === 'fifty') { NS.shuffle(bs.map((_, i) => i).filter(i => i !== q.answer)).slice(0, 2).forEach(i => bs[i].classList.add('gone')); cb.querySelector('[data-c=fifty]').remove(); }
              else { const nq = mkQ(); if (nq) { q = nq; if (tm) tm.stop(); render(); } }
            }));
          });
          let bs = [], box;
          if (!typed) {
            const opts = h('div', { class: 'aqo' }); bs = q.options.map((tx, i) => { const b = h('button', { type: 'button', class: 'lopt' }, tx); NS.tap(b, () => pickMC(i, b)); opts.append(b); return b; });
            const extra = [];
            if (q.listen) {
              let left = 3; const rb = h('button', { type: 'button' }, '🔊 Nghe lại (' + left + ')'); const sb = h('button', { type: 'button' }, '🐢 Chậm');
              const again = rate => { if (left <= 0 || done) return; left--; rb.textContent = '🔊 Nghe lại (' + left + ')'; NS.speak(q.say || (q.word && q.word.text) || '', { rate }); };
              NS.tap(rb, () => again(0.9)); NS.tap(sb, () => again(0.6)); extra.push(h('div', { class: 'lbtns' }, rb, sb));
              setTimeout(() => { if (!done) NS.speak(q.say || (q.word && q.word.text) || '', { rate: 0.9 }); }, 250);
            }
            box = h('div', {}, stem, ...extra, opts, cb);
          } else {
            const text = q.text, letters = [...text].filter(c => /[A-Za-z]/.test(c)).map(c => c.toUpperCase()), buf = Array(letters.length).fill('');
            const row = h('div', { class: 'tcells' }), slotEls = []; let li = 0;
            [...text].forEach(ch => { if (/[A-Za-z]/.test(ch)) { const e = h('span', { class: 'tcell' }); slotEls[li++] = e; row.append(e); } else row.append(h('span', { class: 'agap' }, ch === ' ' ? '' : ch)); });
            const paint = () => buf.forEach((c, i) => { slotEls[i].textContent = c; });
            const kb = NS.kbd(ch => { if (ch === ' ' || done) return; const k = buf.findIndex(c => !c); if (k >= 0) { buf[k] = ch; paint(); } },
              () => { if (done) return; for (let i = buf.length - 1; i >= 0; i--) if (buf[i]) { buf[i] = ''; break; } paint(); },
              () => { if (done) return; if (buf.some(c => !c)) { sh.toast('Hãy điền đủ ' + buf.length + ' chữ cái'); return; } const ok = buf.join('') === letters.join(''); slotEls.forEach(e => e.classList.add(ok ? 'okc' : 'badc')); if (!ok) { buf.forEach((c, i) => { slotEls[i].textContent = letters[i]; }); } finishQ(ok, 0, box); }, { enter: '✔ Trả lời' });
            kb.classList.add('compact');
            box = h('div', {}, stem, row, kb, cb);
          }
          setPanel(t, box); cardBtns();
          if (tm) tm.stop();
          tm = NS.timer(tl, l => { bar.firstChild.style.width = (l / tl * 100) + '%'; bar.classList.toggle('low', l < 4000); }, () => { if (done) return; if (typed) { box.querySelectorAll('.tcell').forEach((e, i) => { e.textContent = [...q.text].filter(c => /[A-Za-z]/.test(c))[i].toUpperCase(); e.classList.add('badc'); }); finishQ(false, -1, box); } else pickMC(-1); });
          function pickMC(i, b) {
            if (done || sh.paused) return; const ok = i === q.answer;
            bs.forEach((x, k) => { x.classList.add('locked'); if (k === q.answer) x.classList.add('right'); }); if (b && !ok) b.classList.add('wrong');
            finishQ(ok, i, box, bs, b);
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
    showMsg(map.icon + ' ' + map.name + ' — ' + map.traits[0]);
    NS.arenaRun(ui, { maxRounds: +o.rounds, map, maxCards: +o.maxCards, events: !!o.events, underdog: !!o.underdog }).then(r => {
      if (sh.dead) return;
      sh.setActive(-1); upd(r.S);
      sh.result({ scores: r.scores, stats, wrong: [...wrongWords.values()] });
    }).catch(e => { if (!sh.dead) console.error(e); });
  }
});
})();
