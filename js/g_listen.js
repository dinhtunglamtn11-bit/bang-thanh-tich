/* ===== GAME 5: ĐUA NGHE VÀ CHỌN ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h;
NS.games = NS.games || [];

NS.games.push({
  id: 'listen', name: 'Đua nghe và chọn', icon: '🎧', desc: 'Máy đọc một từ tiếng Anh. Hai đội đua chọn đáp án đúng trước! (mỗi bạn một nửa màn hình)',
  options: [
    { key: 'mode', label: 'Kiểu câu hỏi', type: 'select', choices: [['meaning', 'Nghe → chọn nghĩa'], ['spell', 'Nghe → chọn cách viết'], ['mix', 'Xen kẽ cả hai']], def: 'mix' },
    { key: 'target', label: 'Điểm để thắng', type: 'select', choices: [[6, '6'], [10, '10'], [15, '15'], [25, '25']], def: 10 },
    { key: 'rounds', label: 'Số vòng tối đa', type: 'select', choices: [[8, '8'], [12, '12'], [16, '16'], [24, '24']], def: 12 },
    { key: 'qtime', label: 'Thời gian mỗi câu', type: 'select', choices: [[10, '10 giây'], [15, '15 giây'], [20, '20 giây'], [30, '30 giây'], [60, '60 giây'], [0, 'Không giới hạn']], def: 20 },
    { key: 'replays', label: 'Số lần nghe lại', type: 'select', choices: [[0, 'Không cho nghe lại'], [1, '1 lần'], [2, '2 lần'], [5, '5 lần']], def: 2 },
    { key: 'quick', label: 'Thưởng +1 nếu bấm trong 2 giây sau khi đọc xong', type: 'toggle', def: true },
    { key: 'penalty', label: 'Trả lời sai bị −1 điểm', type: 'toggle', def: true },
    { key: 'oneTry', label: 'Mỗi đội chỉ được chọn 1 lần mỗi câu (tắt = chọn sai vẫn được chọn lại)', type: 'toggle', def: true },
    { key: 'showStem', label: 'Hiện chữ câu hỏi trên màn hình (tắt = chỉ nghe)', type: 'toggle', def: true }
  ],
  start(ctx) {
    const o = ctx.opt, sh = NS.shell(ctx.root, { title: '🎧 Nghe & chọn', onRestart: ctx.restart, onExit: ctx.exit });
    const names = NS.cfg.teams, target = +o.target, total = +o.rounds, qsec = +o.qtime, maxReplay = +o.replays;
    const stats = [{ right: 0, wrong: 0, t: 0 }, { right: 0, wrong: 0, t: 0 }], wrongWords = new Map();
    if (!NS.hasTTS() || !NS.enVoice()) {
      sh.toast('⚠ Máy chưa có giọng đọc tiếng Anh. Hãy cài giọng en-US trong cài đặt thiết bị.', 4000);
    }

    function round(num) {
      return new Promise(resolve => {
        const d = o.mode === 'mix' ? (num % 2 ? 'en2vi' : 'spell') : o.mode === 'meaning' ? 'en2vi' : 'spell';
        const q = NS.nextMC({ listen: true, dir: d, level: d === 'spell' ? 3 : NS.cfg.level, phrases: false });
        if (!q) { sh.plainView().append(h('div', { class: 'gdlg' }, h('h2', {}, 'Chưa đủ từ vựng'), h('p', {}, 'Cần ít nhất 4 từ khác nghĩa nhau.'))); return resolve(); }
        if (!q.hand) { q.stem = d === 'spell' ? 'Nghe và chọn từ viết đúng.' : 'Nghe và chọn nghĩa đúng.'; q.sub = ''; }
        const word = q.word, say = q.say || (word && word.text) || '';
        const split = sh.split, V = split ? sh.splitView() : null, plain = split ? null : sh.plainView();
        sh.setInfo('Vòng ' + num + '/' + total);
        let left = maxReplay, done = false, tEnd = performance.now(), out = [false, false], locked = [false, false], tStart = performance.now();
        const status = h('div', { class: 'lstatus' }, '🔊');
        const bar = h('div', { class: 'tbar' }, h('i', {}));
        const replayBtns = [], slowBtns = [];
        const say1 = (rate, count) => {
          if (done) return;
          if (count) { if (left <= 0) return; left--; replayBtns.forEach(b => { b.textContent = '🔊 Nghe lại (' + left + ')'; b.classList.toggle('locked', left <= 0); }); slowBtns.forEach(b => b.classList.toggle('locked', left <= 0)); }
          status.classList.add('speaking'); return NS.speak(say, { rate }).then(() => { tEnd = performance.now(); status.classList.remove('speaking'); });
        };
        const mkBtns = () => {
          const r = h('button', { type: 'button', class: maxReplay <= 0 ? 'locked' : '' }, '🔊 Nghe lại (' + left + ')'), s = h('button', { type: 'button', class: maxReplay <= 0 ? 'locked' : '' }, '🐢 Chậm');
          NS.tap(r, () => say1(0.9, true)); NS.tap(s, () => say1(0.6, true)); replayBtns.push(r); slowBtns.push(s);
          return h('div', { class: 'lbtns' }, r, s);
        };
        const stemText = o.showStem ? q.stem : '🎧 Nghe và chọn đáp án đúng';
        const panels = [0, 1].map(team => {
          const btns = q.options.map((t, i) => {
            const b = h('button', { class: 'lopt', type: 'button' }, t);
            NS.tap(b, () => answer(team, i, b));
            return b;
          });
          const p = h('div', { class: 'lpanel t' + team }, h('div', { class: 'aname' }, NS.TEAM_ICON[team] + ' ' + names[team] + '  ', sh.tag(team)),
            split ? h('div', { class: 'lstem' }, stemText) : null, split ? mkBtns() : null, h('div', { class: 'lopts' }, btns));
          return { p, btns };
        });
        if (split) {
          panels.forEach((pp, t) => V.halves[t].append(pp.p));
          V.mid.append(status, bar);
        } else {
          const center = h('div', { class: 'lcenter' }, status, h('div', { class: 'lstem' }, stemText), mkBtns(), bar);
          plain.append(center, h('div', { class: 'lpanels' }, panels[0].p, panels[1].p));
        }
        const tm = NS.timer(qsec * 1000, l => { bar.firstChild.style.width = (l / (qsec * 1000) * 100) + '%'; bar.classList.toggle('low', l < 4000); }, () => finish(-1));
        function answer(team, i, btn) {
          if (done || out[team] || locked[team] || sh.paused) return;
          const dt = performance.now() - tStart;
          if (i === q.answer) {
            done = true; tm.stop(); btn.classList.add('right');
            const quick = o.quick && performance.now() - tEnd <= 2000, pts = 1 + (quick ? 1 : 0);
            stats[team].right++; stats[team].t += dt / 1000; sh.addScore(team, pts); NS.sfx('ok'); NS.vibe(40);
            sh.toast(NS.TEAM_ICON[team] + ' ' + names[team] + ' +' + pts + (quick ? ' (nhanh +1)' : ''), 1500);
            finish(team);
          } else {
            btn.classList.add('wrong'); btn.classList.add('locked'); stats[team].wrong++; NS.sfx('bad'); NS.vibe(80);
            if (o.penalty) sh.addScore(team, -1, 0);
            if (word) { NS.markWrong(word); wrongWords.set(word.id, word); }
            if (o.oneTry) { out[team] = true; locked[team] = true; panels[team].p.classList.add('locked'); }
            else { panels[team].p.classList.add('shake'); setTimeout(() => panels[team].p.classList.remove('shake'), 450); }
            if (out[0] && out[1]) finish(-1);
          }
        }
        async function finish(team) {
          if (finish.ran) return; finish.ran = true;
          done = true; tm.stop();
          if (team < 0) { NS.sfx('bad'); if (word) { NS.markWrong(word); wrongWords.set(word.id, word); } }
          /* chỉ hiện đáp án đúng ở phía người thắng; khi không ai đúng thì viền xanh ở cả hai phía */
          panels.forEach((pp, t) => { pp.p.classList.remove('locked'); pp.btns.forEach((b, i) => { b.classList.add('locked'); if (i === q.answer && team < 0) b.classList.add('reveal'); }); });
          const ans = () => h('div', { class: 'aans' }, '✅ ' + (word ? word.text + (word.ipa ? '  /' + word.ipa + '/' : '') + ' — ' + word.meaning : q.options[q.answer]));
          if (split) V.halves.forEach(hv => hv.append(ans())); else plain.append(ans());
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
