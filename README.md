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

## Đấu trường: 6 bản đồ, ô và luật mới

Chọn bản đồ trước khi chơi (hoặc "Ngẫu nhiên"): 🏰 Vương quốc ba ngả, 🏝️ Đảo Kho Báu (điểm thưởng cộng thêm), 🌋 Núi Lửa (dung nham dâng mỗi 2 vòng, nhiều cột mốc), ❄️ Băng Địa (băng làm trượt thêm 1 ô, đường xoắn ốc với lối tắt), 🪞 Mê Cung Gương (nhiều ngã rẽ, 3 cổng gương, sự kiện mỗi 2 vòng), 🏙️ Thành Phố Tốc Độ (điểm x2, thời gian 60%).
Ô mới: 🚀 tên lửa, ⚔️ đấu tay đôi, 🛒 cửa hàng, 🚩 cột mốc (không bị lùi qua), 🎡 vòng quay, 🌋 dung nham.
Bảng giải thích đầy đủ ở nút **📖 Hướng dẫn ký hiệu** (menu Game, hộp chọn game, nút "📖 Ký hiệu" trên bản đồ, menu tạm dừng).

## Ba mức câu hỏi trong Đấu trường

- 🟢 **Dễ:** nhìn nghĩa tiếng Việt, GÕ từ tiếng Anh bằng bàn phím trong game (có thể dùng câu `dien-tu` soạn tay).
- 🟡 **Vừa:** NGHE phát âm, chọn nghĩa tiếng Việt.
- 🔴 **Khó:** ĐỌC mô tả bằng tiếng Anh, chọn từ đúng. Định nghĩa nằm ở vế thứ ba của dòng từ vựng: `từ /phiên âm/ :: nghĩa :: định nghĩa tiếng Anh`.

## Nhạc nền

Chép mp3 vào `music/`, ghi tên vào `music/list.txt` (xem ví dụ trong file), đẩy lên GitHub. Bật/tắt và chỉnh âm lượng ở **🎵 Nhạc nền** trong menu Game hoặc menu tạm dừng. Nhạc tự nhỏ đi khi máy đọc từ.

## Lật thẻ: thẻ đặc biệt

Tùy chọn "Thẻ đặc biệt": *Cổ điển* (⭐ cặp sao +3, 💣 bom) hoặc *Nhiều thẻ*: ⚡ lượt thêm, 🧊 đóng băng đối thủ, 👁 soi bài, 🎁 quà +2, 🔀 xáo bài, 💣 bom.

## Thanh tiến độ theo tháng và ngày

Tab Quá trình học có thêm thanh 12 tháng của năm, dải từng ngày trong tháng đang chọn (ngày có buổi học được tô và ghi điểm từng bạn, ngày hôm nay có viền vàng) và thanh điểm của tháng với vạch "hôm nay".


## Ô chữ bí mật: hiện toàn bộ câu

Tùy chọn "Hiện TOÀN BỘ các câu trên một màn hình" (mặc định bật): ô chữ, chữ và khoảng cách tự thu nhỏ cho vừa chiều cao màn hình, học sinh không phải cuộn lên xuống.

## Game "Ghép chữ hai đầu" 🔗

1. **Chuẩn bị:** nhập tên hai bạn, chọn ai **đi trước** (chọn chữ cái ĐẦU) và ai **đi sau** (chọn chữ cái CUỐI). Số câu chọn trước khi vào (5 đến 20).
2. **Chọn kín (chia đôi màn hình):** mỗi bạn chọn chữ cái của mình cho từng câu, bấm Chốt; cả hai chốt xong thì tự chuyển sang câu kế tiếp, cứ thế đến hết số câu. Chữ vừa chọn chỉ hiện một chấm rất nhỏ (không đổi màu) để bạn kia không nhìn được.
3. **Bảng chung (không chia đôi nữa):** hiện các cặp chữ của tất cả câu kèm hình người đã chọn. Bấm vào BẤT KỲ ô nào để giải câu đó (không cần theo thứ tự), giải xong quay lại bảng; ví dụ N … N thì gõ NOON. Ô của câu ghi tên người ghi điểm. Khi giải một câu chỉ có MỘT bàn phím chung: gõ phần giữa rồi bấm "Gửi để duyệt"; app tự đối chiếu với các từ đã dùng (lặp thì bị từ chối, nói rõ lặp ở câu nào), nếu chưa lặp thì giáo viên bấm ✔ cho bạn A hoặc bạn B ghi điểm, hoặc ✘ không hợp lệ. Bảng hiện to, chỉnh cỡ bằng tùy chọn trước khi chơi hoặc nút 🔍− / 🔍+ trên bảng; nút "Kết thúc game" để dừng sớm.
4. Mặc định **giáo viên quyết định từ hợp lệ** (hộp ✔ / ✘, từ không cần có trong kho từ vựng); có thể chuyển sang tự động chỉ nhận từ trong kho. Từ đã dùng không được lặp lại ở các câu sau. Tùy chọn khác: thời gian chọn chữ cái, thời gian nhập từ, cách tính điểm, đổi vai sau mỗi câu, cụm từ, trừ điểm khi sai.

## Ô chữ bí mật: không đổi lượt

Bấm một hàng → tick tên người trả lời → nhập đáp án. Đúng thì tự cộng điểm cho người đó; sai thì không đổi lượt, bấm lại câu để thử tiếp (có thể chọn người khác, tùy chọn trừ điểm khi sai). Đoán từ khóa cũng chọn người trả lời trước.

## Nút Quay lại xuyên suốt app

Nút Back của tablet / điện thoại / trình duyệt và nút "◀ Quay lại" trên màn hình đều lùi một bước: đóng hộp thoại đang mở, từ Game về bảng thành tích, và trong lúc chơi game thì mở menu tạm dừng (Back lần nữa thì chơi tiếp, chọn "Về menu" để thoát). Màn hình kết quả: Back về menu. Mã nằm ở `js/nav.js`.
