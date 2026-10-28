# The Hunt — hai màn và luật tính điểm

Chọn The Hunt từ `../classic/index.html`, hoặc chạy `node demo/classic/server.mjs` từ thư mục gốc và mở `http://127.0.0.1:4173`. Mở file trực tiếp vẫn chơi được bằng khách; chơi có tên/lưu điểm cần server.

## Đặc trưng đã triển khai

- Rắn giữ nguyên chiều dài 3 đốt trong cả hai màn; bắt mồi không tăng chiều dài.
- Mỗi màn có phần giới thiệu loài mồi đặc trưng trước khi đồng hồ bắt đầu chạy.
- Danh sách và số lượng mồi được thiết kế trước, vị trí xuất hiện ngẫu nhiên trên ô trống.
- Chuột đi đúng 1 ô mỗi 1.500 ms. Ếch nhảy đúng 2 ô mỗi 3.000 ms. Cả hai chọn hướng xa đầu rắn hơn; kiểm tra ô trung gian và ô đáp để không trùng tường, thân hoặc mồi khác. Nếu không có đường thoát hợp lệ, con mồi đứng chờ chu kỳ tiếp theo; ếch không đổi thành bước 1 ô.
- Ăn hết mồi chuyển từ `hunting` sang `portal`, không tự qua màn. Cổng được đặt tại ô trống có đường đi quanh thân rắn hiện tại, tìm bằng breadth-first search.
- Chỉ khi đầu rắn đi vào cổng mới ghi kết quả màn và dừng giờ. Hành trình đến cổng được tính vào thời gian màn.
- Mỗi màn bắt đầu với 1.000 điểm thời gian, giữ nguyên đến hết giây 60. Từ giây 61 trừ 10 điểm mỗi giây hoàn chỉnh, đến 0 thì dừng trừ. Hết điểm thời gian không gây Game Over; vẫn phải săn hết mồi và qua cổng.
- Tạm dừng, mất focus, chuyển tab và màn giới thiệu không làm tăng thời gian chơi.
- Màn hoàn thành hiển thị điểm mồi và điểm thời gian riêng. Tổng lượt gồm các màn đã vào cổng; màn đang dở chưa đóng góp điểm.
- Va chạm tường/thân kết thúc lượt. Có thể chơi lại toàn bộ chiến dịch.

## Cấu hình đang dùng

`shared/hunt-rules.js` ở thư mục gốc là nguồn luật dùng chung cho trình duyệt và backend:

| Màn | ID API | Mồi định trước | Điểm mồi | Thưởng thời gian tối đa | Tổng tối đa |
| --- | --- | --- | ---: | ---: | ---: |
| Đồng cỏ | `hunt-meadow` | 20 chuột | 2.000 | 1.000 | 3.000 |
| Bờ ao | `hunt-pond` | 5 chuột + 15 ếch | 2.750 | 1.000 | 3.750 |

Chuột có hệ số 100 điểm/con, ếch 150 điểm/con. Điểm ăn mồi là cố định theo quota của màn. Tổng cả hai màn tối đa 6.750 điểm. Sau này có thể thêm màn bằng cấu hình, không cần sửa số màn cố định trong engine.

```text
penaltySeconds = floor(max(0, activeDurationMs - 60000) / 1000)
timeScore = max(0, 1000 - 10 * penaltySeconds)
levelScore = foodScore + timeScore
```

Ví dụ điểm thời gian: 60 giây → 1.000; 75 giây → 850; 160 giây trở đi → 0. Đồng hồ chỉ tính lúc đang chơi, bao gồm đoạn đường từ mồi cuối cùng tới cổng. Sang màn 2, đồng hồ và thưởng thời gian được đặt lại đúng như màn 1.

`levels.js` chỉ là adapter của cấu hình chung, không giữ một bản hệ số riêng. Khi có API, giao diện ưu tiên luật từ `/api/v1/game-config`; khi mở file, dùng cùng luật từ file shared. Phiên bản cấu hình hiện tại là `hunt-v1`; các lượt cũ giữ phiên bản khác phải bắt đầu lại sau khi tải luật mới.

## Code và tích hợp

- `../../shared/hunt-rules.js`: quota, điểm, thời gian và tốc độ chung.
- `levels.js`: adapter đưa luật dùng chung vào trình duyệt.
- `engine.js`: `HuntGame`, không phụ thuộc DOM; dùng `ClassicGame` cho di chuyển và va chạm, tách riêng mồi/cổng/thời gian/màn.
- `../classic/game.js`: vẽ bản đồ, sprite rắn, hình con mồi và cổng, HUD, giới thiệu và kết quả màn.
- `../classic/player-session.js`: chặn lưu cho khách; gửi kết quả bằng cookie của tên đã chọn.

Trạng thái: `ready → running → levelcomplete → ready`, hoặc `running → won/gameover`. `phase` tách `hunting`, `portal`, `complete`; `paused` giữ nguyên phase.

`completedLevels` giữ `levelId`, `activeDurationMs`, `enteredPortal`, `preyCaught`, `foodScore`, `timeScore`, `score`. Khi gọi API, client chỉ gửi các trường kết quả gốc, loại bỏ các trường điểm tự tính để backend tính lại. Phiên bản luật và tên người chơi được giữ từ lúc bắt đầu lượt.

Điểm Hunt đã được bật trên backend. Người chơi có tên được lưu kết quả theo các màn đã qua cổng; khách không được lưu thành tích. Chưa có database: API dùng RAM, mất dữ liệu khi restart. Nếu săn hết mồi nhưng va chạm trước khi vào cổng, màn đó chưa hoàn thành và không được cộng điểm.

## Kiểm thử

```powershell
node --test demo/hunt/engine.test.mjs
```

Bao gồm: quota 20/5+15, chiều dài cố định, cổng có thể tiếp cận, thời gian chạy đến cổng, tạm dừng, nhịp 1,5/3 giây, ếch nhảy đủ hai ô, AI tránh ô cấm, điểm thời gian về 0 không thua, va chạm sau khi mở cổng và đối chiếu công thức với backend. `backend/test/hunt-rules.test.js` kiểm tra thêm lưu điểm thực tế theo luật đã chốt.
