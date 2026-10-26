# Tài liệu đặc tả yêu cầu phần mềm (SRS) - Snake Adventure

11/10/2026

## 1. Giới thiệu

Tài liệu này đặc tả đầy đủ yêu cầu phần mềm của Snake Adventure, trò chơi Snake 2D chạy trên trình duyệt Web, làm căn cứ chung cho thiết kế, lập trình và kiểm thử.

| Thông tin | Nội dung |
| --- | --- |
| Tên dự án | Snake Adventure - Xây dựng và phát triển trò chơi Snake 2D trên nền tảng Web |
| Học phần | Bài tập lớn Chuyên đề Công nghệ thông tin, Khoa Công nghệ thông tin, Trường Đại học Thủy lợi |
| Giảng viên hướng dẫn | Hoàng Quốc Dũng |
| Nhóm thực hiện | Nhóm 17: Trần Bình Dương, Trần Vĩnh Bảo, Mạc Nguyễn Hoàng Anh |
| Phiên bản tài liệu | 1.0 (bản nháp) |
| Ngày lập | 24/09/2026 |
| Chuẩn tham chiếu | IEEE 830-1998 / ISO/IEC/IEEE 29148 (có điều chỉnh cho quy mô bài tập lớn) |

### 1.1. Mục đích

Tài liệu mô tả hệ thống làm gì, cho ai và theo quy tắc nào. Người đọc chính là các thành viên nhóm (thiết kế, lập trình, kiểm thử) và giảng viên hướng dẫn (đánh giá, nghiệm thu).

Mục tiêu của sản phẩm:

- Xây dựng trò chơi Web có giao diện trực quan, dễ sử dụng.
- Mô phỏng đầy đủ các cơ chế cơ bản của Snake: di chuyển, ăn mồi, tăng chiều dài, tính điểm, va chạm.
- Bổ sung chế độ Hunt Mode để đa dạng trải nghiệm.
- Áp dụng quy trình phân tích yêu cầu, thiết kế, lập trình và kiểm thử vào một sản phẩm cụ thể.
- Tạo nền tảng để nhóm mở rộng trò chơi trong tương lai.

### 1.2. Phạm vi

Sản phẩm chạy trực tiếp trên trình duyệt, người chơi không cần cài đặt phần mềm.

**Trong phạm vi:**

- Giao diện chính và các chức năng điều khiển trò chơi.
- Điều khiển Snake, thức ăn, tăng chiều dài, tính điểm, xử lý va chạm.
- Classic Mode và Hunt Mode (con mồi di chuyển tự động, nhiều loại như chuột, chim).
- Trạng thái Game Over và chơi lại.
- Đăng ký, đăng nhập, đăng xuất.
- Lưu điểm cao nhất của từng người chơi và Bảng xếp hạng top người chơi theo từng chế độ.

**Ngoài phạm vi (phiên bản 1.0):**

- Chế độ nhiều người chơi, chơi qua mạng theo thời gian thực.
- Ứng dụng di động bản địa (native) và điều khiển cảm ứng.
- Thanh toán, mua vật phẩm, quảng cáo.
- Khôi phục mật khẩu qua email, đăng nhập qua mạng xã hội.

### 1.3. Đối tượng sử dụng

| Vai trò | Mô tả | Quyền hạn |
| --- | --- | --- |
| Người chơi vãng lai (Guest) | Chơi ngay, không đăng nhập | Chơi mọi chế độ, xem Bảng xếp hạng; điểm không được lưu và không vào Bảng xếp hạng |
| Người chơi đã đăng ký (Registered User) | Có tài khoản và đã đăng nhập | Toàn bộ quyền của Guest, cộng thêm lưu điểm cao nhất cá nhân và ghi danh vào Bảng xếp hạng |

### 1.4. Thuật ngữ và viết tắt

| Thuật ngữ | Giải thích |
| --- | --- |
| Authentication | Cơ chế xác thực người dùng khi đăng nhập |
| Snake | Nhân vật chính do người chơi điều khiển |
| Food | Thức ăn tĩnh trên bản đồ; khi ăn, điểm và chiều dài Snake tăng |
| Prey | Con mồi do hệ thống tạo ra, tự di chuyển theo thuật toán; người chơi điều khiển Snake để đuổi và bắt |
| Classic Mode | Chế độ Snake truyền thống, chơi vô hạn đến khi Game Over |
| Hunt Mode | Chế độ truy đuổi và bắt con mồi trong thời gian quy định, có qua màn |
| Score | Điểm số của lượt chơi |
| High Score | Điểm kỷ lục cá nhân của người chơi theo từng chế độ |
| Game Over | Trạng thái kết thúc lượt chơi |
| Collision | Va chạm giữa đầu Snake với biên, thân Snake, thức ăn hoặc con mồi |
| Prey Movement | Cơ chế con mồi tự đổi vị trí và hướng di chuyển |
| Leaderboard | Bảng xếp hạng top người chơi điểm cao nhất |
| Game Loop | Vòng lặp cập nhật trạng thái và vẽ lại trò chơi theo từng tick |
| Tick | Một chu kỳ cập nhật của Game Loop, trong đó Snake tiến một ô |
| FR / NFR / BR | Mã yêu cầu chức năng / phi chức năng / quy tắc nghiệp vụ |
| API | Giao diện lập trình giữa Frontend và Backend |

### 1.5. Tài liệu tham chiếu

- Đề cương và đặc tả ban đầu của nhóm 17 (Bài tập lớn Chuyên đề CNTT).
- IEEE Std 830-1998, Recommended Practice for Software Requirements Specifications.
- ISO/IEC/IEEE 29148:2018, Requirements engineering.

## 2. Mô tả tổng quan

### 2.1. Góc nhìn sản phẩm

Snake Adventure là ứng dụng Web độc lập theo mô hình client-server: Frontend (HTML, CSS, JavaScript) chạy trò chơi trên trình duyệt; Backend (Node.js + Express) cung cấp API xác thực, lưu điểm và Bảng xếp hạng; cơ sở dữ liệu MySQL lưu tài khoản và điểm số. Toàn bộ logic chơi (di chuyển, va chạm, con mồi) chạy ở phía client; Backend chỉ xử lý dữ liệu người dùng và điểm.

