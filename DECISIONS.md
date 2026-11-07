# Quyết định thiết kế (khi đề bài chưa đủ chi tiết)

- **Công nghệ:** app là HTML/CSS/JS thuần (không build), nằm chung với bảng thành tích để chạy được ngay trên GitHub Pages và mở file trực tiếp. Không dùng React/Vite/TypeScript vì cả app đã là một trang tĩnh. Logic thuần (parser, bộ tạo ô chữ, luật đấu trường) được tách riêng để kiểm thử (`tests/run.html`, chạy bằng trình duyệt thay cho Vitest/Playwright vì máy chưa có Node).
- **Từ vựng:** đọc `data/vocab.txt` nếu có; nếu không thì dùng bộ từ mẫu trong `js/sample.js` (khoảng 100 từ). Bộ từ dán tay trong app được ưu tiên hơn file.
- **Hai đội = hai học sinh** trong bảng thành tích (tên mặc định lấy từ đó). Sau mỗi ván có nút cộng số câu đúng vào "câu từ trò chơi" của từng em (không vượt mức tối đa đã đặt).
- **Đua nghe (game 5):** mỗi đội chỉ được trả lời **một lần mỗi vòng**. Sai thì bị khóa nút đến hết vòng và bị −1 điểm. Hai đội cùng sai thì kết thúc vòng.
- **Lật thẻ (game 4):** có thẻ bom thì bảng chỉ có 15, 19 hoặc 29 thẻ (đủ chỗ cho 1 thẻ bom). Hòa điểm thì xét số cặp ghép.
- **Ô chữ (game 2):** "cột ô cam" là vị trí chữ cam trong từ (từ căn lề trái). Chưa làm "Khóa hàng" (tùy chọn). Sai khi đoán từ khóa bị −5 điểm.
- **Đấu trường (game 3):** bản đồ đồ thị cố định về hình dạng (ô chức năng xếp ngẫu nhiên theo từng đường), không còn ô ẩn. Lùi đi theo đúng đường đã đi. Hai đội luân phiên ai đi trước mỗi vòng. Thẻ kỹ năng giữ được tối đa 3 (chỉnh trong tùy chọn). Mô phỏng 200 ván bằng bot cho tỉ lệ thắng cân bằng.
- **Cú pháp 3A:** dạng `sap-xep-cau` được đọc, kiểm tra, xuất lại nhưng chưa có game dùng riêng (Đảo chữ chỉ dùng `sap-xep-chu`). Câu `dien-tu` được lưu và dùng trong Đấu trường chỉ khi có `Từ:` để tự dựng lựa chọn.
- **PWA:** có `manifest.webmanifest` và `sw.js` (ưu tiên mạng, rơi về bộ nhớ đệm khi offline). Font VT323 tải từ Google Fonts nên lần đầu cần mạng.
- **Chưa có âm thanh thu sẵn:** để trống `audio/`; bật "Ưu tiên file âm thanh thu sẵn" trong Cài đặt để dùng `audio/<id-từ>.mp3`.
