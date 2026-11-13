/* ===== GAME 1: ĐẢO CHỮ CÁI ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

/* Xáo chữ: không trùng chuỗi gốc (trừ khi mọi chữ giống nhau); trả về mảng chữ in hoa */
NS.scrambleLetters = function (text, r) {
  const letters = [...String(text).toUpperCase().replace(/[^A-Z]/g, '')];
  if (new Set(letters).size < 2) return letters;
  const orig = letters.join(''); let s = letters;
  for (let i = 0; i < 100; i++) { s = NS.shuffle(letters, r); if (s.join('') !== orig) return s; }
  return letters.slice().reverse().join('') !== orig ? letters.slice().reverse() : letters.slice(1).concat(letters[0]);
};
const LEVELS = [
  { name: 'Dễ', pts: 1, label: 'Dễ · 3-5 chữ · 1 điểm', ok: w => !w.isPhrase && w.length >= 3 && w.length <= 5 },
  { name: 'Vừa', pts: 2, label: 'Vừa · 6-8 chữ · 2 điểm', ok: w => !w.isPhrase && w.length >= 6 && w.length <= 8 },
  { name: 'Khó', pts: 3, label: 'Khó · 9+ chữ hoặc cụm · 3 điểm', ok: w => w.isPhrase || w.length >= 9 }
];