### 2.2. Tóm tắt chức năng

Snake Adventure gồm hai chế độ: Classic Mode (vô hạn, ăn thức ăn tĩnh) và Hunt Mode (đuổi con mồi di động, có đồng hồ đếm ngược và nhiều màn). Chi tiết ở mục 3.

| Nhóm | Chức năng |
| --- | --- |
| Tài khoản | Đăng ký, đăng nhập, đăng xuất |
| Lõi trò chơi | Quản lý trò chơi, điều khiển Snake, thức ăn, con mồi, tính điểm, va chạm |
| Chế độ chơi | Classic Mode, Hunt Mode |
| Vòng đời lượt chơi | Game Over, Restart |
| Dữ liệu | Lưu thành tích, xem Bảng xếp hạng |

### 2.3. Đặc điểm người dùng

Người chơi cá nhân có nhu cầu giải trí, biết dùng trình duyệt và bàn phím, không cần kiến thức kỹ thuật. Không có vai trò quản trị trong phiên bản 1.0.

### 2.4. Môi trường vận hành

| Hạng mục | Yêu cầu |
| --- | --- |
| Nền tảng | Ứng dụng Web |
| Trình duyệt | Google Chrome, Microsoft Edge, Mozilla Firefox (bản hiện đại, hỗ trợ JavaScript) |
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js + Express |
| Cơ sở dữ liệu | MySQL |
| Thiết bị | Máy tính để bàn hoặc laptop |
| Điều khiển | Bàn phím (phím mũi tên hoặc W, A, S, D) |
| Phần cứng | Không yêu cầu cao; chỉ cần máy chạy được trình duyệt hiện đại |

### 2.5. Ràng buộc thiết kế và triển khai

- Bắt buộc dùng bộ công nghệ ở mục 2.4.
- Giao tiếp Frontend và Backend qua API HTTP, dữ liệu dạng JSON.
- Mật khẩu phải được mã hóa trước khi lưu, không lưu dạng văn bản thuần.
- Trò chơi 2D, không yêu cầu cài đặt thêm plugin.
- Phạm vi và thời gian bị giới hạn bởi tiến độ bài tập lớn.

### 2.6. Giả định và phụ thuộc

- Người chơi có kết nối mạng để tải trò chơi và dùng các chức năng cần Backend (đăng nhập, lưu điểm, Bảng xếp hạng).
- Người chơi vãng lai vẫn chơi được khi Backend tạm thời không phản hồi, nhưng không lưu được điểm.
- Trình duyệt hỗ trợ đầy đủ HTML5 (Canvas hoặc DOM) và JavaScript hiện đại.
- Các giá trị cụ thể như kích thước bản đồ, tốc độ, số điểm thưởng là tham số cấu hình, được chốt ở mục 4 (đề xuất) và có thể tinh chỉnh khi thử nghiệm.

## 3. Yêu cầu chức năng

Mỗi yêu cầu có mã duy nhất (FR-xx.y) để truy vết sang quy tắc (BR), giao diện (UI) và ca kiểm thử (TC). Mức ưu tiên: **Cao** = bắt buộc cho bản 1.0; **TB** = nên có; **Thấp** = có thể lùi.

### 3.1. Tổng hợp chức năng

| Mã | Chức năng | Tác nhân | Ưu tiên |
| --- | --- | --- | --- |
| FR-01 | Đăng ký tài khoản | Guest | Cao |
| FR-02 | Đăng nhập / Đăng xuất | Guest, Registered User | Cao |
| FR-03 | Quản lý trò chơi (bắt đầu, tạm dừng, tiếp tục, thoát) | Guest, Registered User | Cao |
| FR-04 | Điều khiển Snake | Guest, Registered User | Cao |
| FR-05 | Hệ thống thức ăn | Hệ thống | Cao |
| FR-06 | Hệ thống con mồi | Hệ thống | Cao |
| FR-07 | Hệ thống tính điểm | Hệ thống | Cao |
| FR-08 | Xử lý va chạm | Hệ thống | Cao |
| FR-09 | Classic Mode | Guest, Registered User | Cao |
| FR-10 | Hunt Mode | Guest, Registered User | Cao |
| FR-11 | Game Over | Hệ thống | Cao |
| FR-12 | Restart | Guest, Registered User | Cao |
| FR-13 | Lưu thành tích | Registered User | Cao |
| FR-14 | Xem Bảng xếp hạng | Guest, Registered User | Cao |

### 3.2. FR-01 Đăng ký tài khoản

**Mô tả:** Cho phép tạo tài khoản mới để lưu điểm và ghi danh vào Bảng xếp hạng.

**Tác nhân:** Guest. **Tiền điều kiện:** chưa đăng nhập.

**Đầu vào:** Tên đăng nhập (Username), Mật khẩu (Password), Nhập lại mật khẩu (Confirm Password).

- FR-01.1: Hệ thống phải kiểm tra các trường không được để trống.
- FR-01.2: Tên đăng nhập dài 3 đến 20 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới; mật khẩu dài tối thiểu 6 ký tự (đề xuất, cấu hình được).
- FR-01.3: Mật khẩu xác nhận phải trùng khớp với mật khẩu.
- FR-01.4: Hệ thống phải kiểm tra Tên đăng nhập chưa tồn tại trong cơ sở dữ liệu (không phân biệt hoa thường).
- FR-01.5: Khi hợp lệ, hệ thống phải mã hóa mật khẩu (băm một chiều có salt, ví dụ bcrypt) rồi lưu người dùng mới.
- FR-01.6: Hệ thống hiển thị thông báo thành công và chuyển sang trang Đăng nhập (hoặc tự động đăng nhập).
- FR-01.7: Khi thất bại, hệ thống hiển thị thông báo lỗi cụ thể theo từng trường (trống, quá ngắn, không khớp, đã tồn tại).

