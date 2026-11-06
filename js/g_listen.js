/* ===== GAME 5: ĐUA NGHE VÀ CHỌN ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

NS.games.push({
  id: 'listen', name: 'Đua nghe và chọn', icon: '🎧', desc: 'Máy đọc một từ tiếng Anh. Hai đội đua chọn đáp án đúng trước!',
  options: [
    { key: 'mode', label: 'Kiểu câu hỏi', type: 'select', choices: [['meaning', 'Nghe → chọn nghĩa'], ['spell', 'Nghe → chọn cách viết'], ['mix', 'Xen kẽ cả hai']], def: 'mix' },
    { key: 'target', label: 'Điểm để thắng', type: 'select', choices: [[6, '6'], [10, '10'], [15, '15']], def: 10 },
    { key: 'rounds', label: 'Số vòng tối đa', type: 'select', choices: [[8, '8'], [12, '12'], [16, '16']], def: 12 }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🎧 Nghe & chọn', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, target = +o.target, total = +o.rounds;
    const stats = [{ right: 0, wrong: 0, t: 0 }, { right: 0, wrong: 0, t: 0 }], wrongWords = new Map();
    if (!NS.hasTTS() || !NS.enVoice()) {
      sh.toast('⚠ Máy chưa có giọng đọc tiếng Anh. Hãy cài giọng en-US trong cài đặt thiết bị.', 4000);
    }

    function round(num) {
      return new Promise(resolve => {
        const d = o.mode === 'mix' ? (num % 2 ? 'en2vi' : 'spell') : o.mode === 'meaning' ? 'en2vi' : 'spell';
        const q = NS.nextMC({ listen: true, dir: d, level: d === 'spell' ? 3 : NS.cfg.level, phrases: false });
        if (!q) { sh.area.innerHTML = ''; sh.area.append(h('div', { class: 'gdlg' }, h('h2', {}, 'Chưa đủ từ vựng'), h('p', {}, 'Cần ít nhất 4 từ khác nghĩa nhau.'))); return resolve(); }
        if (!q.hand) { q.stem = d === 'spell' ? 'Nghe và chọn từ viết đúng.' : 'Nghe và chọn nghĩa đúng.'; q.sub = ''; }
        const word = q.word, say = q.say || (word && word.text) || '';
        sh.area.innerHTML = '';
        sh.setInfo('Vòng ' + num + '/' + total);
        let left = 2, done = false, tEnd = performance.now(), out = [false, false], locked = [false, false], tStart = performance.now();
        const status = h('div', { class: 'lstatus' }, '🔊');
        const replay = h('button', { type: 'button' }, '🔊 Nghe lại (2)'), slow = h('button', { type: 'button' }, '🐢 Chậm');
        const say1 = (rate, count) => { if (count) { if (left <= 0) return; left--; replay.textContent = '🔊 Nghe lại (' + left + ')'; } status.classList.add('speaking'); return NS.speak(say, { rate }).then(() => { tEnd = performance.now(); status.classList.remove('speaking'); }); };
        NS.tap(replay, () => say1(0.9, true)); NS.tap(slow, () => say1(0.6, true));
        const center = h('div', { class: 'lcenter' }, status, h('div', { class: 'lstem' }, q.stem), h('div', { class: 'lbtns' }, replay, slow));
        const grid = h('div', { class: 'lpanels' });
        const panels = [0, 1].map(team => {
          const btns = q.options.map((t, i) => {
            const b = h('button', { class: 'lopt', type: 'button' }, t);
            NS.tap(b, () => answer(team, i, b));
            return b;
          });
          const p = h('div', { class: 'lpanel t' + team }, h('div', { class: 'aname' }, NS.TEAM_ICON[team] + ' ' + names[team]), h('div', { class: 'lopts' }, btns));
          grid.append(p); return { p, btns };
        });
        sh.area.append(center, grid);
        const tm = NS.timer(20000, l => { if (l <= 0) return; }, () => finish(-1));
        function answer(team, i, btn) {
          if (done || out[team] || locked[team] || sh.paused) return;
          const dt = performance.now() - tStart;
          if (i === q.answer) {
            done = true; tm.stop(); btn.classList.add('right');
            const quick = performance.now() - tEnd <= 2000, pts = 1 + (quick ? 1 : 0);
            stats[team].right++; stats[team].t += dt / 1000; sh.addScore(team, pts); NS.sfx('ok'); NS.vibe(40);
            sh.toast(NS.TEAM_ICON[team] + ' ' + names[team] + ' +' + pts + (quick ? ' (nhanh +1)' : ''), 1500);
            finish(team);
          } else {
            btn.classList.add('wrong'); out[team] = true; locked[team] = true; stats[team].wrong++; NS.sfx('bad'); NS.vibe(80);
            sh.addScore(team, -1, 0);
            if (word) { NS.markWrong(word); wrongWords.set(word.id, word); }
            panels[team].p.classList.add('locked', 'shake'); setTimeout(() => panels[team].p.classList.remove('shake'), 450);
            if (out[0] && out[1]) { done = true; tm.stop(); finish(-1); }
          }
        }
        async function finish(team) {
          done = true; tm.stop();
          if (team < 0) { NS.sfx('bad'); if (word) { NS.markWrong(word); wrongWords.set(word.id, word); } }
          panels.forEach(pp => pp.btns.forEach((b, i) => { if (i === q.answer) b.classList.add('right'); b.classList.add('locked'); }));
          sh.area.append(h('div', { class: 'aans' }, '✅ ' + (word ? word.text + (word.ipa ? '  /' + word.ipa + '/' : '') + ' — ' + word.meaning : q.options[q.answer])));
          await NS.speak(say, { rate: .85 }); await sh.sleep(1600); resolve();
        }
        say1(0.9, false);
      });
    }
    (async () => {
      for (let r = 1; r <= total && !sh.dead; r++) {
        await round(r);
        if (sh.scores[0] >= target || sh.scores[1] >= target) break;
      }
      if (!sh.dead) sh.result({ scores: sh.scores, stats: stats.map(s => ({ right: s.right, wrong: s.wrong, avg: s.right ? s.t / s.right : 0 })), wrong: [...wrongWords.values()] });
    })();
  }
});
})();
