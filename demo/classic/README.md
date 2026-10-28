# Snake Adventure — Classic & The Hunt demo

Demo trong repository, có màn chọn tên/chơi khách và hai chế độ Classic/The Hunt. Giữ các sprite rắn hiện có trong `assets/`; bản đồ và con mồi Hunt vẽ bằng Canvas. Không có database hoặc migration.

## Mở demo

Mở `index.html` trực tiếp bằng trình duyệt để chơi **khách** ở cả hai chế độ, không cần backend. Nếu muốn nhập tên và dùng API, chạy qua server dưới đây.

Sau khi cài dependency của `backend` (`cd backend` rồi `pnpm install --frozen-lockfile` hoặc `npm install`), chạy từ thư mục gốc dự án:

```powershell
node demo/classic/server.mjs
```

Truy cập `http://127.0.0.1:4173`. Dừng server bằng Ctrl+C. Đổi cổng bằng biến `DEMO_PORT` nếu 4173 đang được sử dụng. Server này phục vụ cả giao diện và `/api/v1`, không cần mở thêm backend ở cổng 3000. API demo có dữ liệu bộ nhớ riêng, mất khi restart. Cookie demo là `snake_demo_session`, tách khỏi cookie `snake_session` của backend độc lập.

## Chọn người chơi và chế độ

- Chọn Classic hoặc The Hunt trước khi vào sân.
- Nhập tên và bấm **Chơi với tên này**: gọi `/api/v1/auth/player`, không cần mật khẩu.
- **Chơi với tư cách khách**: thu hồi phiên cũ khi có kết nối, không gửi request lưu điểm. Khi mở trực tiếp file, khách vẫn chơi được mà không gọi API.
- **Đổi tên / chế độ** tạm dừng lượt hiện tại. Có thể quay lại, hoặc chọn lại để bắt đầu lượt mới.
- Tên là bí danh công khai: nhập lại cùng tên dùng cùng hồ sơ; không xác minh danh tính.
- Kết thúc lượt với tên sẽ kiểm tra quyền lưu và cấu hình điểm. Nếu đã cấu hình, gửi kết quả lên API và hiển thị điều kiện vào Top 10. Khách không được lưu điểm.

## Luật Classic

- Bàn 24 × 24 ô. Một hàng tường bao quanh, phần sân chơi bên trong là 22 × 22 ô.
- Rắn ban đầu dài 3 đốt, đi sang phải, tốc độ cố định 8 ô/giây.
- Mồi đầu tiên ở phía trước để dễ thử tăng trưởng. Ăn mồi tăng 1 đốt; các mồi sau sinh ngẫu nhiên trong ô trống.
- Chạm tường hoặc thân rắn: Game Over. Đi vào ô đuôi đang rời đi vẫn hợp lệ.
- Không quay ngược 180°. Hàng đợi giữ tối đa 2 lần đổi hướng.
- Phủ kín sân: hoàn thành.
- Chuyển tab hoặc mất focus cửa sổ: tự tạm dừng, người chơi chủ động tiếp tục.
- Các thông số trên phục vụ demo, chưa phải cấu hình Classic chính thức.

Điều khiển: mũi tên/WASD hoặc các nút hướng. Space/P/Esc để tạm dừng và tiếp tục. Có nút Chơi lại. Các phím điều khiển không can thiệp khi đang nhập tên.

## The Hunt

Xem [luật và cấu trúc The Hunt](../hunt/README.md). Màn 1: 20 chuột. Màn 2: 5 chuột + 15 ếch. Chuột đi 1 ô mỗi 1,5 giây; ếch nhảy 2 ô mỗi 3 giây. Cả hai tránh xa đầu rắn và không đi xuyên tường/thân.

Rắn luôn dài 3 đốt trong Hunt hiện tại. Bắt hết mồi chỉ mở cổng; phải vào cổng mới hoàn thành màn và dừng giờ. Mỗi màn có 1.000 điểm thời gian, giữ nguyên trong 60 giây đầu rồi trừ 10 điểm mỗi giây hoàn chỉnh, dừng ở 0. Hết điểm thời gian vẫn được chơi tiếp. HUD hiển thị quota từng loại, điểm và thời gian vượt mốc; va chạm khi cổng đã mở vẫn thua.

## Dành cho FE

- `engine.js`: logic Classic thuần JavaScript, không phụ thuộc DOM. Namespace `ClassicSnake` có `ClassicGame` và `DIRECTIONS`.
- `game.js`: vòng lặp thời gian, Canvas, bàn phím và cập nhật giao diện.
- `player-session.js`: API chọn tên/khách, khôi phục phiên, bảng xếp hạng và kiểm tra quyền lưu kết quả.
- `style.css`: giao diện đơn giản của demo.
- `server.mjs`: server demo tích hợp Backend API cùng origin; chỉ phục vụ các file demo cho phép và sprite hiện có.
- `engine.test.mjs`: kiểm thử luật bàn chơi và rắn.

Tường được xác định bằng `ClassicGame.isWall({ x, y })`: các ô có x/y bằng 0 hoặc 23 là tường. Renderer và va chạm dùng cùng quy tắc, tránh vẽ một bản đồ nhưng tính va chạm trên bản đồ khác.

Hunt đã có hệ số thật: chuột 100 điểm, ếch 150 điểm. Điểm mồi màn 1 là 2.000, màn 2 là 2.750; mỗi màn cộng thêm tối đa 1.000 điểm thời gian. Người chơi có tên được lưu điểm Hunt vào dữ liệu RAM của API, khách không được lưu. Classic vẫn chưa có hệ số và chặn lưu bằng `SCORING_NOT_CONFIGURED`.

Kiểm thử từ thư mục gốc:

```powershell
node --test demo/classic/engine.test.mjs demo/classic/player-session.test.mjs demo/classic/server.test.mjs demo/hunt/engine.test.mjs
```