**Hậu điều kiện:** có một bản ghi người dùng mới với mật khẩu đã mã hóa.

### 3.3. FR-02 Đăng nhập / Đăng xuất

**Mô tả:** Xác thực người dùng để dùng chức năng cá nhân hóa và kết thúc phiên làm việc.

**Đầu vào:** Tên đăng nhập, Mật khẩu (đăng nhập); yêu cầu Đăng xuất.

- FR-02.1: Hệ thống tìm Tên đăng nhập trong cơ sở dữ liệu và đối chiếu mật khẩu đã mã hóa.
- FR-02.2: Nếu đúng, hệ thống khởi tạo session hoặc token (ví dụ JWT) cho phiên làm việc và chuyển tới Menu chính, hiển thị tên người dùng.
- FR-02.3: Nếu sai, hệ thống hiển thị thông báo chung "Tên đăng nhập hoặc mật khẩu không đúng", không tiết lộ trường nào sai.
- FR-02.4: Khi Đăng xuất, hệ thống xóa session/token hiện tại và chuyển trạng thái về Guest.
- FR-02.5: Phiên đăng nhập hết hạn sau một khoảng thời gian cấu hình được (đề xuất 24 giờ); khi hết hạn, người dùng bị đưa về trạng thái Guest.

**Hậu điều kiện:** phiên hợp lệ (đăng nhập) hoặc đã bị hủy (đăng xuất).

### 3.4. FR-03 Quản lý trò chơi

**Mô tả:** Cho phép bắt đầu, tạm dừng (Pause), tiếp tục (Resume) hoặc thoát màn chơi về Menu chính.

**Đầu vào:** Phím Esc hoặc Space; hoặc nút Tạm dừng / Tiếp tục / Thoát trên giao diện.

- FR-03.1: Khi bắt đầu, hệ thống khởi tạo Game Loop theo chế độ đã chọn.
- FR-03.2: Khi Tạm dừng, hệ thống đóng băng cập nhật vị trí mọi đối tượng và bộ đếm thời gian, đồng thời hiển thị lớp phủ "Tạm dừng".
- FR-03.3: Khi Tiếp tục, hệ thống chạy lại Game Loop từ đúng trạng thái đã đóng băng.
- FR-03.4: Khi Thoát, hệ thống dọn dẹp trạng thái chơi (bộ nhớ, bộ đếm) và quay về Menu chính; lượt chơi đang dở không được lưu điểm.
- FR-03.5: Phím Space/Esc phải chuyển đổi qua lại giữa Tạm dừng và Tiếp tục.

### 3.5. FR-04 Điều khiển Snake

**Mô tả:** Tiếp nhận lệnh bàn phím để điều hướng Snake trong không gian 2D.

**Đầu vào:** Phím mũi tên (Up, Down, Left, Right) hoặc W, A, S, D.

- FR-04.1: Hệ thống phải nhận cả hai bộ phím và coi chúng tương đương.
- FR-04.2: Hệ thống không cho phép đảo chiều 180 độ (đang đi Phải không được quay ngay sang Trái); lệnh đó bị bỏ qua.
- FR-04.3: Hướng mới được áp dụng cho đầu Snake ở tick kế tiếp.
- FR-04.4: Nếu người chơi nhấn nhiều phím trong một tick, hệ thống chỉ giữ hướng hợp lệ đầu tiên, và có thể xếp hàng đợi tối đa 2 lệnh để phản hồi mượt khi bấm nhanh (đề xuất).
- FR-04.5: Snake di chuyển liên tục theo hướng hiện tại, mỗi tick tiến một ô, kể cả khi không có phím nhấn.

### 3.6. FR-05 Hệ thống thức ăn

**Mô tả:** Sinh thức ăn tĩnh tại vị trí ngẫu nhiên trên bản đồ.

**Đầu vào:** Phạm vi bản đồ, tọa độ thân Snake, tọa độ vật cản (nếu có).

- FR-05.1: Hệ thống sinh tọa độ ngẫu nhiên (X, Y) trong phạm vi bản đồ.
- FR-05.2: Tọa độ không được trùng thân Snake hoặc vật cản; nếu trùng, sinh lại.
- FR-05.3: Thức ăn được sinh khi bắt đầu lượt chơi và ngay khi thức ăn cũ bị ăn.
- FR-05.4: Nếu bản đồ không còn ô trống, lượt chơi kết thúc ở trạng thái thắng (đủ ô) và được xử lý như Game Over (xem FR-11).

### 3.7. FR-06 Hệ thống con mồi

**Mô tả:** Quản lý con mồi di động (chuột, chim) cho Hunt Mode.

**Đầu vào:** Thuật toán di chuyển ngẫu nhiên hoặc né tránh, cấp độ (level) hiện tại.

- FR-06.1: Hệ thống khởi tạo con mồi tại vị trí ngẫu nhiên hợp lệ, không trùng Snake và cách đầu Snake tối thiểu một khoảng an toàn (đề xuất 5 ô).
- FR-06.2: Hệ thống cập nhật vị trí con mồi định kỳ theo thuật toán của từng loại (xem BR-06).
- FR-06.3: Ít nhất hai loại con mồi có đặc điểm khác nhau: chuột (di chuyển ngẫu nhiên, đổi hướng thường xuyên) và chim (nhanh hơn, né tránh đầu Snake).
- FR-06.4: Ở level cao hơn, con mồi di chuyển nhanh hơn, đổi hướng thường xuyên hơn hoặc dùng cách di chuyển phức tạp hơn.
- FR-06.5: Con mồi không được đi ra ngoài biên bản đồ.
- FR-06.6: Chuyển động của con mồi phải mượt, không giật hình trên màn hình.

### 3.8. FR-07 Hệ thống tính điểm

**Mô tả:** Tính và hiển thị điểm tích lũy trong lượt chơi.

**Đầu vào:** Sự kiện ăn thức ăn hoặc bắt con mồi; loại đối tượng; thời gian bắt mồi.