NS.games.push({
  id: 'anagram', name: 'Đảo chữ cái', icon: '🔤', desc: 'Sắp xếp các chữ cái bị xáo thành từ tiếng Anh đúng. Ai xếp đúng trước thì ghi điểm!',
  options: [
    { key: 'rounds', label: 'Số vòng', type: 'select', choices: [[5, '5'], [8, '8'], [10, '10'], [12, '12']], def: 8 },
    { key: 'time', label: 'Thời gian mỗi vòng', type: 'select', choices: [[15, '15 giây'], [25, '25 giây'], [40, '40 giây'], [60, '60 giây'], [90, '90 giây'], [0, 'Không giới hạn']], def: 40 },
    { key: 'hints', label: 'Số lần gợi ý chữ đầu mỗi đội', type: 'select', choices: [[0, 'Không có gợi ý'], [1, '1 lần'], [2, '2 lần'], [3, '3 lần']], def: 2 },
    { key: 'showMeaning', label: 'Hiện nghĩa tiếng Việt làm đề bài (tắt = chỉ đoán theo chữ)', type: 'toggle', def: true },
    { key: 'ipa', label: 'Hiện phiên âm làm gợi ý', type: 'toggle', def: false }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🔤 Đảo chữ', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, total = +o.rounds, secs = +o.time;
    const pool = NS.pool(), bag = NS.makeBag(pool);
    const stats = [{ right: 0, wrong: 0, t: 0 }, { right: 0, wrong: 0, t: 0 }], wrongWords = new Map(), hints = [+o.hints, +o.hints];
    const handQs = () => NS.hand.questions.filter(q => q.type === 'sap-xep-chu' && !NS.handUsed.has(q.id));

    const usedC = new Set();
    function pickWord(lv) {
      if (NS.content && NS.content.active('anagram')) {
        const all = NS.content.items('anagram'); let pool = all.filter(x => !usedC.has(x.text.toLowerCase())); if (!pool.length) { usedC.clear(); pool = all; }
        const auto = x => { const len = x.text.replace(/[^A-Za-z]/g, '').length, ph = /[\s-]/.test(x.text); return ph || len >= 9 ? 3 : len >= 6 ? 2 : 1; };
        const lp = pool.filter(x => (x.level || auto(x)) === lv + 1), it = NS.pick(lp.length ? lp : pool); usedC.add(it.text.toLowerCase());
        return { text: it.text, meaning: it.hint || '', ipa: '', id: NS.slug(it.text), length: it.text.replace(/[^A-Za-z]/g, '').length };
      }
      const hq = handQs();
      if (NS.cfg.source !== 'auto' && hq.length) {
        const c = hq.filter(q => q.difficulty === lv + 1), q = NS.pick(c.length ? c : hq); NS.handUsed.add(q.id);
        const text = q.answers[0]; return { text, meaning: q.hint || '', ipa: '', id: NS.slug(text), length: text.replace(/[^A-Za-z]/g, '').length, scr: q.scramble ? q.scramble.join('').toUpperCase().split('') : null };
      }
      return bag.next(LEVELS[lv].ok) || bag.next(w => !w.isPhrase) || bag.next();
    }

    function round(num, lv) {
      return new Promise(resolve => {
        const w = pickWord(lv);
        if (!w) { sh.area.innerHTML = ''; sh.area.append(h('div', { class: 'gdlg' }, h('h2', {}, 'Chưa có từ vựng'))); return resolve(); }
        const answer = [...w.text.toUpperCase()].filter(c => /[A-Z]/.test(c)).join('');
        const scr = w.scr || NS.scrambleLetters(w.text);
        const split = sh.split, V = split ? sh.splitView() : null, plain = split ? null : sh.plainView();
        const mkHead = () => h('div', { class: 'ahead' }, h('div', { class: 'ameaning' }, o.showMeaning ? w.meaning : '❓'), w.ipa && o.ipa ? h('div', { class: 'aipa' }, '/' + w.ipa + '/') : null,
          h('div', { class: 'ameta' }, LEVELS[lv].name + ' · ' + w.length + ' chữ' + (w.text.includes(' ') ? ' · ' + w.text.split(/\s+/).length + ' từ' : '')));
        const bar = h('div', { class: 'tbar' }, h('i', {}));
        const panels = split ? null : h('div', { class: 'apanels' });
        if (split) V.mid.append(bar); else { const hd = mkHead(); hd.append(bar); plain.append(hd, panels); }
        sh.setInfo('Vòng ' + Math.min(num, total) + '/' + total + (num > total ? ' (phân định)' : ''));
        let done = false, locked = [false, false], elapsed = 0, hintUsed = [0, 0];
        const T = [0, 1].map(team => {
          const st = { tiles: scr.map((c, i) => ({ c, i, used: false })), slots: Array(answer.length).fill(null), fixed: Array(answer.length).fill(false) };
          const slotEls = [], tileEls = [];
          const slotRow = h('div', { class: 'aslots' });
          let si = 0;
          [...w.text].forEach(ch => {
            if (/[A-Za-z]/.test(ch)) { const idx = si++; const el = h('button', { class: 'aslot', type: 'button' }, ''); NS.tap(el, () => unplace(idx)); slotEls[idx] = el; slotRow.append(el); }
            else slotRow.append(h('span', { class: 'agap' }, ch === ' ' ? '' : ch));
          });
          const tray = h('div', { class: 'atray' });
          st.tiles.forEach((t, i) => { const el = h('button', { class: 'atile', type: 'button' }, t.c); NS.tap(el, () => place(i)); tileEls[i] = el; tray.append(el); });
          const hintBtn = h('button', { class: 'small', type: 'button' }, '💡 Chữ đầu (' + hints[team] + ')');
          const btns = h('div', { class: 'abtns' },
            NS.tap(h('button', { class: 'small red', type: 'button' }, '⌫ Xóa'), () => { for (let k = st.slots.length - 1; k >= 0; k--) if (st.slots[k] !== null && !st.fixed[k]) { unplace(k); break; } }),
            NS.tap(h('button', { class: 'small', type: 'button' }, '↺ Làm lại'), () => { for (let k = 0; k < st.slots.length; k++) if (!st.fixed[k]) unplace(k); }),
            NS.tap(hintBtn, () => {
              if (done || locked[team] || hints[team] <= 0 || st.fixed[0]) return;
              unplace(0); const ti = st.tiles.findIndex(t => !t.used && t.c === answer[0]); if (ti < 0) return;
              hints[team]--; hintUsed[team]++; hintBtn.textContent = '💡 Chữ đầu (' + hints[team] + ')';
              st.tiles[ti].used = true; st.slots[0] = ti; st.fixed[0] = true; paint(); check();
            }));
          const panel = h('div', { class: 'apanel t' + team }, h('div', { class: 'aname' }, NS.TEAM_ICON[team] + ' ' + names[team] + '  ', sh.tag(team)), slotRow, tray, btns);
          if (split) V.halves[team].append(mkHead(), panel); else panels.append(panel);
          function paint() {
            st.slots.forEach((ti, k) => { slotEls[k].textContent = ti === null ? '' : st.tiles[ti].c; slotEls[k].classList.toggle('filled', ti !== null); slotEls[k].classList.toggle('fixed', st.fixed[k]); });
            st.tiles.forEach((t, i) => tileEls[i].classList.toggle('used', t.used));
          }
          function place(i) {
            if (done || locked[team] || sh.paused || st.tiles[i].used) return;
            const k = st.slots.indexOf(null); if (k < 0) return;
            st.tiles[i].used = true; st.slots[k] = i; NS.sfx('tick'); paint(); check();
          }
          function unplace(k) {
            if (done || locked[team] || sh.paused || st.fixed[k] || st.slots[k] === null) return;
            st.tiles[st.slots[k]].used = false; st.slots[k] = null; paint();
          }
          function check() {
            if (st.slots.includes(null) || done) return;
            const guess = st.slots.map(ti => st.tiles[ti].c).join('');
            if (guess === answer) win(team);
            else {
              stats[team].wrong++; NS.markWrong(w.id ? w : null); NS.sfx('bad'); NS.vibe(80);
              locked[team] = true; panel.classList.add('shake', 'locked');
              setTimeout(() => {
                panel.classList.remove('shake');
                for (let k = 0; k < st.slots.length; k++) if (!st.fixed[k] && st.slots[k] !== null) { st.tiles[st.slots[k]].used = false; st.slots[k] = null; }
                paint();
              }, 450);
              setTimeout(() => { locked[team] = false; panel.classList.remove('locked'); }, 1500);
            }
          }
          return { panel, st };
        });

        const tm = NS.timer(secs * 1000, l => { elapsed = secs * 1000 - l; bar.firstChild.style.width = (l / (secs * 1000) * 100) + '%'; bar.classList.toggle('low', l < 8000); if (l > 0 && l % 1000 < 100 && l < 6000) NS.sfx('tick'); }, () => finish(-1));
        function win(team) {
          if (done) return; done = true; tm.stop();
          const sec = elapsed / 1000, bonus = sec <= 8 ? 1 : 0, pts = Math.max(0, LEVELS[lv].pts + bonus - hintUsed[team]);
          stats[team].right++; stats[team].t += sec; sh.addScore(team, pts); NS.sfx('ok'); NS.vibe(40);
          T[team].panel.classList.add('won');
          sh.toast('🎉 ' + names[team] + ' +' + pts + (bonus ? ' (nhanh +1)' : '') + (hintUsed[team] ? ' (gợi ý -' + hintUsed[team] + ')' : ''), 1800);
          finish(team);
        }
        async function finish(team) {
          done = true; tm.stop();
          if (team < 0) { NS.markWrong(w.id ? w : null); NS.sfx('bad'); }
          if (!(w.id && NS.vocab.words.some(x => x.id === w.id)) || team < 0) { /* chỉ đưa vào danh sách ôn khi không ai làm được */ }
          if (team < 0 && w.id) wrongWords.set(w.id, w);
          const ans = () => h('div', { class: 'aans' }, '✅ ' + w.text.toUpperCase() + (w.ipa ? '  /' + w.ipa + '/' : '') + ' — ' + w.meaning);
          if (split) V.halves.forEach(hv => hv.append(ans())); else plain.append(ans());
          await sh.sleep(2200); resolve();
        }
      });
    }

    (async () => {
      for (let r = 1; r <= total && !sh.dead; r++) {
        const chooser = (r - 1) % 2; sh.setActive(chooser);
        const lv = await NS.choose(sh, NS.TEAM_ICON[chooser] + ' ' + names[chooser] + ' chọn mức độ', LEVELS.map(l => l.label), 'Vòng ' + r + '/' + total + ' — cả hai đội cùng đua!', chooser);
        sh.setActive(-1); await round(r, lv);
      }
      if (sh.dead) return;
      if (sh.scores[0] === sh.scores[1]) { sh.toast('Hòa! Thêm vòng Khó phân định', 1800); await sh.sleep(1800); if (sh.dead) return; await round(total + 1, 2); }
      if (!sh.dead) sh.result({ scores: sh.scores, stats: stats.map(s => ({ right: s.right, wrong: s.wrong, avg: s.right ? s.t / s.right : 0 })), wrong: [...wrongWords.values()] });
    })();
  }
});
})();
