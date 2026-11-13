/* ===== Nút Quay lại xuyên suốt app: dùng lịch sử trình duyệt (nút Back của tablet / điện thoại / trình duyệt) =====
   Mỗi "lớp" (hộp thoại, màn hình chơi, tab Game...) đăng ký một hàm onBack. Bấm Back thì lớp trên cùng được đóng/lùi. */
(function () {
'use strict';
const stack = []; let ignore = 0, uid = 0;
const NAV = {
  /* keep = true: lớp không bị gỡ khi Back, hàm onBack tự xử lý (ví dụ mở menu tạm dừng trong game) */
  push(onBack, keep) { const e = { id: ++uid, onBack, keep: !!keep, pushed: false }; try { history.pushState({ nav: e.id }, ''); e.pushed = true; } catch (x) {} stack.push(e); return e.id; },
  /* đóng lớp bằng nút trên màn hình: đồng bộ lại lịch sử */
  done(id) { const i = stack.findIndex(x => x.id === id); if (i < 0) return; const e = stack[i], top = i === stack.length - 1; stack.splice(i, 1); if (top && e.pushed && history.state && history.state.nav === e.id) { ignore++; try { history.back(); } catch (x) { ignore--; } } },
  get depth() { return stack.length; },
  root: null
};
window.addEventListener('popstate', () => {
  if (ignore > 0) { ignore--; return; }
  const top = stack[stack.length - 1];
  if (top) { if (top.keep) { try { history.pushState({ nav: top.id }, ''); } catch (x) {} top.onBack(); } else { stack.pop(); top.onBack(); } }
  else if (NAV.root) NAV.root();
});
window.NAV = NAV;
})();