- FR-07.1: Khi Snake ăn đối tượng, hệ thống cộng điểm tương ứng vào tổng điểm (bảng điểm ở BR-04).
- FR-07.2: Trong Hunt Mode, hệ thống tính thêm điểm thời gian: bắt càng nhanh điểm thưởng càng cao, càng chậm càng ít.
- FR-07.3: Điểm hiển thị trên giao diện cập nhật ngay khi có sự kiện, không chờ tick kế tiếp.
- FR-07.4: Điểm không bao giờ âm.

### 3.9. FR-08 Xử lý va chạm

**Mô tả:** Phát hiện tiếp xúc giữa đầu Snake với các đối tượng trên bản đồ.

**Đầu vào:** Tọa độ đầu và thân Snake, biên bản đồ, vị trí thức ăn và con mồi.

- FR-08.1: Sau mỗi tick di chuyển, hệ thống phải kiểm tra va chạm theo thứ tự: biên bản đồ, thân Snake, thức ăn, con mồi.
- FR-08.2: Đầu trùng biên bản đồ hoặc thân Snake: kích hoạt sự kiện Game Over (FR-11).
- FR-08.3: Đầu trùng thức ăn: kích hoạt sự kiện ăn mồi (tăng điểm, tăng chiều dài, xóa thức ăn, sinh thức ăn mới).
- FR-08.4: Đầu trùng con mồi (Hunt Mode): kích hoạt sự kiện bắt mồi (tăng điểm, tăng chiều dài, xóa con mồi, kiểm tra điều kiện qua màn).
- FR-08.5: Đầu Snake được phép đi vào ô đuôi vừa rời đi trong cùng tick, không tính là va chạm thân.

### 3.10. FR-09 Classic Mode

**Mô tả:** Chế độ Snake truyền thống, chơi vô hạn.

**Đầu vào:** Người chơi chọn Classic Mode từ Menu chính.

- FR-09.1: Hệ thống khởi tạo Snake dài 3 đốt ở giữa bản đồ, hướng ban đầu sang phải, và 1 thức ăn tĩnh.
- FR-09.2: Mỗi khi Snake ăn thức ăn, điểm tăng, Snake dài thêm một đốt và thức ăn mới được sinh ở vị trí khác.
- FR-09.3: Tốc độ Snake có thể tăng nhẹ theo điểm (đề xuất, xem BR-07).
- FR-09.4: Lượt chơi kéo dài đến khi xảy ra va chạm gây Game Over.
- FR-09.5: Khi kết thúc, hệ thống ghi nhận tổng điểm với chế độ Classic.

### 3.11. FR-10 Hunt Mode

**Mô tả:** Chế độ săn mồi tính giờ, có nhiều màn với độ khó tăng dần.

**Đầu vào:** Người chơi chọn Hunt Mode từ Menu chính.

- FR-10.1: Hệ thống khởi tạo màn chơi với Snake có kích thước ban đầu cố định, con mồi di động và bộ đếm ngược thời gian của màn.
- FR-10.2: Người chơi phải bắt đủ số con mồi yêu cầu của màn trước khi hết giờ.
- FR-10.3: Khi đủ số con mồi, hệ thống chuyển sang level tiếp theo với độ khó cao hơn (con mồi nhanh hơn, đổi hướng thường xuyên hơn, loại mồi phức tạp hơn).
- FR-10.4: Hệ thống ghi lại thời gian hoàn thành mỗi màn, dùng để tính điểm thời gian và xếp thành tích trên Bảng xếp hạng.
- FR-10.5: Hết giờ hoặc va chạm gây chết: kết thúc lượt chơi (FR-11) và hiển thị kết quả.
- FR-10.6: Giao diện luôn hiển thị level, thời gian còn lại, số mồi đã bắt trên số mồi yêu cầu, và điểm.

### 3.12. FR-11 Game Over

**Mô tả:** Xử lý khi lượt chơi kết thúc do va chạm gây chết, hết giờ (Hunt) hoặc lấp đầy bản đồ.

**Đầu vào:** Tín hiệu va chạm chết, hết giờ hoặc bản đồ đầy.

- FR-11.1: Hệ thống dừng Game Loop và hiển thị màn hình Game Over cùng điểm đạt được (và level đạt được ở Hunt Mode).
- FR-11.2: Hệ thống so sánh điểm với kỷ lục cá nhân và thông báo nếu phá kỷ lục (chỉ khi đã đăng nhập).
- FR-11.3: Màn hình cung cấp các lựa chọn: Restart, Lưu điểm, Quay về Menu.
- FR-11.4: Guest thấy lựa chọn Lưu điểm kèm gợi ý đăng nhập để lưu thành tích.

### 3.13. FR-12 Restart

**Mô tả:** Bắt đầu nhanh lượt chơi mới từ màn hình Game Over hoặc Tạm dừng.

**Đầu vào:** Người chơi chọn nút "Chơi lại".

- FR-12.1: Hệ thống đặt lại mọi trạng thái: điểm về 0, vị trí và độ dài Snake, level, thức ăn hoặc con mồi, bộ đếm thời gian.
- FR-12.2: Hệ thống giữ nguyên chế độ chơi hiện tại và khởi chạy lại Game Loop ngay.
- FR-12.3: Khi Restart từ Tạm dừng, lượt chơi dở không được lưu điểm.

### 3.14. FR-13 Lưu thành tích

**Mô tả:** Ghi nhận điểm của lượt chơi vào cơ sở dữ liệu.

**Tác nhân:** Registered User. **Đầu vào:** ID người dùng, điểm số, chế độ chơi (Classic hoặc Hunt), level đạt được và thời gian (Hunt).

- FR-13.1: Client gửi yêu cầu lưu điểm tới API Backend kèm token xác thực.
- FR-13.2: Backend phải xác thực token và kiểm tra tính hợp lệ của dữ liệu (điểm là số nguyên không âm, chế độ hợp lệ, không vượt ngưỡng tối đa hợp lý).
- FR-13.3: Backend chỉ cập nhật High Score khi điểm mới cao hơn kỷ lục cũ của người dùng trong chế độ đó; mỗi lượt chơi vẫn có thể được ghi vào lịch sử.
- FR-13.4: Hệ thống trả kết quả và hiển thị thông báo lưu thành công hoặc lỗi; nếu lỗi mạng, cho phép thử lại.
- FR-13.5: Guest không được lưu điểm; điểm của Guest không vào Bảng xếp hạng.

