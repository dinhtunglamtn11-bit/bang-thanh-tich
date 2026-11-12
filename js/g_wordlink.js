/* ===== GAME 6: GHÉP CHỮ HAI ĐẦU — một bạn chọn chữ cái ĐẦU, một bạn chọn chữ cái CUỐI, rồi cùng đua tìm từ ===== */
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
  desc: 'Một bạn chọn chữ cái ĐẦU, một bạn chọn chữ cái CUỐI (mỗi bạn một nửa màn hình). Sau đó cả hai cùng đua gõ một từ bắt đầu và kết thúc bằng hai chữ đó. Từ đã dùng không được lặp lại!',
  options: [
    { key: 'words', label: 'Số từ (số vòng)', type: 'select', choices: [[5, '5'], [8, '8'], [10, '10'], [15, '15'], [20, '20']], def: 8 },
    { key: 'roles', label: 'Ai chọn chữ cái đầu / chữ cái cuối', type: 'select', choices: [['a', 'Bạn 1 chọn chữ ĐẦU · bạn 2 chọn chữ CUỐI'], ['b', 'Bạn 2 chọn chữ ĐẦU · bạn 1 chọn chữ CUỐI'], ['swap', 'Đổi vai mỗi vòng']], def: 'a' },
    { key: 'pickTime', label: 'Thời gian chọn chữ cái', type: 'select', choices: [[5, '5 giây'], [8, '8 giây'], [10, '10 giây'], [15, '15 giây'], [20, '20 giây'], [0, 'Không giới hạn']], def: 10 },
    { key: 'playTime', label: 'Thời gian nhập từ mỗi câu', type: 'select', choices: [[15, '15 giây'], [20, '20 giây'], [30, '30 giây'], [45, '45 giây'], [60, '60 giây'], [0, 'Không giới hạn']], def: 30 },
    { key: 'mode', label: 'Cách tính điểm', type: 'select', choices: [['race', 'Ai nhập đúng trước thì ghi điểm, hết vòng'], ['both', 'Cả hai cùng ghi điểm nếu nhập từ khác nhau (đúng trước +1)']], def: 'race' },
    { key: 'phrases', label: 'Cho phép cụm từ có dấu cách (ví dụ "living room")', type: 'toggle', def: false },
    { key: 'penalty', label: 'Nhập sai bị −1 điểm', type: 'toggle', def: false },
    { key: 'showMeaning', label: 'Hiện nghĩa tiếng Việt của các từ đúng sau mỗi vòng', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🔗 Ghép chữ hai đầu', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, total = +o.words, ic = t => NS.TEAM_ICON[t];
    const used = new Set(), foundList = [];
    const stats = [{ right: 0, wrong: 0 }, { right: 0, wrong: 0 }], review = new Map();
    const poolAll = () => NS.pool({ phrases: !!o.phrases }).filter(okWord);
    const avail = () => poolAll().filter(w => !used.has(keyOf(w.text)));
    const cands = (f, l) => avail().filter(w => firstCh(w) === f && lastCh(w) === l);

    /* Giai đoạn 1: chia đôi màn hình, mỗi bạn chọn một chữ cái */
    function chooseLetters(num, firstTeam) {
      return new Promise(resolve => {
        const A = avail(), firsts = new Set(A.map(firstCh)), lasts = new Set(A.map(lastCh)), V = sh.splitView();
        const pick = [null, null], locked = [false, false], role = t => (t === firstTeam ? 'first' : 'last'), btns = [[], []];
        const bar = h('div', { class: 'tbar' }, h('i', {})), st = h('div', { class: 'wlstat' }, '⏳ Đang chọn…');
        V.mid.append(h('b', { class: 'wlround' }, 'Vòng ' + num + '/' + total), bar, st);
        const lockBtn = [0, 1].map(t => NS.tap(h('button', { class: 'green', type: 'button' }, '✔ Chốt'), () => lock(t)));
        [0, 1].forEach(t => {
          const set = role(t) === 'first' ? firsts : lasts;
          const grid = h('div', { class: 'wlkeys' }, [...ALPHA].map(L => {
            const b = h('button', { type: 'button', class: 'wlk' + (set.has(L.toLowerCase()) ? '' : ' off') }, L);
            if (set.has(L.toLowerCase())) NS.tap(b, () => { if (locked[t] || sh.paused) return; pick[t] = L.toLowerCase(); btns[t].forEach(x => x.classList.toggle('sel', x === b)); show(t); });
            btns[t].push(b); return b;
          }));
          const shown = h('div', { class: 'wlpick' }, '?');
          V.halves[t].append(h('div', { class: 'aname' }, ic(t) + ' ' + names[t] + '  ', sh.tag(t)),
            h('div', { class: 'wlrole t' + t }, role(t) === 'first' ? '👉 Bạn chọn chữ cái ĐẦU của từ' : '👈 Bạn chọn chữ cái CUỐI của từ'), shown, grid, lockBtn[t]);
          btns[t].shown = shown;
        });
        const show = t => { btns[t].shown.textContent = pick[t] ? pick[t].toUpperCase() : '?'; };
        function lock(t) {
          if (locked[t] || !pick[t] || sh.paused) { if (!pick[t]) sh.toast('Hãy bấm một chữ cái trước', 1200); return; }
          locked[t] = true; NS.sfx('ok'); lockBtn[t].classList.add('locked'); btns[t].forEach(b => b.classList.add('locked'));
          btns[t].shown.classList.add('done'); st.textContent = locked[0] && locked[1] ? '✅ Cả hai đã chốt!' : '✅ ' + ic(t) + ' đã chốt — chờ bạn kia…';
          if (locked[0] && locked[1]) { tm.stop(); setTimeout(() => resolve({ first: pick[firstTeam], last: pick[1 - firstTeam] }), 500); }
        }
        const ps = +o.pickTime * 1000;
        const tm = NS.timer(ps, l => { bar.firstChild.style.width = (l / ps * 100) + '%'; bar.classList.toggle('low', l < 3000); }, () => {
          [0, 1].forEach(t => { if (!locked[t]) { if (!pick[t]) { const set = [...(role(t) === 'first' ? firsts : lasts)]; pick[t] = NS.pick(set); show(t); } lock(t); } });
        });
      });
    }

    /* Giai đoạn 2: dùng chung màn hình, cả hai cùng nhập từ */
    function playWord(num, first, last, firstTeam) {
      return new Promise(resolve => {
        const area = sh.plainView(), F = first.toUpperCase(), L = last.toUpperCase();
        const found = [false, false], times = [0, 0]; let done = false, t0 = performance.now();
        const bar = h('div', { class: 'tbar' }, h('i', {}));
        const head = h('div', { class: 'wlhead' }, h('div', { class: 'wlpat' }, F + ' _ _ _ ' + L),
          h('div', { class: 'wlsub' }, 'Chữ ĐẦU: ' + F + ' (' + ic(firstTeam) + ' ' + names[firstTeam] + ')  ·  Chữ CUỐI: ' + L + ' (' + ic(1 - firstTeam) + ' ' + names[1 - firstTeam] + ')'), bar);
        const usedBox = h('div', { class: 'wlused' });
        const paintUsed = () => { usedBox.innerHTML = ''; usedBox.append(h('b', {}, '🚫 Từ đã dùng (' + foundList.length + '): '), ...(foundList.length ? foundList.map(f => h('span', { class: 'wlchip t' + f.team }, f.word.text)) : [h('i', {}, 'chưa có')])); };
        paintUsed();
        const panels = [0, 1].map(t => {
          const buf = []; const cells = h('div', { class: 'wlcells' }), msg = h('div', { class: 'wlmsg' }, 'Gõ phần ở giữa, rồi bấm Gửi');
          const paint = () => { cells.innerHTML = ''; cells.append(h('span', { class: 'wlc fix' }, F), ...buf.map(c => h('span', { class: 'wlc' }, c === ' ' ? '␣' : c)), h('span', { class: 'wlc fix' }, L)); };
          paint();
          const kb = NS.kbd(ch => { if (done || found[t] && o.mode === 'both' || buf.length >= 16) return; buf.push(ch); paint(); },
            () => { if (done) return; buf.pop(); paint(); }, () => submit(t, buf, msg, paint, panel), { enter: '✔ Gửi' });
          kb.classList.add('compact');
          const panel = h('div', { class: 'wlpanel t' + t }, h('div', { class: 'aname' }, ic(t) + ' ' + names[t] + '  ', sh.tag(t)), cells, msg, kb);
          return { panel, msg };
        });
        area.append(head, h('div', { class: 'wlpanels' }, panels[0].panel, panels[1].panel), usedBox);
        sh.setInfo('Vòng ' + num + '/' + total);
        const ps = +o.playTime * 1000;
        const tm = NS.timer(ps, l => { bar.firstChild.style.width = (l / ps * 100) + '%'; bar.classList.toggle('low', l < 6000); }, () => end());
        function submit(t, buf, msg, paint, panel) {
          if (done || sh.paused || (found[t] && o.mode === 'both')) return;
          if (buf.length < 1) { msg.textContent = 'Từ phải có ít nhất 3 chữ cái'; return; }
          const typed = F + buf.join('').toUpperCase() + L, k = keyOf(typed);
          const w = poolAll().find(x => keyOf(x.text) === k);
          const fail = txt => { stats[t].wrong++; NS.sfx('bad'); NS.vibe(80); msg.textContent = txt; msg.className = 'wlmsg bad'; panel.classList.add('shake'); setTimeout(() => panel.classList.remove('shake'), 450); if (o.penalty) sh.addScore(t, -1, 0); buf.length = 0; paint(); };
          if (!w) { fail(used.has(k) ? '⛔ Từ "' + typed.toLowerCase() + '" đã được dùng rồi!' : '❌ "' + typed.toLowerCase() + '" không có trong kho từ'); return; }
          if (used.has(k)) { fail('⛔ Từ "' + w.text + '" đã được dùng rồi!'); return; }
          used.add(k); found[t] = true; times[t] = (performance.now() - t0) / 1000; foundList.push({ word: w, team: t }); paintUsed();
          const first1 = !found[1 - t]; const pts = o.mode === 'race' ? 3 : 2 + (first1 ? 1 : 0);
          stats[t].right++; sh.addScore(t, pts); NS.sfx('ok'); NS.vibe(40); msg.textContent = '✅ ' + w.text + ' — ' + w.meaning + '  +' + pts; msg.className = 'wlmsg good'; panel.classList.add('won');
          sh.toast(ic(t) + ' ' + names[t] + ' +' + pts + ' · ' + w.text, 1700);
          if (o.mode === 'race' || (found[0] && found[1])) end();
        }
        let ended = false;
        async function end() {
          if (ended) return; ended = true; done = true; tm.stop();
          if (!found[0] && !found[1]) NS.sfx('bad');
          const rest = cands(first, last).slice(0, 8);
          if (!found[0] && !found[1] && rest[0]) review.set(rest[0].id, rest[0]);
          area.append(h('div', { class: 'aans' }, (rest.length ? '💡 Còn có thể là: ' : '💡 Không còn từ nào khác nữa. ') + rest.map(w => w.text + (o.showMeaning ? ' (' + w.meaning + ')' : '')).join(' · ')));
          await sh.sleep(found[0] || found[1] ? 2200 : 3200); resolve();
        }
      });
    }

    (async () => {
      for (let r = 1; r <= total && !sh.dead; r++) {
        if (!avail().length) { sh.toast('Đã dùng hết từ trong kho!', 2000); await sh.sleep(2000); break; }
        const firstTeam = o.roles === 'a' ? 0 : o.roles === 'b' ? 1 : (r - 1) % 2;
        let pair = null;
        for (let tries = 0; tries < 4 && !sh.dead; tries++) {
          pair = await chooseLetters(r, firstTeam); if (sh.dead) return;
          if (cands(pair.first, pair.last).length) break;
          if (tries === 3) { const w = NS.pick(avail()); pair = { first: firstCh(w), last: lastCh(w) }; sh.toast('Máy chọn giúp một cặp chữ cái có đáp án', 2200); break; }
          sh.toast('😅 Không có từ nào bắt đầu bằng "' + pair.first.toUpperCase() + '" và kết thúc bằng "' + pair.last.toUpperCase() + '". Chọn lại!', 2600); await sh.sleep(2600);
        }
        if (sh.dead) return;
        await playWord(r, pair.first, pair.last, firstTeam);
      }
      if (!sh.dead) sh.result({ scores: sh.scores, stats, wrong: [...review.values()], tie: [stats[0].right, stats[1].right] });
    })();
  }
});
})();
