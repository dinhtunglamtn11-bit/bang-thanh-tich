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

## Chia đôi màn hình (2 bạn ngồi hai đầu tablet)

Bật trong **Game → Cài đặt chung** (mặc định bật). Với các game đua (Đảo chữ, Nghe, đua nhanh trong Đấu trường) mỗi bạn có một nửa màn hình, nửa trên xoay ngược 180°. Game theo lượt (Ô chữ, Đấu trường) xoay hộp nhập/câu hỏi về phía đội đang chơi.

## Chia mức dễ / vừa / khó khi nhập câu hỏi

- Dòng chia mức, áp dụng cho các câu bên dưới đến khi gặp dòng chia mức khác hoặc `@hết`: `== DỄ ==`, `## Vừa`, `[KHÓ]`, `--- Khó ---`, `@dễ`.
- Ghi mức ngay ở câu: `Câu D3:` (D/V/K), `Câu 3 [khó]:`, `Câu 3 (dễ):`.
- Hoặc dòng `Độ khó: Dễ/Vừa/Khó` trong từng câu (ưu tiên cao nhất).

## Đấu trường

Bản đồ có ngã rẽ (đường trên an toàn, đường giữa ngắn nhiều bẫy, đường dưới nhiều hộp kỹ năng), cầu nối giữa các đường và cổng dịch chuyển 🌀. Ô ❓ cho thẻ kỹ năng; thẻ được **giữ lại**, dùng ngay đầu lượt (Đóng băng, Xúc xắc đôi, Giày bay, Nam châm) hoặc lúc trả lời (50/50, Đổi câu) hoặc khi bị tấn công (Khiên).