### 3.15. FR-14 Xem Bảng xếp hạng

**Mô tả:** Hiển thị danh sách top người chơi điểm cao nhất theo từng chế độ.

**Tác nhân:** Guest, Registered User. **Đầu vào:** Yêu cầu xem Bảng xếp hạng; bộ lọc chế độ chơi (Classic hoặc Hunt).

- FR-14.1: Client gọi API Bảng xếp hạng với tham số chế độ chơi.
- FR-14.2: Backend truy vấn top N điểm cao nhất (đề xuất N = 10) theo thứ tự giảm dần; điểm bằng nhau xếp theo thời gian đạt được sớm hơn (Hunt Mode: thời gian hoàn thành ngắn hơn xếp trên).
- FR-14.3: Màn hình hiển thị hạng, tên người chơi, điểm; với Hunt Mode hiển thị thêm level và thời gian.
- FR-14.4: Nếu người dùng đã đăng nhập, hệ thống làm nổi bật dòng của họ và hiển thị hạng cá nhân khi họ nằm ngoài top N.
- FR-14.5: Khi chưa có dữ liệu, hiển thị thông báo "Chưa có người chơi nào".

## 4. Quy tắc trò chơi

Các quy tắc nghiệp vụ (BR) dưới đây là căn cứ để lập trình và kiểm thử. Giá trị số là đề xuất ban đầu, được lưu thành hằng số cấu hình để tinh chỉnh sau khi chơi thử.

### 4.1. Tham số cấu hình đề xuất

| Tham số | Giá trị đề xuất | Ghi chú |
| --- | --- | --- |
| Kích thước bản đồ | 20 x 20 ô | Mỗi ô 24-32 px |
| Độ dài Snake ban đầu | 3 đốt | Classic Mode |
| Tốc độ Snake ban đầu | 8 ô/giây (tick 125 ms) | Classic Mode |
| Tăng tốc Classic | +0,5 ô/giây mỗi 5 thức ăn, tối đa 15 ô/giây | Tùy chọn |
| Thời gian một màn Hunt | 60 giây ở level 1, giảm 3 giây mỗi level, tối thiểu 30 giây | Đề xuất |
| Số mồi yêu cầu mỗi màn Hunt | 3 ở level 1, tăng 1 mỗi 2 level, tối đa 8 | Đề xuất |
| Số mục Bảng xếp hạng | Top 10 | Theo từng chế độ |

### 4.2. BR-01 Quy tắc di chuyển

- Snake tiến một ô mỗi tick theo hướng hiện tại; đầu mới thêm vào phía trước, đuôi bị bỏ đi trừ khi vừa ăn.
- Không được quay đầu 180 độ ngay lập tức.
- Biên bản đồ là tường: chạm biên là chết (không xuyên biên).

### 4.3. BR-02 Quy tắc ăn mồi

- Ăn thức ăn hoặc bắt con mồi khi đầu Snake vào đúng ô chứa đối tượng đó.
- Nếu đầu và con mồi "đổi chỗ" (đi xuyên qua nhau trong cùng tick), vẫn tính là bắt được.
- Mỗi thức ăn hoặc con mồi chỉ được tính một lần.

### 4.4. BR-03 Quy tắc tăng trưởng

- Ăn thức ăn: dài thêm 1 đốt. Bắt con mồi: dài thêm 1 đốt (đề xuất, có thể khác theo loại mồi).
- Đốt mới xuất hiện ở vị trí đuôi cũ ngay tick sau khi ăn.

### 4.5. BR-04 Quy tắc tính điểm

| Sự kiện | Điểm cơ bản | Điểm thưởng thời gian |
| --- | --- | --- |
| Ăn thức ăn (Classic) | +10 | Không có |
| Bắt chuột (Hunt) | +30 | Có |
| Bắt chim (Hunt) | +50 | Có |
| Hoàn thành màn (Hunt) | +100 x level | Có |

Điểm thưởng thời gian của Hunt Mode = điểm cơ bản x hệ số thời gian, trong đó hệ số = thời gian còn lại của màn / tổng thời gian màn, nằm trong khoảng 0 đến 1 và cộng vào điểm cơ bản (bắt càng sớm điểm thưởng càng cao).

```latex
D_{\text{thưởng}} = D_{\text{cơ bản}} \times \frac{t_{\text{còn lại}}}{t_{\text{màn}}}
```

### 4.6. BR-05 Quy tắc va chạm

| Va chạm | Kết quả |
| --- | --- |
| Đầu với biên bản đồ | Game Over |
| Đầu với thân Snake | Game Over |
| Đầu với thức ăn | Ăn mồi, +điểm, +chiều dài |
| Đầu với con mồi | Bắt mồi, +điểm, +chiều dài |
| Con mồi với thân Snake | Con mồi bị chặn, đổi hướng; không gây chết Snake |

### 4.7. BR-06 Quy tắc con mồi

| Loại | Tốc độ | Cách di chuyển |
| --- | --- | --- |
| Chuột | Chậm hơn Snake (khoảng 60%) | Di chuyển ngẫu nhiên, đổi hướng sau mỗi 2-4 ô |
| Chim | Ngang hoặc nhanh hơn Snake một chút | Né tránh: khi đầu Snake trong bán kính 4 ô thì đi ra xa; ngoài ra bay ngẫu nhiên |

- Ở level cao hơn: tăng tốc độ, giảm khoảng thời gian giữa hai lần đổi hướng, tăng tỷ lệ xuất hiện chim.
- Con mồi không ra khỏi biên, không đi vào ô thân Snake.
- Mỗi lúc có tối đa 1 con mồi trên bản đồ (theo tài liệu gốc); số con mồi tối đa nhiều hơn là mở rộng tương lai.

### 4.8. BR-07 Quy tắc thời gian

