# Bảng thành tích + Game từ vựng (pixel)

Một app web tĩnh, mở được bằng trình duyệt hoặc GitHub Pages, gồm hai mục:

- **Quá trình học:** thanh tiến độ của hai học sinh, các mốc phần thưởng, đăng nhập Google để đồng bộ.
- **Game:** 5 trò chơi từ vựng tiếng Anh cho hai đội thi đấu trên một tablet: Lật thẻ ghép cặp, Đảo chữ cái, Đua nghe và chọn, Ô chữ bí mật, Đấu trường từ vựng.

## Chạy

- Mở `index.html` bằng trình duyệt (một số tính năng như đăng nhập Google, service worker cần chạy qua http/https).
- Xem thử cục bộ: `powershell -ExecutionPolicy Bypass -File serve.ps1` rồi mở http://localhost:8080.
- Trên tablet: dùng link GitHub Pages, chọn "Thêm vào màn hình chính".

## Thêm từ vựng

Đặt file `data/vocab.txt` cạnh `index.html` (định dạng: tiêu đề `## 1. Tên chủ đề`, rồi một khối ``` chứa các dòng `từ /phiên âm/ :: nghĩa`), hoặc vào **Game → Từ vựng** và dán nội dung. Chưa có file thì app dùng bộ từ mẫu.

## Soạn câu hỏi / ô chữ / bộ thẻ

**Game → Soạn câu hỏi**: dán văn bản theo cú pháp (xem `tests/fixtures/questions.sample.txt` để có đủ ví dụ). Nút "Kiểm tra" báo lỗi kèm số dòng; chỉ các khối hợp lệ được nhập. Ô chữ tự tạo có thể xuất ra văn bản (nút "Chép văn bản") và nhập lại.

## Tạo ô chữ

Chọn game **Ô chữ bí mật**, nhập từ khóa (ví dụ `SKIPPING ROPE`). Bộ tạo chọn từ đơn trong kho, không số nhiều, không tên riêng, không chứa `in/on/at/the`, không lặp lại từ đã dùng. Có nút xem đáp án và xuất ảnh PNG.

## Giọng đọc

Game Nghe dùng giọng máy (`speechSynthesis`). Dùng nút **Thử giọng đọc** ở menu để kiểm tra. Có thể đặt file `audio/<id-từ>.mp3` rồi bật tùy chọn trong Cài đặt.

## Kiểm thử

Mở `tests/run.html` qua http (ví dụ chạy `serve.ps1`) — trang sẽ in kết quả và đặt tiêu đề `PASS n` hoặc `FAIL n`.

Xem thêm `DECISIONS.md` cho các quyết định thiết kế.
