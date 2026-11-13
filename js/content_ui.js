/* ===== Màn hình "Soạn nội dung" theo từng game ===== */
(function () {
'use strict';
const NS = window.PG, h = NS.h, C = NS.content;
let lastTab = 'memory';

NS.contentDialog = function (startId) {
  let id = (startId && C.defs[startId]) ? startId : lastTab, mode = 'replace';
  const box = h('div', { class: 'gform cdlg' });
  const tabs = h('div', { class: 'ctabs' });
  const render = () => {
    lastTab = id; const d = C.defs[id]; box.innerHTML = ''; tabs.innerHTML = '';
    Object.keys(C.defs).forEach(k => { const n = C.items(k).length; tabs.append(h('button', { type: 'button', class: 'ctab' + (k === id ? ' act' : ''), onclick: () => { id = k; mode = 'replace'; render(); } }, C.defs[k].icon + ' ' + C.defs[k].name + (n ? ' (' + n + ')' : ''))); });
    box.append(tabs, h('h3', { class: 'ctitle' }, d.icon + ' ' + d.name));
    if (!d.parse) { box.append(h('div', { class: 'cinfo' }, d.syntax.map(s => h('p', {}, s)))); return; }
    /* cú pháp + ví dụ */
    box.append(h('div', { class: 'cinfo' }, h('b', {}, 'Cú pháp:'), h('ul', {}, d.syntax.map(s => h('li', {}, s)))));
    const ta = h('textarea', { class: 'bigta', spellcheck: 'false', placeholder: 'Dán hoặc gõ nội dung ở đây…' }); ta.value = C.text(id);
    const rep = h('div', { class: 'report' }), saved = h('div', { class: 'gmsg' });
    const showSaved = () => { const n = C.items(id).length; saved.textContent = '💾 Đang lưu: ' + n + ' ' + d.unit + (C.data[id].errors.length ? ' (có ' + C.data[id].errors.length + ' dòng lỗi bị bỏ qua)' : '') + (n ? '' : ' — chưa có, game đang dùng kho từ vựng'); };
    showSaved();
    const check = () => {
      const r = d.parse(ta.value); rep.innerHTML = '';
      rep.append(h('div', { class: 'rsum' }, '📊 ' + r.items.length + ' ' + d.unit + ' hợp lệ · ❌ ' + r.errors.length + ' lỗi định dạng · ⚠ ' + r.warnings.length + ' cảnh báo  (chỉ kiểm tra định dạng, không đối chiếu kho từ vựng)'));
      const item = (e, cls) => h('button', { class: 'ritem ' + cls, type: 'button', onclick: () => { const ls = ta.value.split(/\r\n|\r|\n/); let pos = 0; for (let i = 0; i < e.line - 1; i++) pos += ls[i].length + 1; ta.focus(); ta.setSelectionRange(pos, pos + (ls[e.line - 1] || '').length); } },
        h('b', {}, 'dòng ' + e.line), ' ' + e.msg, e.excerpt ? h('code', {}, e.excerpt) : null, e.hint ? h('i', {}, '💡 ' + e.hint) : null);
      r.errors.slice(0, 50).forEach(e => rep.append(item(e, 'err'))); r.warnings.slice(0, 30).forEach(e => rep.append(item(e, 'wrn')));
      return r;
    };
    const modeSel = h('select', {}, [['replace', 'Thay toàn bộ nội dung đang lưu'], ['append', 'NỐI THÊM vào cuối nội dung đang lưu']].map(([v, t]) => h('option', { value: v }, t)));
    modeSel.value = mode; modeSel.addEventListener('change', () => { mode = modeSel.value; ta.value = mode === 'append' ? '' : C.text(id); rep.innerHTML = ''; });
    const save = () => {
      const r = check(), base = C.text(id);
      const text = mode === 'append' && base.trim() ? base.replace(/\s+$/, '') + '\n\n' + ta.value : ta.value;
      C.save(id, text); showSaved();
      rep.prepend(h('div', { class: 'rsum ok' }, '✔ Đã ' + (mode === 'append' ? 'nối thêm ' : 'lưu ') + r.items.length + ' ' + d.unit + '. ' + (r.errors.length ? 'Các dòng lỗi bị bỏ qua. ' : '') + 'Mở game "' + d.name + '" để chơi bằng nội dung này.'));
      if (mode === 'append') ta.value = '';
    };
    const promptTa = h('textarea', { class: 'bigta small', readonly: true, rows: 8 }); promptTa.value = d.prompt;
    const copyBtn = h('button', { class: 'green', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(d.prompt); copyBtn.textContent = '✔ Đã chép prompt'; } catch (e) { promptTa.select(); copyBtn.textContent = '⬆ Hãy bấm Ctrl+C (đã chọn sẵn)'; } setTimeout(() => { copyBtn.textContent = '📋 Chép prompt cho ' + d.name; }, 2500); } }, '📋 Chép prompt cho ' + d.name);
    const usage = h('label', { class: 'tg' }); const cb = h('input', { type: 'checkbox' }); cb.checked = C.on(id); cb.addEventListener('change', () => C.setOn(id, cb.checked)); usage.append(cb, ' Dùng nội dung này khi chơi game');
    box.append(h('details', { class: 'cprompt' }, h('summary', {}, '🤖 Prompt riêng cho game này (copy dán vào ChatGPT / Claude / Gemini)'), copyBtn, promptTa),
      h('div', { class: 'rbtns' }, h('button', { class: 'small', type: 'button', onclick: () => { ta.value = d.example; mode = 'replace'; modeSel.value = 'replace'; check(); } }, '📥 Chèn ví dụ mẫu')),
      h('label', {}, 'Chế độ nhập'), modeSel, saved, ta, rep,
      h('div', { class: 'rbtns' }, h('button', { type: 'button', onclick: check }, '🔍 Kiểm tra định dạng'), h('button', { class: 'green', type: 'button', onclick: save }, '✔ Lưu và dùng cho game'),
        h('button', { class: 'small red', type: 'button', onclick: () => { if (confirm('Xóa toàn bộ nội dung đã lưu của game này?')) { C.save(id, ''); ta.value = ''; showSaved(); rep.innerHTML = ''; } } }, 'Xóa hết')), usage);
  };
  render();
  const m = NS.modal('📝 Soạn nội dung cho từng game', box, NS.renderMenu);
  return m;
};
})();