- Classic Mode không giới hạn thời gian; có thể hiển thị thời gian chơi để tham khảo.
- Hunt Mode đếm ngược theo từng màn; hết giờ là Game Over.
- Thời gian chỉ chạy khi trò chơi đang ở trạng thái chơi; tạm dừng thì đóng băng.
- Thời gian hoàn thành mỗi màn Hunt được lưu để tính điểm thời gian và xếp hạng.

## 5. Yêu cầu giao diện

### 5.1. Giao diện người dùng

Yêu cầu chung: bố cục đơn giản, chữ rõ, tương phản đủ để thấy Snake, thức ăn, con mồi; điều hướng giữa các màn hình không tải lại toàn trang khi không cần; mọi nút có thể thao tác bằng chuột, và các thao tác chơi bằng bàn phím.

| Mã | Màn hình | Thành phần chính | Chức năng liên quan |
| --- | --- | --- | --- |
| UI-01 | Đăng ký | Ô Username, Password, Confirm Password; nút Đăng ký; liên kết sang Đăng nhập; vùng hiện lỗi từng trường | FR-01 |
| UI-02 | Đăng nhập | Ô Username, Password; nút Đăng nhập; liên kết sang Đăng ký; nút "Chơi với tư cách khách" | FR-02 |
| UI-03 | Menu chính | Tên người dùng hoặc "Khách"; nút Classic Mode, Hunt Mode, Bảng xếp hạng; Đăng nhập hoặc Đăng xuất; hiển thị High Score cá nhân | FR-02, FR-03 |
| UI-04 | Classic Mode | Bản đồ; điểm hiện tại; High Score; nút Tạm dừng; hướng dẫn phím | FR-03 đến FR-05, FR-07 đến FR-09 |
| UI-05 | Hunt Mode | Bản đồ có con mồi; điểm; level; đồng hồ đếm ngược; số mồi đã bắt trên yêu cầu; nút Tạm dừng | FR-03, FR-06, FR-07, FR-10 |
| UI-06 | Tạm dừng (lớp phủ) | Nút Tiếp tục, Chơi lại, Thoát về Menu | FR-03, FR-12 |
| UI-07 | Game Over | Điểm; level (Hunt); thông báo phá kỷ lục; nút Chơi lại, Lưu điểm, Về Menu | FR-11 đến FR-13 |
| UI-08 | Bảng xếp hạng | Thẻ chọn Classic hoặc Hunt; bảng hạng, tên, điểm (cộng level và thời gian ở Hunt); nút Quay lại | FR-14 |

Quy ước giao diện:

- Thông báo lỗi và thành công hiển thị cạnh trường liên quan hoặc dạng toast, tự tắt sau vài giây.
- Trong khi chơi, các phím mũi tên không được cuộn trang.
- Màn hình chơi phải vừa khung nhìn máy tính tiêu chuẩn (độ phân giải từ 1366 x 768) mà không phải cuộn.

### 5.2. Giao diện phần cứng và phần mềm

- Phần cứng: bàn phím và màn hình máy tính; không yêu cầu thiết bị đặc biệt.
- Phần mềm: trình duyệt hiện đại (mục 2.4); Frontend gọi Backend qua HTTP/JSON; Backend truy cập MySQL bằng truy vấn tham số hóa.

### 5.3. Giao diện lập trình (API) đề xuất

| Mã | Phương thức và đường dẫn | Xác thực | Mô tả | Chức năng |
| --- | --- | --- | --- | --- |
| API-01 | POST /api/auth/register | Không | Đăng ký: username, password, confirmPassword | FR-01 |
| API-02 | POST /api/auth/login | Không | Đăng nhập, trả token và thông tin người dùng | FR-02 |
| API-03 | POST /api/auth/logout | Có | Hủy phiên hiện tại | FR-02 |
| API-04 | GET /api/users/me | Có | Lấy thông tin và High Score của người dùng | FR-02, FR-13 |
| API-05 | POST /api/scores | Có | Lưu điểm: mode, score, level, duration | FR-13 |
| API-06 | GET /api/leaderboard?mode=classic\|hunt&limit=10 | Không (tùy chọn) | Lấy top người chơi theo chế độ | FR-14 |

Quy ước phản hồi: dữ liệu JSON; thành công trả mã 2xx; lỗi trả mã 4xx/5xx kèm mã lỗi và thông điệp dễ hiểu cho người dùng (ví dụ 400 dữ liệu sai, 401 chưa xác thực, 409 tên đăng nhập đã tồn tại, 500 lỗi máy chủ).

## 6. Yêu cầu phi chức năng

Mỗi yêu cầu có tiêu chí đo được để kiểm chứng khi nghiệm thu.

