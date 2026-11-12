/* ===== GAME 6: GHÉP CHỮ HAI ĐẦU =====
   Giai đoạn 1 (chia đôi màn hình): hai bạn lần lượt chọn chữ cái ĐẦU / CUỐI cho TẤT CẢ các câu, chọn xong câu nào chuyển luôn sang câu kế tiếp.
   Giai đoạn 2 (màn hình chung): bảng chung hiện các cặp chữ, rồi từng câu hai bạn cùng đua gõ từ có chữ đầu và chữ cuối đã chọn. */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

const okWord = w => /^[A-Za-z' -]+$/.test(w.text) && w.length >= 3;
const keyOf = t => String(t).toLowerCase().trim().replace(/\s+/g, ' ');
const firstCh = w => w.text.replace(/[^A-Za-z]/g, '')[0].toLowerCase();
const lastCh = w => w.text.replace(/[^A-Za-z]/g, '').slice(-1).toLowerCase();
const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

NS.games.push({
  id: 'wordlink', name: 'Ghép chữ hai đầu', icon: '🔗',
  desc: 'Hai bạn lần lượt chọn chữ cái ĐẦU và CUỐI cho từng câu (chia đôi màn hình, chọn kín). Sau đó cả hai cùng xem bảng chung và đua gõ từ cho từng câu. Từ đã dùng không được lặp lại!',
  options: [
    { key: 'judge', label: 'Ai quyết định từ hợp lệ', type: 'select', choices: [['manual', '👩‍🏫 Giáo viên quyết định (bấm ✔ / ✘, không cần có trong kho từ)'], ['vocab', '🤖 Tự động: chỉ nhận từ có trong kho từ vựng']], def: 'manual' },
    { key: 'words', label: 'Số câu (số cặp chữ cái)', type: 'select', choices: [[5, '5'], [8, '8'], [10, '10'], [12, '12'], [15, '15'], [20, '20']], def: 10 },
    { key: 'swapRoles', label: 'Đổi vai chọn chữ ĐẦU / CUỐI sau mỗi câu', type: 'toggle', def: false },
    { key: 'pickTime', label: 'Thời gian chọn chữ cái mỗi câu', type: 'select', choices: [[5, '5 giây'], [8, '8 giây'], [10, '10 giây'], [15, '15 giây'], [20, '20 giây'], [0, 'Không giới hạn']], def: 10 },
    { key: 'playTime', label: 'Thời gian nhập từ mỗi câu', type: 'select', choices: [[15, '15 giây'], [20, '20 giây'], [30, '30 giây'], [45, '45 giây'], [60, '60 giây'], [0, 'Không giới hạn']], def: 30 },
    { key: 'mode', label: 'Cách tính điểm', type: 'select', choices: [['race', 'Ai nhập đúng trước thì ghi điểm, hết câu'], ['both', 'Cả hai cùng ghi điểm nếu nhập từ khác nhau (đúng trước +1)']], def: 'race' },
    { key: 'phrases', label: 'Cho phép cụm từ có dấu cách (ví dụ "living room")', type: 'toggle', def: false },
    { key: 'penalty', label: 'Nhập sai bị −1 điểm', type: 'toggle', def: false },
    { key: 'boardSize', label: 'Cỡ chữ của bảng chung (có thể chỉnh thêm khi chơi bằng nút 🔍)', type: 'select', choices: [[1, 'Nhỏ'], [2, 'Vừa'], [3, 'To'], [4, 'Rất to']], def: 3 },
    { key: 'showMeaning', label: 'Hiện gợi ý từ kho từ vựng (kèm nghĩa) sau mỗi câu', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🔗 Ghép chữ hai đầu', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, total = +o.words, ic = t => NS.TEAM_ICON[t];
    const used = new Set(), foundList = [], pairs = [];
    const stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }], review = new Map();
    let firstTeam = 0; /* đội nào đi trước = chọn chữ cái ĐẦU */
    const poolAll = () => NS.pool({ phrases: !!o.phrases }).filter(okWord);
    const cands = (f, l) => poolAll().filter(w => firstCh(w) === f && lastCh(w) === l);
    const roleOf = (q, t) => (((q % 2) && o.swapRoles ? 1 - firstTeam : firstTeam) === t ? 'first' : 'last');

    /* ---- Màn hình chuẩn bị: nhập tên, chọn ai đi trước / đi sau ---- */
    function setup() {
      return new Promise(resolve => {
        const area = sh.plainView(), inp = [0, 1].map(t => h('input', { type: 'text', value: names[t], maxlength: 16 })), btns = [[], []];
        const paint = () => [0, 1].forEach(t => { const first = t === firstTeam; btns[t][0].classList.toggle('green', first); btns[t][1].classList.toggle('green', !first); });
        const card = t => h('div', { class: 'wlsetup t' + t }, h('div', { class: 'wlava' }, ic(t)), h('label', {}, 'Tên người chơi'), inp[t],
          h('div', { class: 'wlturn' }, [['🥇 Đi TRƯỚC: chọn chữ cái ĐẦU', t], ['🥈 Đi SAU: chọn chữ cái CUỐI', 1 - t]].map(([txt, who], k) => { const b = NS.tap(h('button', { type: 'button' }, txt), () => { firstTeam = who; paint(); }); btns[t][k] = b; return b; })));
        area.append(h('div', { class: 'wlsetwrap' }, h('h2', {}, '🔗 Chuẩn bị chơi'), h('p', {}, 'Nhập tên và chọn ai đi trước (chọn chữ cái ĐẦU của từ) / đi sau (chọn chữ cái CUỐI) cho ' + total + ' câu.'), h('div', { class: 'wlsetgrid' }, card(0), card(1)),
          NS.tap(h('button', { class: 'green big', type: 'button' }, '▶ Bắt đầu chọn chữ cái'), () => { [0, 1].forEach(t => { const n = inp[t].value.trim(); if (n) sh.setName(t, n); }); resolve(); })));
        paint();
      });
    }

    /* ---- Giai đoạn 1: chọn kín chữ cái đầu / cuối cho từng câu ---- */
    async function pickPhase() {
      const V = sh.splitView();
      for (let q = 0; q < total && !sh.dead; q++) {
        let pair = null;
        for (let tries = 0; tries < 4 && !sh.dead; tries++) {
          pair = await chooseLetters(V, q); if (sh.dead) return;
          if (o.judge !== 'vocab' || cands(pair.first, pair.last).length) break;
          if (tries === 3) { const w = NS.pick(poolAll()); pair = { first: firstCh(w), last: lastCh(w) }; break; }
          sh.toast('😅 Không có từ nào bắt đầu bằng "' + pair.first.toUpperCase() + '" và kết thúc bằng "' + pair.last.toUpperCase() + '". Chọn lại!', 2200); await sh.sleep(2200);
        }
        const ft = roleOf(q, 0) === 'first' ? 0 : 1;
        pairs.push({ first: pair.first, last: pair.last, firstTeam: ft });
      }
    }
    function chooseLetters(V, q) {
      return new Promise(resolve => {
        const A = poolAll(), all = new Set([...ALPHA].map(c => c.toLowerCase()));
        const firsts = o.judge === 'vocab' ? new Set(A.map(firstCh)) : all, lasts = o.judge === 'vocab' ? new Set(A.map(lastCh)) : all;
        V.halves.forEach(x => { x.innerHTML = ''; }); V.mid.innerHTML = '';
        const pick = [null, null], locked = [false, false], keys = [[], []];
        const bar = h('div', { class: 'tbar' }, h('i', {})), st = h('div', { class: 'wlstat' }, '⏳ Đang chọn…');
        V.mid.append(h('b', { class: 'wlround' }, 'Câu ' + (q + 1) + '/' + total), bar, st);
        sh.setInfo('Chọn chữ cái · câu ' + (q + 1) + '/' + total);
        const lockBtn = [0, 1].map(t => NS.tap(h('button', { class: 'green', type: 'button' }, '✔ Chốt'), () => lock(t)));
        [0, 1].forEach(t => {
          const first = roleOf(q, t) === 'first', set = first ? firsts : lasts;
          const grid = h('div', { class: 'wlkeys' }, [...ALPHA].map(L => {
            const b = h('button', { type: 'button', class: 'wlk' + (set.has(L.toLowerCase()) ? '' : ' off') }, L);
            if (set.has(L.toLowerCase())) NS.tap(b, () => { if (locked[t] || sh.paused) return; pick[t] = L.toLowerCase(); keys[t].forEach(x => x.classList.toggle('dot', x === b)); });
            keys[t].push(b); return b;
          }));
          V.halves[t].append(h('div', { class: 'aname' }, ic(t) + ' ' + names[t] + '  ', sh.tag(t)),
            h('div', { class: 'wlrole t' + t }, first ? '👉 Chọn chữ cái ĐẦU của từ' : '👈 Chọn chữ cái CUỐI của từ'), grid, lockBtn[t]);
        });
        function lock(t) {
          if (locked[t] || sh.paused) return; if (!pick[t]) { sh.toast('Hãy bấm một chữ cái trước', 1200); return; }
          locked[t] = true; NS.sfx('tick'); lockBtn[t].classList.add('locked'); keys[t].forEach(b => { b.classList.add('locked'); b.classList.remove('dot'); });
          st.textContent = locked[0] && locked[1] ? '✅ Xong câu ' + (q + 1) : '✔ ' + ic(t) + ' đã chốt — chờ bạn kia…';
          if (locked[0] && locked[1]) { tm.stop(); const ft = roleOf(q, 0) === 'first' ? 0 : 1; setTimeout(() => resolve({ first: pick[ft], last: pick[1 - ft] }), 350); }
        }
        const ps = +o.pickTime * 1000;
        const tm = NS.timer(ps, l => { bar.firstChild.style.width = (l / ps * 100) + '%'; bar.classList.toggle('low', l < 3000); }, () => {
          [0, 1].forEach(t => { if (!locked[t]) { if (!pick[t]) { const first = roleOf(q, t) === 'first', set = [...(first ? firsts : lasts)]; pick[t] = NS.pick(set); } lock(t); } });
        });
      });
    }

    /* ---- Bảng chung: ai chọn chữ gì cho từng câu ---- */
    const boardEl = h('div', { class: 'wlboard' }), cellEls = [];
    let boardSize = +o.boardSize || 3, onPickCell = null;
    function buildBoard() {
      boardEl.innerHTML = ''; cellEls.length = 0;
      pairs.forEach((p, i) => {
        const c = h('div', { class: 'wlcell' + (p.res ? ' closed done t' + p.res.team : '') + (p.none ? ' closed none' : '') }, h('small', {}, 'Câu ' + (i + 1)), h('b', {}, p.first.toUpperCase() + ' … ' + p.last.toUpperCase()), h('span', { class: 'wlwho' }, ic(p.firstTeam) + ' ' + p.first.toUpperCase() + '  ·  ' + p.last.toUpperCase() + ' ' + ic(1 - p.firstTeam)),
          h('em', {}, p.res ? ic(p.res.team) + ' ' + names[p.res.team] + ': ' + p.res.text : p.none ? '— không ai tìm ra' : ''));
        NS.tap(c, () => { if (onPickCell && !p.res && !p.none) onPickCell(i); });
        cellEls.push(c); boardEl.append(c);
      });
    }
    const markCell = (i, on) => cellEls.forEach((c, k) => { c.classList.toggle('now', on && k === i); });
    const resultCell = (i, team, text) => { pairs[i].res = { team, text }; const c = cellEls[i]; c.classList.add('done', 'closed', 't' + team); c.querySelector('em').textContent = ic(team) + ' ' + names[team] + ': ' + text; };
    const setSize = n => { boardSize = Math.max(1, Math.min(4, n)); boardEl.className = 'wlboard s' + boardSize; };

    /* chọn câu bất kỳ để giải (không cần theo thứ tự). Trả về chỉ số câu, hoặc -1 nếu kết thúc game */
    function showBoard() {
      return new Promise(resolve => {
        const area = sh.plainView(); buildBoard(); setSize(boardSize); sh.setInfo('Bảng chung · chọn câu');
        const left = pairs.filter(p => !p.res && !p.none).length;
        const sizeBar = h('div', { class: 'wlsizebar' }, h('span', {}, 'Cỡ bảng: '), NS.tap(h('button', { class: 'small', type: 'button' }, '🔍−'), () => setSize(boardSize - 1)), NS.tap(h('button', { class: 'small', type: 'button' }, '🔍+'), () => setSize(boardSize + 1)));
        onPickCell = i => { onPickCell = null; resolve(i); };
        area.append(h('div', { class: 'wlsetwrap wide' }, h('h2', {}, '📋 Bảng chung — chọn một câu để giải'), h('p', {}, 'Bấm vào ô bất kỳ để làm câu đó (không cần theo thứ tự). Còn ' + left + '/' + pairs.length + ' câu.'), sizeBar, boardEl,
          NS.tap(h('button', { class: 'red', type: 'button' }, '🏁 Kết thúc game'), () => { onPickCell = null; resolve(-1); })));
      });
    }

    /* ---- Giai đoạn 2: cùng đua gõ từ cho câu q ---- */
    function playWord(q) {
      return new Promise(resolve => {
        const p = pairs[q], first = p.first, last = p.last, F = first.toUpperCase(), L = last.toUpperCase();
        const area = sh.plainView(); buildBoard(); markCell(q, true); boardEl.className = 'wlboard compact';
        const found = [false, false]; let done = false, judging = false, winner = -1;
        const bar = h('div', { class: 'tbar' }, h('i', {}));
        const head = h('div', { class: 'wlhead' }, h('div', { class: 'wlsub' }, 'Câu ' + (q + 1) + '/' + total + '  ·  Chữ ĐẦU: ' + F + ' (' + ic(p.firstTeam) + ' ' + names[p.firstTeam] + ')  ·  Chữ CUỐI: ' + L + ' (' + ic(1 - p.firstTeam) + ' ' + names[1 - p.firstTeam] + ')'),
          h('div', { class: 'wlpat' }, F + ' _ _ _ ' + L), bar);
        const usedBox = h('div', { class: 'wlused' });
        const paintUsed = () => { usedBox.innerHTML = ''; usedBox.append(h('b', {}, '🚫 Từ đã dùng (' + foundList.length + '): '), ...(foundList.length ? foundList.map(f => h('span', { class: 'wlchip t' + f.team }, ic(f.team) + ' ' + f.word.text)) : [h('i', {}, 'chưa có')])); };
        paintUsed();
        const panels = [0, 1].map(t => {
          const buf = []; const cells = h('div', { class: 'wlcells' }), msg = h('div', { class: 'wlmsg' }, 'Gõ phần ở giữa, rồi bấm Gửi');
          const paint = () => { cells.innerHTML = ''; cells.append(h('span', { class: 'wlc fix' }, F), ...buf.map(c => h('span', { class: 'wlc' }, c === ' ' ? '␣' : c)), h('span', { class: 'wlc fix' }, L)); };
          paint();
          const kb = NS.kbd(ch => { if (done || judging || (found[t] && o.mode === 'both') || buf.length >= 16) return; buf.push(ch); paint(); },
            () => { if (done || judging) return; buf.pop(); paint(); }, () => submit(t, buf, msg, paint, panel), { enter: '✔ Gửi' });
          kb.classList.add('compact');
          const panel = h('div', { class: 'wlpanel t' + t }, h('div', { class: 'aname' }, ic(t) + ' ' + names[t] + '  ', sh.tag(t)), cells, msg, kb);
          return { panel, msg };
        });
        area.append(boardEl, head, h('div', { class: 'wlpanels' }, panels[0].panel, panels[1].panel), usedBox);
        sh.setInfo('Câu ' + (q + 1) + '/' + total);
        const ps = +o.playTime * 1000;
        const tm = NS.timer(ps, l => { bar.firstChild.style.width = (l / ps * 100) + '%'; bar.classList.toggle('low', l < 6000); }, () => end());
        function submit(t, buf, msg, paint, panel) {
          if (done || sh.paused || judging || (found[t] && o.mode === 'both')) return;
          if (buf.length < 1) { msg.textContent = 'Từ phải có ít nhất 3 chữ cái'; return; }
          const typed = F + buf.join('').toUpperCase() + L, k = keyOf(typed);
          const fail = txt => { stats[t].wrong++; NS.sfx('bad'); NS.vibe(80); msg.textContent = txt; msg.className = 'wlmsg bad'; panel.classList.add('shake'); setTimeout(() => panel.classList.remove('shake'), 450); if (o.penalty) sh.addScore(t, -1, 0); buf.length = 0; paint(); };
          const accept = w => {
            used.add(k); found[t] = true; foundList.push({ word: w, team: t }); paintUsed();
            const first1 = !found[1 - t]; const pts = o.mode === 'race' ? 3 : 2 + (first1 ? 1 : 0);
            stats[t].right++; sh.addScore(t, pts); NS.sfx('ok'); NS.vibe(40); msg.textContent = '✅ ' + w.text + (w.meaning ? ' — ' + w.meaning : '') + '  +' + pts; msg.className = 'wlmsg good'; panel.classList.add('won');
            sh.toast(ic(t) + ' ' + names[t] + ' +' + pts + ' · ' + w.text, 1700);
            if (winner < 0) { winner = t; resultCell(q, t, w.text); }
            if (o.mode === 'race' || (found[0] && found[1])) end();
          };
          if (used.has(k)) { fail('⛔ Từ "' + typed.toLowerCase() + '" đã được dùng rồi!'); return; }
          const hit = poolAll().find(x => keyOf(x.text) === k);
          if (o.judge === 'vocab') { if (!hit) fail('❌ "' + typed.toLowerCase() + '" không có trong kho từ'); else accept({ text: hit.text, meaning: hit.meaning }); return; }
          /* giáo viên quyết định từ có hợp lệ hay không (thời gian tạm dừng trong lúc chờ) */
          judging = true; sh.paused = true; NS.sfx('pow');
          const close = ok => { sh.closeOverlay(); sh.paused = false; judging = false; if (ok) accept({ text: typed.toLowerCase(), meaning: hit ? hit.meaning : '' }); else fail('❌ "' + typed.toLowerCase() + '" không được chấp nhận'); };
          sh.overlay(h('div', { class: 'gdlg t' + t }, h('h3', {}, '👩‍🏫 Giáo viên xác nhận'), h('p', {}, ic(t) + ' ' + names[t] + ' đã gõ:'), h('div', { class: 'wlbig' }, typed),
            hit ? h('p', { class: 'note' }, '📚 Có trong kho từ vựng: ' + hit.meaning) : h('p', { class: 'note' }, 'Không có trong kho từ vựng — bạn quyết định.'),
            h('div', { class: 'rbtns' }, NS.tap(h('button', { class: 'green', type: 'button' }, '✔ Hợp lệ'), () => close(true)), NS.tap(h('button', { class: 'red', type: 'button' }, '✘ Không hợp lệ'), () => close(false)))));
        }
        let ended = false;
        async function end() {
          if (ended) return; ended = true; done = true; tm.stop();
          if (!found[0] && !found[1]) { NS.sfx('bad'); pairs[q].none = true; const c = cellEls[q]; c.classList.add('none', 'closed'); c.querySelector('em').textContent = '— không ai tìm ra'; }
          const rest = cands(first, last).filter(w => !used.has(keyOf(w.text))).slice(0, 8);
          if (o.judge === 'vocab' && !found[0] && !found[1] && rest[0]) review.set(rest[0].id, rest[0]);
          if (o.showMeaning && rest.length) area.append(h('div', { class: 'aans' }, '💡 Gợi ý từ kho từ vựng: ' + rest.map(w => w.text + ' (' + w.meaning + ')').join(' · ')));
          markCell(q, false);
          await sh.sleep(found[0] || found[1] ? 2000 : 3000); resolve();
        }
      });
    }

    (async () => {
      await setup(); if (sh.dead) return;
      await pickPhase(); if (sh.dead) return;
      await showBoard(); if (sh.dead) return;
      while (!sh.dead && pairs.some(p => !p.res && !p.none)) { const q = await showBoard(); if (sh.dead || q < 0) break; await playWord(q); }
      if (!sh.dead) sh.result({ scores: sh.scores, stats, wrong: [...review.values()], tie: [stats[0].right, stats[1].right] });
    })();
  }
});
})();
