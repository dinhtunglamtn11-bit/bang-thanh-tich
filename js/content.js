/* ===== Nội dung soạn RIÊNG cho từng game: cú pháp riêng, chỉ kiểm tra ĐỊNH DẠNG (không đối chiếu kho từ vựng), prompt riêng ===== */
(function () {
'use strict';
const NS = (window.PG = window.PG || {});
const LS = NS.LS;
const fold = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
const lines = t => String(t || '').replace(/^\uFEFF/, '').split(/\r\n|\r|\n/);
const isSkip = s => !s.trim() || /^\s*\/\//.test(s);
const LEVEL_RE = /^\s*(?:={2,}|#{1,3}|\[)\s*(dễ|de|easy|vừa|vua|medium|trung bình|trung binh|khó|kho|hard)\s*(?:={2,}|\])?\s*$/i;
const levelOf = w => { const f = fold(w); return ['de', 'easy'].includes(f) ? 1 : ['kho', 'hard'].includes(f) ? 3 : 2; };
const WORD_RE = /^[A-Za-z][A-Za-z' -]*$/;
const mk = () => ({ items: [], errors: [], warnings: [] });
const E = (r, line, msg, excerpt, hint) => r.errors.push({ line, msg, excerpt: excerpt || '', hint: hint || '' });
const W = (r, line, msg, excerpt, hint) => r.warnings.push({ line, msg, excerpt: excerpt || '', hint: hint || '' });
const parts = s => s.split('|').map(x => x.trim());

/* ---------- Lật thẻ: Bộ thẻ ---------- */
function parseMemory(text) {
  const r = mk(); let cur = null;
  const close = () => { if (!cur) return; if (cur.pairs.length < 4) E(r, cur.line, 'Bộ thẻ "' + cur.name + '" cần ít nhất 4 cặp (hiện có ' + cur.pairs.length + ').', 'Bộ thẻ: ' + cur.name); else r.items.push(cur); cur = null; };
  lines(text).forEach((raw, i) => {
    const n = i + 1, s = raw.trim(); if (isSkip(raw)) return;
    const m = s.match(/^(Bộ thẻ|Bo the|Cards|Bộ)\s*:\s*(.*)$/i);
    if (m) { close(); cur = { name: m[2].trim() || 'Bộ thẻ ' + (r.items.length + 1), pairs: [], line: n }; return; }
    if (!cur) cur = { name: 'Bộ thẻ ' + (r.items.length + 1), pairs: [], line: n };
    const k = s.indexOf('::'); if (k < 0) { E(r, n, 'Thiếu "::". Viết: từ :: nghĩa', s); return; }
    let left = s.slice(0, k).trim(), right = s.slice(k + 2).trim(), ipa; const mm = left.match(/^(.*?)\s*\/([^\/]+)\/\s*$/); if (mm) { left = mm[1].trim(); ipa = mm[2].trim(); }
    if (!left || !right) { E(r, n, 'Vế trái hoặc vế phải bị trống.', s); return; }
    if (cur.pairs.some(p => p.left.toLowerCase() === left.toLowerCase() || p.right.toLowerCase() === right.toLowerCase())) W(r, n, 'Thẻ trùng từ hoặc nghĩa với thẻ trước.', s);
    cur.pairs.push({ left, ipa, right });
  });
  close(); return r;
}

/* ---------- Đảo chữ: từ | gợi ý ---------- */
function parseAnagram(text) {
  const r = mk(); let lv = 0; const seen = new Set();
  lines(text).forEach((raw, i) => {
    const n = i + 1, s = raw.trim(); if (isSkip(raw)) return;
    const m = s.match(LEVEL_RE); if (m) { lv = levelOf(m[1]); return; }
    const p = parts(s), w = p[0];
    if (!w) { E(r, n, 'Thiếu từ ở đầu dòng. Viết: từ | gợi ý', s); return; }
    if (!WORD_RE.test(w)) { E(r, n, 'Từ chỉ được gồm chữ cái, dấu cách, dấu gạch ngang, dấu nháy.', s); return; }
    const letters = w.replace(/[^A-Za-z]/g, '').length; if (letters < 3) { E(r, n, 'Từ cần ít nhất 3 chữ cái.', s); return; }
    if (letters > 18) { E(r, n, 'Từ quá dài (tối đa 18 chữ cái).', s); return; }
    if (seen.has(w.toLowerCase())) W(r, n, 'Từ bị lặp.', s); seen.add(w.toLowerCase());
    if (!p[1]) W(r, n, 'Chưa có gợi ý nghĩa (nên thêm sau dấu |).', s);
    r.items.push({ text: w, hint: p[1] || '', level: lv, line: n });
  });
  return r;
}

/* ---------- Đua nghe: từ đọc | nghĩa đúng | sai | sai | sai ---------- */
function parseListen(text) {
  const r = mk();
  lines(text).forEach((raw, i) => {
    const n = i + 1, s = raw.trim(); if (isSkip(raw)) return;
    const p = parts(s);
    if (p.length < 4) { E(r, n, 'Cần: từ đọc | nghĩa đúng | sai 1 | sai 2 (ít nhất 2 đáp án sai).', s); return; }
    if (p.length > 6) { E(r, n, 'Tối đa 4 đáp án sai.', s); return; }
    if (p.some(x => !x)) { E(r, n, 'Có ô trống giữa các dấu |.', s); return; }
    if (new Set(p.slice(1).map(x => x.toLowerCase())).size !== p.length - 1) { E(r, n, 'Các đáp án bị trùng nhau.', s); return; }
    r.items.push({ say: p[0], correct: p[1], wrong: p.slice(2), line: n });
  });
  return r;
}

/* ---------- Ô chữ bí mật ---------- */
function solveAuto(keyword, rows, r, line) {
  const L = keyword.replace(/[^A-Za-z]/g, '').toUpperCase().split(''), N = L.length;
  const W2 = rows.map(x => ({ word: x.word, up: x.word.toUpperCase().replace(/[^A-Z]/g, ''), clue: x.clue }));
  const matchOf = Array(W2.length).fill(-1);
  const cand = i => W2.map((w, k) => (w.up.includes(L[i]) ? k : -1)).filter(k => k >= 0);
  const tryK = (i, seen) => { for (const k of NS.shuffle(cand(i))) { if (seen.has(k)) continue; seen.add(k); if (matchOf[k] < 0 || tryK(matchOf[k], seen)) { matchOf[k] = i; return true; } } return false; };
  for (let i = 0; i < N; i++) if (!tryK(i, new Set())) { E(r, line, 'Không ghép đủ từ khóa: chưa tìm được từ riêng cho chữ thứ ' + (i + 1) + ' ("' + L[i] + '"). Thêm một từ có chứa chữ "' + L[i] + '" (mỗi chữ của từ khóa cần một từ khác nhau).', 'Ô chữ: ' + keyword); return null; }
  const out = [];
  matchOf.forEach((i, k) => { if (i < 0) return; const w = W2[k], pos = [...w.up].map((c, j) => (c === L[i] ? j + 1 : -1)).filter(j => j > 0); out.push({ word: w.word.replace(/[^A-Za-z]/g, ''), hi: NS.pick(pos), slot: i + 1, clue: w.clue }); });
  return NS.shuffle(out);
}
function parseCross(text) {
  const r = mk(); let cur = null;
  const close = () => {
    if (!cur) return; const c = cur; cur = null;
    const N = c.kw.replace(/[^A-Za-z]/g, '').length;
    if (N < 3) { E(r, c.line, 'Từ khóa "' + c.kw + '" cần ít nhất 3 chữ cái.', 'Ô chữ: ' + c.kw); return; }
    if (!c.rows.length) { E(r, c.line, 'Ô chữ "' + c.kw + '" chưa có dòng "Hàng:".', 'Ô chữ: ' + c.kw); return; }
    const manual = c.rows.filter(x => x.hi != null), auto = c.rows.filter(x => x.hi == null);
    if (manual.length && auto.length) { E(r, c.line, 'Không trộn hai kiểu hàng trong một ô chữ (hoặc tất cả 4 ô, hoặc tất cả 2 ô).', 'Ô chữ: ' + c.kw); return; }
    const L = c.kw.replace(/[^A-Za-z]/g, '').toUpperCase();
    if (auto.length) {
      if (auto.length < N) { E(r, c.line, 'Từ khóa "' + c.kw + '" có ' + N + ' chữ cái nhưng mới có ' + auto.length + ' từ.', 'Ô chữ: ' + c.kw, 'Cần ít nhất ' + N + ' từ, mỗi từ chứa một chữ của từ khóa.'); return; }
      const rows = solveAuto(c.kw, auto, r, c.line); if (rows) r.items.push({ keyword: c.kw, rows, auto: true, line: c.line });
      return;
    }
    if (c.rows.length !== N) { E(r, c.line, 'Từ khóa "' + c.kw + '" có ' + N + ' chữ cái nhưng có ' + c.rows.length + ' hàng.', 'Ô chữ: ' + c.kw); return; }
    const slots = c.rows.map(x => x.slot).sort((a, b) => a - b); if (slots.some((s, i) => s !== i + 1)) { E(r, c.line, 'Cột "thứ tự trong từ khóa" phải dùng đủ 1..' + N + ', không trùng.', 'Ô chữ: ' + c.kw); return; }
    let bad = false;
    c.rows.forEach(x => { const w = x.word.toUpperCase(); if (!(x.hi >= 1 && x.hi <= w.length) || w[x.hi - 1] !== L[x.slot - 1]) { E(r, x.line, 'Chữ ở ô cam của "' + x.word + '" (vị trí ' + x.hi + ') không khớp chữ thứ ' + x.slot + ' của từ khóa (' + (L[x.slot - 1] || '?') + ').', 'Hàng: ' + x.word, 'Gợi ý: bỏ 2 cột giữa, chỉ viết "Hàng: từ | gợi ý" để app tự ghép.'); bad = true; } });
    if (!bad) r.items.push({ keyword: c.kw, rows: c.rows.map(x => ({ word: x.word, hi: x.hi, slot: x.slot, clue: x.clue })), auto: false, line: c.line });
  };
  lines(text).forEach((raw, i) => {
    const n = i + 1, s = raw.trim(); if (isSkip(raw)) return;
    const m = s.match(/^(Ô chữ|O chu|Puzzle|Từ khóa|Tu khoa)\s*:\s*(.*)$/i);
    if (m) { close(); cur = { kw: m[2].trim(), rows: [], line: n }; return; }
    const h2 = s.match(/^(Hàng|Hang|Row)\s*:\s*(.*)$/i);
    if (!h2) { E(r, n, 'Dòng không hiểu được. Dùng "Ô chữ: TỪ KHÓA" hoặc "Hàng: ...".', s); return; }
    if (!cur) { E(r, n, 'Dòng "Hàng:" phải nằm sau dòng "Ô chữ: TỪ KHÓA".', s); return; }
    const p = parts(h2[2]);
    if (!/^[A-Za-z][A-Za-z' -]*$/.test(p[0] || '')) { E(r, n, 'Từ ở đầu hàng chỉ gồm chữ cái.', s); return; }
    if (p.length >= 4 && /^\d+$/.test(p[1]) && /^\d+$/.test(p[2])) cur.rows.push({ word: p[0], hi: parseInt(p[1], 10), slot: parseInt(p[2], 10), clue: p.slice(3).join(' | '), line: n });
    else if (p.length >= 2) cur.rows.push({ word: p[0], hi: null, slot: null, clue: p.slice(1).join(' | '), line: n });
    else E(r, n, 'Hàng cần: từ | gợi ý  (hoặc: từ | vị trí ô cam | thứ tự | gợi ý).', s);
  });
  close(); return r;
}

/* ---------- Đấu trường: ba mức ---------- */
function parseArena(text) {
  const r = mk(); let lv = 0;
  lines(text).forEach((raw, i) => {
    const n = i + 1, s = raw.trim(); if (isSkip(raw)) return;
    const m = s.match(LEVEL_RE); if (m) { lv = levelOf(m[1]); return; }
    if (!lv) { E(r, n, 'Cần dòng chia mức trước: == DỄ ==, == VỪA == hoặc == KHÓ ==.', s); return; }
    const p = parts(s);
    if (lv === 1) {
      if (p.length < 2 || !p[0] || !p[1]) { E(r, n, 'Mức DỄ: đáp án | đề bài (tiếng Việt).', s); return; }
      if (!/[A-Za-z]/.test(p[0])) { E(r, n, 'Đáp án mức DỄ phải có chữ cái tiếng Anh.', s); return; }
      r.items.push({ level: 1, answer: p[0], prompt: p.slice(1).join(' | '), line: n });
    } else {
      const label = lv === 2 ? 'từ nghe | nghĩa đúng | sai 1 | sai 2 | sai 3' : 'mô tả tiếng Anh | từ đúng | sai 1 | sai 2 | sai 3';
      if (p.length < 4) { E(r, n, 'Mức ' + (lv === 2 ? 'VỪA' : 'KHÓ') + ': ' + label + ' (ít nhất 2 đáp án sai).', s); return; }
      if (p.length > 6) { E(r, n, 'Tối đa 4 đáp án sai.', s); return; }
      if (p.some(x => !x)) { E(r, n, 'Có ô trống giữa các dấu |.', s); return; }
      if (new Set(p.slice(1).map(x => x.toLowerCase())).size !== p.length - 1) { E(r, n, 'Các đáp án bị trùng nhau.', s); return; }
      r.items.push({ level: lv, head: p[0], correct: p[1], wrong: p.slice(2), line: n });
    }
  });
  return r;
}

/* ---------- Mô tả, ví dụ, prompt của từng game ---------- */
const PROMPT_HEAD = 'Bạn là giáo viên tiếng Anh tiểu học. Hãy soạn nội dung cho một trò chơi ôn từ vựng lớp 5 theo ĐÚNG cú pháp dưới đây. Chỉ trả về văn bản thuần trong MỘT khối code, không giải thích thêm. Mỗi dòng đúng một mục. Dòng bắt đầu bằng // là ghi chú.\n\n';
const DEFS = {
  memory: {
    icon: '🃏', name: 'Lật thẻ ghép cặp', parse: parseMemory, unit: 'bộ thẻ',
    syntax: ['Mỗi bộ thẻ mở đầu bằng dòng: Bộ thẻ: Tên bộ', 'Sau đó mỗi dòng một cặp: từ :: nghĩa (có thể thêm phiên âm: từ /phiên âm/ :: nghĩa)', 'Mỗi bộ cần ít nhất 4 cặp, nên 8–15 cặp. Có thể nhập nhiều bộ.'],
    example: 'Bộ thẻ: Đồ vật trong nhà\nlamp /læmp/ :: đèn\nsofa :: ghế sofa\nmirror :: gương\nchair :: cái ghế\nwardrobe :: tủ quần áo\nbookshelf :: giá sách\n\nBộ thẻ: Các phòng\nkitchen :: nhà bếp\nbedroom :: phòng ngủ\nbathroom :: phòng tắm\nbalcony :: ban công',
    prompt: PROMPT_HEAD + 'GAME: Lật thẻ ghép cặp (ghép từ tiếng Anh với nghĩa tiếng Việt).\nCÚ PHÁP:\nBộ thẻ: Tên bộ\ntừ tiếng Anh :: nghĩa tiếng Việt\ntừ tiếng Anh :: nghĩa tiếng Việt\n(Mỗi bộ có từ 8 đến 15 cặp. Các bộ cách nhau 1 dòng trống. Không trùng từ hoặc nghĩa trong cùng một bộ.)\n\nCHỦ ĐỀ CÁC BỘ THẺ: [ví dụ: Đồ vật trong nhà; Các phòng; Việc nhà]\nTỪ ĐƯỢC PHÉP DÙNG (nếu có): [dán danh sách từ]\nSỐ BỘ THẺ: [ví dụ: 3]'
  },
  anagram: {
    icon: '🔤', name: 'Đảo chữ cái', parse: parseAnagram, unit: 'từ',
    syntax: ['Mỗi dòng một từ: từ | gợi ý nghĩa', 'Chia mức (tùy chọn) bằng dòng == DỄ ==, == VỪA ==, == KHÓ ==. Không chia thì app tự chia theo độ dài từ.', 'Từ chỉ gồm chữ cái, dấu cách, dấu gạch ngang; ít nhất 3 chữ cái.'],
    example: '== DỄ ==\nlamp | cái đèn\nsofa | ghế sofa\n== VỪA ==\nkitchen | nhà bếp\nbedroom | phòng ngủ\n== KHÓ ==\nrefrigerator | tủ lạnh\nliving room | phòng khách',
    prompt: PROMPT_HEAD + 'GAME: Đảo chữ cái (học sinh sắp xếp chữ cái bị xáo thành từ đúng).\nCÚ PHÁP: mỗi dòng\ntừ tiếng Anh | gợi ý nghĩa tiếng Việt\nChia mức bằng dòng riêng:\n== DỄ ==  (từ 3–5 chữ cái)\n== VỪA ==  (từ 6–8 chữ cái)\n== KHÓ ==  (từ 9 chữ cái trở lên hoặc cụm từ)\n\nCHỦ ĐỀ: [ví dụ: Our homes]\nTỪ ĐƯỢC PHÉP DÙNG (nếu có): [dán danh sách từ]\nSỐ LƯỢNG: [ví dụ: 6 từ DỄ, 6 từ VỪA, 6 từ KHÓ]'
  },
  listen: {
    icon: '🎧', name: 'Đua nghe và chọn', parse: parseListen, unit: 'câu',
    syntax: ['Mỗi dòng một câu: từ máy đọc | nghĩa đúng | sai 1 | sai 2 | sai 3', 'Ít nhất 2 đáp án sai, tối đa 4. Đáp án đúng luôn viết ĐỨNG ĐẦU (sau từ đọc), app sẽ tự trộn vị trí.', 'Học sinh nghe từ tiếng Anh rồi chọn nghĩa tiếng Việt đúng.'],
    example: 'kitchen | nhà bếp | phòng ngủ | phòng khách | ban công\nlamp | cái đèn | cái ghế | cái bàn | cái tủ\nbalcony | ban công | tầng hầm | gác mái | nhà để xe',
    prompt: PROMPT_HEAD + 'GAME: Đua nghe và chọn (máy đọc một từ tiếng Anh, học sinh chọn nghĩa tiếng Việt đúng).\nCÚ PHÁP: mỗi dòng\ntừ tiếng Anh để đọc | nghĩa đúng | nghĩa sai 1 | nghĩa sai 2 | nghĩa sai 3\n(Đáp án đúng luôn ở vị trí thứ 2. 3 đáp án sai là nghĩa của các từ khác cùng chủ đề, không gần giống nghĩa đúng. Không lặp đáp án.)\n\nCHỦ ĐỀ: [ví dụ: Our homes]\nTỪ ĐƯỢC PHÉP DÙNG (nếu có): [dán danh sách từ]\nSỐ CÂU: [ví dụ: 15]'
  },
  cross: {
    icon: '🧩', name: 'Ô chữ bí mật', parse: parseCross, unit: 'ô chữ',
    syntax: ['Mỗi ô chữ mở đầu bằng dòng: Ô chữ: TỪ KHÓA (ví dụ Ô chữ: FAMILY)', 'CÁCH ĐƠN GIẢN (khuyên dùng): mỗi dòng Hàng: từ | gợi ý nghĩa. App TỰ ghép: cần ít nhất bằng số chữ cái của từ khóa, mỗi chữ của từ khóa cần một từ khác nhau có chứa chữ đó.', 'CÁCH THỦ CÔNG: Hàng: từ | vị trí chữ cam trong từ | thứ tự chữ trong từ khóa | gợi ý (chữ cam phải trùng chữ của từ khóa). Không trộn hai cách trong một ô chữ.'],
    example: 'Ô chữ: LAMP\nHàng: lime | quả chanh xanh\nHàng: banana | quả chuối\nHàng: mirror | soi mặt\nHàng: apple | quả táo\nHàng: extra | một từ dự phòng\n\nÔ chữ: SOFA\nHàng: sofa | 1 | 1 | ghế dài êm\nHàng: horse | 2 | 2 | con ngựa\nHàng: rice | 4 | 3 | gạo (sai ví dụ: chữ cam không khớp)',
    prompt: PROMPT_HEAD + 'GAME: Ô chữ bí mật (các hàng ngang, chữ ở ô cam ghép thành từ khóa).\nCÚ PHÁP:\nÔ chữ: TỪ KHÓA\nHàng: từ tiếng Anh | gợi ý nghĩa tiếng Việt\nHàng: từ tiếng Anh | gợi ý nghĩa tiếng Việt\n(Số hàng = số chữ cái của từ khóa hoặc nhiều hơn một vài hàng. Mỗi chữ cái của từ khóa phải có MỘT từ riêng chứa chữ cái đó. Không lặp từ. Các ô chữ cách nhau 1 dòng trống. Gợi ý không chứa chính từ đáp án.)\n\nTỪ KHÓA CÁC Ô CHỮ: [ví dụ: FAMILY; KITCHEN]\nCHỦ ĐỀ: [ví dụ: Our homes]\nTỪ ĐƯỢC PHÉP DÙNG (nếu có): [dán danh sách từ]'
  },
  arena: {
    icon: '🎲', name: 'Đấu trường từ vựng', parse: parseArena, unit: 'câu',
    syntax: ['Chia 3 mức bằng dòng riêng: == DỄ ==, == VỪA ==, == KHÓ ==', 'DỄ (học sinh GÕ từ): đáp án tiếng Anh | đề bài tiếng Việt', 'VỪA (máy ĐỌC, chọn nghĩa): từ đọc | nghĩa đúng | sai 1 | sai 2 | sai 3', 'KHÓ (đọc mô tả, chọn từ): mô tả tiếng Anh | từ đúng | sai 1 | sai 2 | sai 3 (đáp án đúng luôn đứng thứ 2)'],
    example: '== DỄ ==\nliving room | phòng khách\nkitchen | nhà bếp\n== VỪA ==\nbalcony | ban công | tầng hầm | gác mái | nhà để xe\nlamp | cái đèn | cái ghế | cái bàn | cái tủ\n== KHÓ ==\na room where food is cooked | kitchen | bathroom | bedroom | balcony\na machine that keeps food cold | refrigerator | microwave | television | washing machine',
    prompt: PROMPT_HEAD + 'GAME: Đấu trường từ vựng (3 mức câu hỏi).\nCÚ PHÁP: chia mức bằng dòng riêng rồi mỗi dòng một câu.\n== DỄ ==  (học sinh gõ từ tiếng Anh)\nđáp án tiếng Anh | đề bài tiếng Việt\n== VỪA ==  (máy đọc từ, học sinh chọn nghĩa tiếng Việt)\ntừ để đọc | nghĩa đúng | nghĩa sai 1 | nghĩa sai 2 | nghĩa sai 3\n== KHÓ ==  (đọc mô tả tiếng Anh, chọn từ tiếng Anh)\nmô tả tiếng Anh đơn giản (không chứa chính từ đáp án) | từ đúng | từ sai 1 | từ sai 2 | từ sai 3\n(Ở VỪA và KHÓ đáp án đúng luôn ở vị trí thứ 2; đáp án sai cùng chủ đề; không lặp.)\n\nCHỦ ĐỀ: [ví dụ: Our homes]\nTỪ ĐƯỢC PHÉP DÙNG (nếu có): [dán danh sách từ]\nSỐ CÂU: [ví dụ: 8 DỄ, 8 VỪA, 8 KHÓ]'
  },
  wordlink: {
    icon: '🔗', name: 'Ghép chữ hai đầu', parse: null, unit: '',
    syntax: ['Game này KHÔNG cần nhập sẵn nội dung: hai bạn tự chọn chữ cái đầu và cuối, giáo viên duyệt từ ngay trong lúc chơi.'],
    example: '', prompt: ''
  }
};

/* ---------- Lưu trữ + truy cập ---------- */
const data = {};
const C = NS.content = {
  defs: DEFS, data,
  load() { Object.keys(DEFS).forEach(id => { const d = DEFS[id]; data[id] = d.parse ? d.parse(LS.get('pg-content-' + id, '')) : mk(); }); },
  text(id) { return LS.get('pg-content-' + id, ''); },
  save(id, text) { LS.set('pg-content-' + id, text); data[id] = DEFS[id].parse(text); },
  items(id) { return (data[id] && data[id].items) || []; },
  on(id) { return LS.get('pg-content-on-' + id, true) !== false; },
  setOn(id, v) { LS.set('pg-content-on-' + id, !!v); },
  active(id) { return C.on(id) && C.items(id).length > 0; }
};
C.load();

/* ---------- Câu hỏi Đấu trường lấy từ nội dung đã soạn ---------- */
const bags = {};
const nextItem = lv => { const all = C.items('arena').filter(x => x.level === lv); if (!all.length) return null; const b = bags[lv] = bags[lv] && bags[lv].length ? bags[lv] : NS.shuffle(all); return b.pop(); };
const mcOf = (it, extra) => { const opts = NS.shuffle([it.correct].concat(it.wrong)); return Object.assign({ kind: 'mc', hand: true, word: null, options: opts, answer: opts.indexOf(it.correct), explanation: (it.head ? it.head + ' → ' : '') + it.correct }, extra); };
NS.customArenaQ = function (lv) {
  if (!C.active('arena')) return null; const it = nextItem(lv + 1); if (!it) return null;
  if (lv === 0) return { kind: 'type', hand: true, word: null, text: it.answer, stem: 'Gõ từ tiếng Anh cho:', sub: '“' + it.prompt + '”', explanation: it.answer + ' = ' + it.prompt };
  if (lv === 1) return mcOf(it, { listen: true, say: it.head, stem: 'Nghe và chọn nghĩa đúng.', sub: '', explanation: it.head + ' = ' + it.correct });
  return mcOf(it, { dir: 'def', stem: 'Từ nào được miêu tả như sau?', sub: '“' + it.head + '”' });
};
NS.customRaceQ = function () {
  if (!C.active('arena')) return null; const it = nextItem(NS.rand() < 0.5 ? 2 : 3) || nextItem(3) || nextItem(2); if (!it) return null;
  return mcOf(it, { stem: it.level === 2 ? 'Nghĩa của "' + it.head + '" là gì?' : 'Từ nào được miêu tả như sau?', sub: it.level === 3 ? '“' + it.head + '”' : '' });
};
})();