| Mã | Nhóm | Yêu cầu | Tiêu chí kiểm chứng |
| --- | --- | --- | --- |
| NFR-01 | Hiệu năng | Trò chơi chạy mượt khi chơi | Duy trì từ 60 khung hình/giây ở phần hiển thị trên máy cấu hình trung bình; độ trễ từ lúc nhấn phím đến khi đổi hướng không quá 1 tick |
| NFR-02 | Hiệu năng | Tải trang nhanh | Tải xong trang chơi dưới 3 giây trên mạng thông thường; tổng dung lượng tài nguyên tĩnh dưới 2 MB |
| NFR-03 | Hiệu năng | API phản hồi nhanh | Đăng nhập, lưu điểm, lấy Bảng xếp hạng phản hồi dưới 500 ms với 100 người dùng đồng thời |
| NFR-04 | Khả năng sử dụng | Người chơi mới hiểu cách chơi không cần hướng dẫn riêng | Menu và màn chơi có chú thích phím; 90% người thử nghiệm bắt đầu chơi được trong 30 giây |
| NFR-05 | Khả năng sử dụng | Phản hồi rõ ràng | Mọi thao tác hợp lệ và lỗi đều có thông báo hoặc thay đổi giao diện tương ứng |
| NFR-06 | Tương thích | Chạy ổn định trên trình duyệt phổ biến | Hoạt động đúng trên bản mới của Chrome, Edge, Firefox; không dùng tính năng chưa được hỗ trợ rộng rãi |
| NFR-07 | Tương thích | Hiển thị đúng ở nhiều kích thước cửa sổ máy tính | Không vỡ bố cục từ 1366 x 768 trở lên |
| NFR-08 | Độ tin cậy | Không mất dữ liệu điểm đã lưu | Điểm đã báo lưu thành công phải còn trong cơ sở dữ liệu; thao tác lưu có giao dịch (transaction) |
| NFR-09 | Độ tin cậy | Chịu lỗi mạng và lỗi máy chủ | Khi Backend lỗi, người chơi vẫn chơi được; có thông báo và cho thử lại việc lưu điểm |
| NFR-10 | Độ tin cậy | Vòng lặp trò chơi ổn định | Không rò rỉ bộ nhớ hay tăng bộ đếm khi chơi liên tục 30 phút hoặc khi Restart nhiều lần |
| NFR-11 | Bảo mật | Bảo vệ mật khẩu và phiên | Mật khẩu băm có salt; không ghi mật khẩu vào log; token có thời hạn; chỉ truyền qua HTTPS khi triển khai thật |
| NFR-12 | Bảo mật | Chống tấn công thông dụng | Dùng truy vấn tham số hóa chống SQL injection; escape dữ liệu hiển thị chống XSS; giới hạn số lần đăng nhập sai liên tiếp |
| NFR-13 | Bảo mật | Chống gian lận điểm ở mức cơ bản | Backend kiểm tra điểm trong ngưỡng hợp lý và chỉ nhận lưu điểm từ người dùng đã xác thực |
| NFR-14 | Khả năng bảo trì | Mã nguồn dễ đọc, dễ mở rộng | Tách module (logic trò chơi, hiển thị, API, dữ liệu); tham số trò chơi để ở tệp cấu hình; thêm loại con mồi mới không phải sửa logic lõi |
| NFR-15 | Khả năng bảo trì | Có tài liệu và quản lý phiên bản | Mã nguồn quản lý bằng Git; có README hướng dẫn cài đặt và chạy; chú thích cho hàm chính |
| NFR-16 | Khả năng bảo trì | Dễ kiểm thử | Logic trò chơi tách khỏi giao diện để chạy được kiểm thử đơn vị |

## 7. Mô hình dữ liệu

Cơ sở dữ liệu MySQL gồm hai bảng: `users` (tài khoản) và `scores` (mỗi lượt chơi đã lưu). Quan hệ một-nhiều: một người dùng có nhiều bản ghi điểm. High Score cá nhân và Bảng xếp hạng được lấy bằng truy vấn trên `scores`, không lưu dư thừa.

### 7.1. Bảng users

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | INT | Khóa chính, tự tăng | Mã người dùng |
| username | VARCHAR(20) | Duy nhất, không rỗng | Tên đăng nhập |
| password_hash | VARCHAR(255) | Không rỗng | Mật khẩu đã băm có salt |
| created_at | DATETIME | Mặc định thời điểm hiện tại | Ngày tạo tài khoản |

### 7.2. Bảng scores

| Cột | Kiểu | Ràng buộc | Mô tả |
| --- | --- | --- | --- |
| id | INT | Khóa chính, tự tăng | Mã bản ghi |
| user_id | INT | Khóa ngoại tới users.id, không rỗng | Người chơi |
| mode | ENUM('classic','hunt') | Không rỗng | Chế độ chơi |
| score | INT | Không âm | Điểm lượt chơi |
| level | INT | Mặc định 1 | Level đạt được (Hunt Mode) |
| duration_sec | INT | Không âm | Tổng thời gian chơi (giây) |
| created_at | DATETIME | Mặc định thời điểm hiện tại | Thời điểm kết thúc lượt chơi |

### 7.3. Truy vấn tham chiếu

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(20) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE scores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  mode ENUM('classic','hunt') NOT NULL,
  score INT NOT NULL CHECK (score >= 0),
  level INT NOT NULL DEFAULT 1,
  duration_sec INT NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_mode_score (mode, score DESC)
);

-- Bảng xếp hạng: điểm cao nhất của mỗi người theo chế độ, top 10
SELECT u.username, MAX(s.score) AS best_score
FROM scores s JOIN users u ON u.id = s.user_id
WHERE s.mode = ?
GROUP BY u.id, u.username
ORDER BY best_score DESC
LIMIT 10;
```

## 8. Yêu cầu kiểm thử và truy vết

Mọi yêu cầu bắt buộc phải có ít nhất một ca kiểm thử (TC). Các nhóm dưới đây nêu ca chính; nhóm bổ sung ca chi tiết khi viết kế hoạch kiểm thử. Kiểm thử gồm: kiểm thử đơn vị cho logic trò chơi, kiểm thử API, kiểm thử giao diện thủ công trên Chrome, Edge, Firefox, và kiểm thử chấp nhận.

### 8.1. Kiểm thử Classic Mode

| Mã | Kịch bản | Kết quả mong đợi | Yêu cầu |
| --- | --- | --- | --- |
| TC-C01 | Bắt đầu Classic Mode | Snake dài 3 đốt, có 1 thức ăn, điểm bằng 0 | FR-09.1 |
| TC-C02 | Snake ăn thức ăn | Điểm +10, dài thêm 1 đốt, thức ăn mới ở ô trống khác | FR-09.2, FR-05 |
| TC-C03 | Chơi liên tục sau nhiều lần ăn | Không tự kết thúc; chỉ dừng khi va chạm | FR-09.4 |
| TC-C04 | Thức ăn sinh ra khi thân Snake dài | Không bao giờ trùng thân Snake | FR-05.2 |
| TC-C05 | Bản đồ đầy | Lượt chơi kết thúc, xử lý như Game Over | FR-05.4 |
| TC-C06 | Tạm dừng rồi tiếp tục | Vị trí và điểm giữ nguyên, Snake đi tiếp đúng hướng cũ | FR-03.2, FR-03.3 |

### 8.2. Kiểm thử Hunt Mode

| Mã | Kịch bản | Kết quả mong đợi | Yêu cầu |
| --- | --- | --- | --- |
| TC-H01 | Bắt đầu Hunt Mode | Có con mồi, đồng hồ đếm ngược chạy, level 1 | FR-10.1 |
| TC-H02 | Bắt con mồi | Điểm tăng kèm điểm thưởng thời gian, dài thêm, bộ đếm mồi tăng | FR-08.4, FR-07.2 |
| TC-H03 | Bắt đủ số mồi yêu cầu trước khi hết giờ | Chuyển level 2, mồi nhanh hơn, đồng hồ đặt lại | FR-10.2, FR-10.3 |
| TC-H04 | Hết giờ khi chưa bắt đủ | Game Over, hiển thị level và điểm | FR-10.5, FR-11 |
| TC-H05 | Con mồi tiếp cận biên | Con mồi không ra khỏi bản đồ | FR-06.5 |
| TC-H06 | Chim khi Snake lại gần | Chim di chuyển ra xa trong bán kính né tránh | BR-06 |
| TC-H07 | Tạm dừng khi đang đếm ngược | Đồng hồ và con mồi đều dừng | FR-03.2, BR-07 |

### 8.3. Kiểm thử va chạm

| Mã | Kịch bản | Kết quả mong đợi | Yêu cầu |
| --- | --- | --- | --- |
| TC-V01 | Đầu chạm mỗi trong 4 biên | Game Over | FR-08.2 |
| TC-V02 | Snake tự cắn thân | Game Over | FR-08.2 |
| TC-V03 | Đầu vào ô đuôi vừa rời đi | Không Game Over | FR-08.5 |
| TC-V04 | Quay đầu 180 độ ngay lập tức | Lệnh bị bỏ qua, Snake không chết | FR-04.2 |
| TC-V05 | Nhấn 2 phím rất nhanh trong 1 tick | Chỉ hướng hợp lệ được áp dụng, không tự đâm thân | FR-04.4 |
| TC-V06 | Đầu và con mồi đổi chỗ trong 1 tick | Tính là bắt được | BR-02 |

### 8.4. Kiểm thử điểm số

| Mã | Kịch bản | Kết quả mong đợi | Yêu cầu |
| --- | --- | --- | --- |
| TC-S01 | Ăn 1 thức ăn Classic | Điểm đúng 10 | BR-04 |
| TC-S02 | Bắt chuột lúc còn 100% và 50% thời gian | Điểm thưởng thời gian ở 100% lớn hơn ở 50% theo công thức | FR-07.2 |
| TC-S03 | Cập nhật điểm trên giao diện | Hiển thị ngay khi ăn | FR-07.3 |
| TC-S04 | Restart | Điểm về 0, level 1, bộ đếm đặt lại | FR-12.1 |
| TC-S05 | Lưu điểm cao hơn kỷ lục | High Score cập nhật | FR-13.3 |
| TC-S06 | Lưu điểm thấp hơn kỷ lục | High Score giữ nguyên | FR-13.3 |
| TC-S07 | Guest bấm Lưu điểm | Không lưu, gợi ý đăng nhập | FR-13.5 |
| TC-S08 | Gửi điểm âm hoặc vượt ngưỡng qua API | Backend từ chối (400) | FR-13.2 |

### 8.5. Kiểm thử tài khoản và Bảng xếp hạng

| Mã | Kịch bản | Kết quả mong đợi | Yêu cầu |
| --- | --- | --- | --- |
| TC-A01 | Đăng ký hợp lệ | Tạo tài khoản, mật khẩu trong CSDL đã băm | FR-01.5 |
| TC-A02 | Đăng ký trùng Username | Báo lỗi đã tồn tại (409) | FR-01.4 |
| TC-A03 | Đăng ký mật khẩu xác nhận không khớp | Báo lỗi, không tạo tài khoản | FR-01.3 |
| TC-A04 | Đăng nhập đúng và sai | Đúng: vào Menu; sai: báo lỗi chung | FR-02.2, FR-02.3 |
| TC-A05 | Đăng xuất | Token bị hủy; về trạng thái Guest | FR-02.4 |
| TC-A06 | Xem Bảng xếp hạng từng chế độ | Đúng thứ tự giảm dần, tối đa 10 dòng | FR-14.2 |
| TC-A07 | Hai người bằng điểm | Xếp theo quy tắc phân hạng đã định | FR-14.2 |

### 8.6. Ma trận truy vết

| Nhóm yêu cầu | Quy tắc / giao diện / API | Ca kiểm thử |
| --- | --- | --- |
| FR-01, FR-02 | UI-01, UI-02, API-01 đến API-04, NFR-11, NFR-12 | TC-A01 đến TC-A05 |
| FR-03, FR-12 | UI-04 đến UI-06 | TC-C06, TC-H07, TC-S04 |
| FR-04, FR-08 | BR-01, BR-02, BR-05 | TC-V01 đến TC-V06 |
| FR-05, FR-09 | BR-01 đến BR-03 | TC-C01 đến TC-C05 |
| FR-06, FR-10 | BR-06, BR-07, UI-05 | TC-H01 đến TC-H07 |
| FR-07 | BR-04 | TC-S01 đến TC-S03 |
| FR-11, FR-13 | UI-07, API-05, mục 7 | TC-S05 đến TC-S08 |
| FR-14 | UI-08, API-06 | TC-A06, TC-A07 |
| NFR-01 đến NFR-16 | Mục 6 | Kiểm thử hiệu năng, tương thích, bảo mật, bảo trì khi nghiệm thu |

### 8.7. Tiêu chí nghiệm thu

- 100% yêu cầu mức ưu tiên Cao đã có ca kiểm thử và đạt.
- Không còn lỗi nghiêm trọng (làm trò chơi dừng, mất điểm, sai Game Over).
- Chạy đúng trên Chrome, Edge, Firefox bản mới.
- Hai chế độ chơi được trọn vòng: chơi, Game Over, lưu điểm, xem Bảng xếp hạng.
