# Snake Adventure — Backend

Backend Node.js + Express cho Snake Adventure. Phần `backend` gồm API, nghiệp vụ và tài liệu tích hợp, không có SQL, schema, migration hay kết nối database. Demo trong `demo/classic` có màn chọn tên/khách và hai chế độ Classic/The Hunt theo phạm vi giao diện đã được cho phép; phần frontend chính do FE phụ trách.

## Demo Classic / The Hunt và chọn người chơi

Mở `demo/classic/index.html` bằng trình duyệt để chơi khách. Để nhập tên và dùng API, sau khi cài dependency của backend, chạy `node demo/classic/server.mjs` từ thư mục gốc rồi truy cập `http://127.0.0.1:4173`. Server demo phục vụ cả giao diện lẫn API, không cần chạy thêm cổng 3000; dùng bộ nhớ và cookie riêng. Xem [hướng dẫn demo dành cho FE](demo/classic/README.md).

Classic có tường bao, tăng trưởng, va chạm và chơi lại. [The Hunt](demo/hunt/README.md) hiện có 2 màn đã cấu hình: 20 chuột; sau đó 5 chuột + 15 ếch. Rắn giữ nguyên chiều dài, bắt đủ mồi mới mở cổng, vào cổng mới qua màn. Mỗi màn có 1.000 điểm thời gian, giữ nguyên trong 60 giây đầu, rồi trừ 10 điểm/giây đến 0. Chuột 100 điểm, ếch 150 điểm. Người chơi có tên đã lưu được điểm Hunt qua API; khách không được lưu.

## Trạng thái hiện tại

- Luồng người chơi hiện tại: **chỉ nhập tên, không mật khẩu**, hoặc chọn **chơi khách**. API tên người chơi tạo/khôi phục hồ sơ và đặt cookie phiên; API chơi khách thu hồi phiên cũ và không cấp quyền lưu điểm.
- Đã có thông tin phiên, cấu hình game, lưu thành tích, kỷ lục cá nhân, lịch sử và bảng xếp hạng. API tài khoản có mật khẩu cũ vẫn giữ để tương thích; tên đó không thể bị truy cập qua API chỉ nhập tên.
- Repository hiện tại dùng `Map` trong bộ nhớ của tiến trình để FE có thể thử API. **Khởi động lại server sẽ mất tài khoản, phiên đăng nhập và thành tích.** Không có file dữ liệu được ghi ra đĩa.
- Luật Hunt đã chốt trong `shared/hunt-rules.js`, được backend và trình duyệt dùng chung. Chuột đi 1 ô mỗi 1.500 ms; ếch nhảy đúng 2 ô mỗi 3.000 ms. Cả hai chọn ô xa đầu rắn hơn và tránh tường, thân rắn, mồi khác; nếu không có đường thoát hợp lệ thì chờ lần tiếp theo.
- Hunt đã bật lưu điểm; điểm thời gian không âm, hết điểm không gây thua. Classic vẫn giữ `pointsPerFood: null` và trả `409 SCORING_NOT_CONFIGURED` khi lưu. Lịch sử và bảng xếp hạng ban đầu rỗng.
- Các hệ số trong `backend/test/helpers.js` chỉ là fixture kiểm thử, **không phải thông số của game**.

## Chạy backend

Yêu cầu Node.js 24 trở lên. Chạy lệnh tại thư mục `backend`:

```powershell
cd backend
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

Nếu dùng npm, có thể chạy `npm install`, `npm run dev`, `npm test`, `npm run check`. Lockfile đã cung cấp thuộc pnpm; dùng pnpm để cài đúng dependency đã kiểm thử.

Sau khi dependency đã cài, có thể chạy trực tiếp mà không cần lệnh npm/pnpm:

```powershell
node --env-file-if-exists=.env src/server.js
node scripts/check.js
node --test test/api.test.js test/scoring.test.js test/environment.test.js test/player.test.js test/hunt-rules.test.js
```

API mặc định: `http://127.0.0.1:3000/api/v1`. Server không phục vụ trang web. Kiểm tra hoạt động bằng:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/v1/health
```

Máy hiện tại có Node.js nhưng chưa có lệnh npm trong PATH. Dependency đã được cài bằng pnpm đi kèm runtime. Nếu cần dùng đúng pnpm này trên máy hiện tại:

```powershell
node 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.mjs' install --frozen-lockfile
```

`pnpm-workspace.yaml` cấu hình sao chép dependency để dùng được trên ổ exFAT, vốn không hỗ trợ symlink.

## Cấu hình môi trường

Sao chép `backend/.env.example` thành `backend/.env`. Không đưa `.env` vào Git.

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Địa chỉ lắng nghe |
| `PORT` | `3000` | Cổng API |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Origin FE được phép, phân cách bằng dấu phẩy, không có path hoặc dấu `/` cuối |
| `SESSION_TTL_SECONDS` | `604800` | Thời hạn phiên, mặc định 7 ngày |
| `COOKIE_SECURE` | `false` | Chỉ cho gửi cookie qua HTTPS khi bật |
| `COOKIE_SAME_SITE` | `lax` | `lax`, `strict` hoặc `none`; `none` bắt buộc `COOKIE_SECURE=true` |
| `AUTH_RATE_LIMIT_MAX` | `20` | Tổng yêu cầu đăng ký/đăng nhập tối đa mỗi IP trong một cửa sổ |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | `900` | Cửa sổ giới hạn yêu cầu xác thực |

Thêm origin thực tế của FE vào `ALLOWED_ORIGINS`. Frontend nên dùng cùng hostname với backend: cùng `localhost` hoặc cùng `127.0.0.1`, tránh trộn hai hostname vì cookie SameSite. Origin `null`, trang mở bằng `file://` và origin không được phép sẽ bị từ chối.

Nếu FE và API khác site trên HTTPS, cấu hình `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true` và origin FE cụ thể. Chính sách chặn cookie bên thứ ba của trình duyệt vẫn có thể ảnh hưởng; có thể dùng reverse proxy để đưa API về cùng origin FE.

## Kiến trúc

```text
README.md
shared/
  hunt-rules.js                # Approved Hunt configuration for browser and backend
backend/
  src/
    app.js                     # Application factory and dependency injection
    server.js                  # Server startup and shutdown
    config/
      environment.js           # Validated environment settings
      game-rules.js            # Shared Hunt rules; undecided Classic coefficient
    core/
      errors.js                # API error types
      validation.js            # Request validation
      passwords.js             # Password hashing and verification
    http/
      middleware.js            # CORS, cookies, rate limits, error responses
      routes.js                # HTTP endpoints
    modules/
      auth/service.js          # Account and session business logic
      scores/service.js        # Score calculation, records, history, ranking
    repositories/memory.js     # Temporary repository adapters
  scripts/check.js             # JavaScript syntax checks
  test/                        # HTTP and business-rule tests
  docs/repositories.md         # Adapter contract for the database owner
```

Luồng backend: **HTTP route → kiểm tra đầu vào/xác thực → service → repository → phản hồi JSON**. Service không phụ thuộc database cụ thể. Người phụ trách database có thể viết adapter theo [repository contract](backend/docs/repositories.md) rồi truyền vào `createApp({ repositories })`.

Frontend tự xử lý di chuyển, va chạm, AI con mồi, tạm dừng và cổng. Backend không điều khiển rắn và không nhận request mỗi tick.

## Quy ước API dành cho FE

- Base URL: `http://127.0.0.1:3000/api/v1`.
- Response thành công: `{ "data": ... }`.
- Response lỗi: `{ "error": { "code", "message", "details"?, "requestId" } }`.
- Mọi POST cần `Content-Type: application/json` và JSON body. Logout gửi `{}`.
- Giới hạn JSON body: 64 KB. Trường không nằm trong contract bị từ chối.
- Ngày giờ dùng ISO 8601 UTC; thời lượng dùng millisecond.
- Chế độ gửi qua API là `classic` hoặc `hunt`; tên hiển thị có thể là “The Hunt”.
- User ID luôn lấy từ phiên đăng nhập; FE không gửi `userId` để lưu điểm.
- Gửi `credentials: 'include'` trong fetch. Backend đặt cookie `snake_session` có `HttpOnly`; FE không đọc token bằng JavaScript và không cần lưu token vào localStorage.
- Luồng mới dùng `POST /auth/player` với duy nhất `username`, không cần đăng ký hoặc gửi mật khẩu. Khi chọn khách, gọi `POST /auth/guest` với `{}` kể cả trước đó chưa đăng nhập.
- Khách được chơi và đọc bảng xếp hạng. Khách không được gọi API lưu điểm, đọc kỷ lục hoặc lịch sử cá nhân; server trả 401 cho các thao tác đó.

Ví dụ gọi từ FE, chỉ là đoạn hướng dẫn tích hợp:

```javascript
const API_BASE = 'http://127.0.0.1:3000/api/v1';

async function callApi(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) {
    const error = new Error(payload.error.message);
    error.code = payload.error.code;
    error.details = payload.error.details;
    error.requestId = payload.error.requestId;
    throw error;
  }
  return payload.data;
}

const namedPlayer = await callApi('/auth/player', {
  method: 'POST',
  body: { username: 'Bảo Snake' },
});
const session = await callApi('/auth/me');
const guest = await callApi('/auth/guest', { method: 'POST', body: {} });
```

## Danh sách endpoint

Các đường dẫn dưới đây nằm sau `/api/v1`:

| Method | Endpoint | Đăng nhập | Thành công |
| --- | --- | --- | --- |
| GET | `/health` | Không | 200, trạng thái server và loại lưu trữ |
| GET | `/game-config` | Không | 200, luật và trạng thái cấu hình điểm |
| POST | `/auth/player` | Không | 200, chọn tên không mật khẩu, tạo phiên được lưu điểm |
| POST | `/auth/guest` | Không | 200, chuyển sang khách và thu hồi phiên cũ |
| POST | `/auth/register` | Không | 201, tài khoản mới |
| POST | `/auth/login` | Không | 200, thông tin tài khoản, hạn phiên và Set-Cookie |
| GET | `/auth/me` | Có | 200, tài khoản và hạn phiên |
| POST | `/auth/logout` | Có | 200, xóa phiên và cookie |
| POST | `/scores` | Có | 201 khi lưu mới, 200 khi gửi lại cùng kết quả |
| GET | `/me/records` | Có | 200, kỷ lục từng chế độ |
| GET | `/me/scores` | Có | 200, lịch sử phân trang |
| GET | `/leaderboard` | Không | 200, bảng xếp hạng theo chế độ |

### Chọn tên hoặc chơi khách — luồng hiện tại

**Chơi với tên:** gọi `POST /auth/player`, body:

```json
{ "username": "Bảo Snake" }
```

Backend tạo hồ sơ khi tên chưa tồn tại, hoặc dùng lại hồ sơ không mật khẩu khi tên đã có. Tên được chuẩn hóa Unicode NFC, bỏ khoảng trắng hai đầu và gộp nhiều dấu cách liên tiếp; không phân biệt hoa/thường khi tìm hồ sơ. Cho phép 2–30 ký tự gồm chữ (có dấu tiếng Việt), số, dấu cách, `_`, `.` hoặc `-`; ký tự đầu phải là chữ hoặc số.

Response:

```text
data: {
  user: { id, username, createdAt },
  expiresAt: <ISO UTC timestamp>,
  canSaveScores: true
}
```

Cookie `HttpOnly` được đặt cùng response. FE hiển thị `user.username` theo dữ liệu server, gửi `credentials: 'include'` cho các request tiếp theo. Khi đổi tên, gửi cùng cookie hiện tại để backend thu hồi phiên cũ và tạo phiên mới.

Tên không mật khẩu là **bí danh công khai**, không xác minh danh tính: nhập lại cùng tên sẽ dùng chung hồ sơ và thành tích. Tên của tài khoản có mật khẩu cũ không dùng được theo cách này; API trả `409 NAME_UNAVAILABLE` và người chơi cần chọn tên khác.

**Chơi khách:** gọi `POST /auth/guest`, body `{}`. Không cần có phiên trước đó. Response:

```json
{ "data": { "user": null, "canSaveScores": false } }
```

Backend thu hồi phiên tên người chơi cũ (nếu có) và xóa cookie. Khách không có user ID hoặc phiên được lưu điểm. Kể cả dùng lại cookie cũ sau khi chuyển sang khách, `POST /scores` vẫn bị từ chối bằng `401 UNAUTHENTICATED`. FE vẫn có thể chạy gameplay và hiển thị kết quả tạm trong lượt, nhưng không gửi lưu điểm và không lưu điểm khách vào lịch sử hay bảng xếp hạng.

`GET /auth/me` khôi phục phiên tên người chơi sau khi tải lại trang; 401 nghĩa là hiện chưa có phiên hợp lệ. FE hiển thị lựa chọn nhập tên/chơi khách khi đó.

**Lưu điểm và điều kiện lên bảng:** khi kết thúc lượt của người chơi có tên, FE gọi `POST /scores` theo contract phía dưới. Backend tính điểm, cập nhật kỷ lục và trả thêm:

```json
{ "leaderboard": { "limit": 10, "qualified": true, "rank": 1 } }
```

Đây là vị trí của **kỷ lục hiện tại của hồ sơ** trong Top 10 ngay sau khi lưu. `qualified: false`, `rank: null` nghĩa là chưa vào Top 10; lịch sử cá nhân vẫn ghi nhận lượt hợp lệ. FE đọc `GET /leaderboard?mode=classic&limit=10` hoặc `mode=hunt` để hiển thị bảng. Chỉ riêng việc chọn tên chưa làm xuất hiện một dòng điểm.

`canSaveScores: true` thể hiện quyền gửi kết quả. Hunt đã đủ hệ số để lưu điểm. Classic vẫn trả `409 SCORING_NOT_CONFIGURED` vì hệ số Classic còn trống; không báo lưu thành công trong trường hợp đó.

Luồng FE: **chọn tên/khách → bắt đầu lượt → kết thúc lượt → nếu có tên thì gửi kết quả → đọc trạng thái Top 10**. Cố định lựa chọn người chơi cho từng lượt; đổi người chơi thì bắt đầu lượt mới, không chuyển điểm của lượt cũ sang tên mới. Luồng này đã có trong demo được cho phép, có thể dùng làm tài liệu tham khảo để FE tích hợp.

### API tài khoản có mật khẩu cũ — tương thích

Đăng ký: `{ "username": "Player_One", "password": "your-password", "confirmPassword": "your-password" }`.

Username dùng 3–30 ký tự ASCII gồm chữ, số và `_`; phân biệt tên hiển thị nhưng không phân biệt hoa/thường khi tìm tài khoản. Password mới dài 8–128 ký tự, không tự trim. Password được hash bằng scrypt với salt ngẫu nhiên, không trả về qua API.

Đăng ký trả `{ "data": { "user": { "id", "username", "createdAt" } } }`. Đăng nhập và `/auth/me` trả `{ "data": { "user": { "id", "username", "createdAt" }, "expiresAt" } }`. Logout trả `{ "data": { "loggedOut": true } }`. Phiên đã hết hạn hoặc đã logout trả 401.

### Cấu hình game

`GET /game-config` trả luật hiện tại. Ví dụ rút gọn các trường chính (API còn có mô tả, màu sắc, hành vi và tốc độ con mồi):

```json
{
  "data": {
    "version": "hunt-v1",
    "classic": { "pointsPerFood": null },
    "hunt": {
      "snakeLengthPolicy": "fixed",
      "completionCondition": "all_prey_caught_then_enter_portal",
      "timeGraceSeconds": 60,
      "timePenaltyRounding": "whole_seconds",
      "timeScoreFloor": 0,
      "timeBonusMax": 1000,
      "timePenaltyPerSecond": 10,
      "preyCatalog": [
        { "id": "mouse", "points": 100, "moveIntervalMs": 1500, "moveDistance": 1 },
        { "id": "frog", "points": 150, "moveIntervalMs": 3000, "moveDistance": 2 }
      ],
      "levels": [
        { "id": "hunt-meadow", "preyCounts": { "mouse": 20 }, "timeBonusMax": 1000, "timePenaltyPerSecond": 10 },
        { "id": "hunt-pond", "preyCounts": { "mouse": 5, "frog": 15 }, "timeBonusMax": 1000, "timePenaltyPerSecond": 10 }
      ]
    },
    "scoringConfigured": { "classic": false, "hunt": true }
  }
}
```

FE giữ `version` từ lúc bắt đầu lượt chơi và gửi lại bằng `rulesVersion` khi lưu. Nếu `scoringConfigured[mode]` là false, có thể hiển thị “Điểm số chưa được cấu hình” và vô hiệu hóa nút lưu thành tích của chế độ đó. Backend vẫn kiểm tra trạng thái này.

### Lưu thành tích Classic

```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "classic",
  "rulesVersion": "hunt-v1",
  "foodEaten": 12,
  "activeDurationMs": 85000,
  "endReason": "collision"
}
```

`runId` là UUID mới cho mỗi lượt, FE có thể tạo bằng `crypto.randomUUID()`. Chơi lại thì tạo UUID mới; gửi lại do lỗi mạng thì giữ UUID và toàn bộ kết quả cũ. Các số lượng và thời lượng là số nguyên không âm. `endReason` Classic: `collision`, `board_filled`, `quit`.

Khi hệ số đã chốt, backend tính `foodEaten × pointsPerFood`; không nhận tổng điểm do FE tự khai. Hiện tại request hợp lệ trả 409 vì hệ số chưa cấu hình.

### Lưu thành tích The Hunt

Ví dụ lưu lượt đã qua màn 1, sau đó va chạm khi đang chơi màn 2:

```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440001",
  "mode": "hunt",
  "rulesVersion": "hunt-v1",
  "activeDurationMs": 100000,
  "endReason": "collision",
  "levelResults": [
    {
      "levelId": "hunt-meadow",
      "activeDurationMs": 75000,
      "enteredPortal": true,
      "preyCaught": { "mouse": 20 }
    }
  ]
}
```

Luật đã xác định:

1. Rắn không tăng chiều dài trong The Hunt.
2. Màn 1 có đúng 20 chuột; màn 2 có đúng 5 chuột và 15 ếch. Điểm mồi lần lượt là 2.000 và 2.750, không phụ thuộc vị trí ngẫu nhiên.
3. Ăn hết mồi chỉ mở cổng. Chỉ khi đi vào cổng mới kết thúc màn và dừng thời gian.
4. `levelResults` chỉ chứa các màn **đã ăn hết mồi và đã vào cổng**, theo đúng thứ tự cấu hình, không lặp hoặc bỏ qua màn. Màn đang dở không đóng góp điểm vào tổng lưu.
5. `preyCaught` phải khớp chính xác danh sách và số lượng mồi của màn.
6. `activeDurationMs` của mỗi màn tính từ bắt đầu màn đến vào cổng, **bao gồm thời gian tìm đường tới cổng**, không tính thời gian pause, màn giới thiệu hoặc màn kết quả.
7. Thời lượng cả lượt phải lớn hơn hoặc bằng tổng thời lượng các màn hoàn thành; có thể bao gồm thời gian chơi của màn cuối đang dở.
8. Mỗi màn bắt đầu với 1.000 điểm thời gian. 60 giây đầu giữ nguyên; sau đó trừ 10 điểm mỗi giây hoàn chỉnh. Sang màn mới, đồng hồ và điểm thời gian được đặt lại như nhau.
9. Tại 60.000–60.999 ms vẫn còn 1.000 điểm; tại 61.000 ms còn 990; từ 160.000 ms còn 0. Điểm thời gian không âm và hết điểm không làm thua.
10. Chuột đi 1 ô mỗi 1,5 giây; ếch nhảy 2 ô mỗi 3 giây. Cả hai đi xa đầu rắn hơn; đường đi và ô đáp không được trùng tường/thân/mồi khác. Ăn hết mồi nhưng va chạm trước khi vào cổng vẫn thua màn đó.

Công thức Hunt hiện tại:

```text
foodScore = sum(preyCount[type] * preyPoints[type])
penaltySeconds = floor(max(0, activeDurationMs - 60000) / 1000)
rawTimeScore = 1000 - penaltySeconds * 10
timeScore = max(0, rawTimeScore)
levelScore = foodScore + timeScore
runScore = sum(score of each completed level)
```

Tổng tối đa màn 1 là 3.000, màn 2 là 3.750, cả hai màn là **6.750 điểm**. Điểm chỉ chốt khi vào cổng; thời gian tìm đường đến cổng vẫn làm giảm thưởng khi đã quá 60 giây.

`endReason` Hunt: `collision`, `completed`, `quit`. `completed` nghĩa là đã qua cổng của **mọi màn hiện có trong cấu hình**. Backend không chấp nhận kết quả chứa tất cả màn nhưng khai kết thúc bằng collision/quit.

Không gửi `score`, `userId`, `foodScore` hoặc `timeScore` trong request. Backend tự tính điểm từ cấu hình và kết quả gửi lên. Việc kiểm tra này **chưa chứng minh lượt chơi là thật**: backend chưa chạy lại lịch sử thao tác hoặc mô phỏng gameplay để chống sửa số liệu client.

Sau khi được cấu hình, phản hồi lưu thành tích có dạng:

```text
data: {
  saved: true,
  duplicate: false,
  isNewRecord: true,
  personalBest: <calculated score>,
  leaderboard: { limit: 10, qualified: <boolean>, rank: <1-10 or null> },
  run: {
    id, runId, mode, rulesVersion, activeDurationMs, endReason,
    foodEaten?, score, scoreBreakdown: { foodScore, timeScore },
    levelResults: [{ levelId, activeDurationMs, enteredPortal, preyCaught, foodScore, timeScore, score }],
    createdAt
  }
}
```

Gửi lại cùng UUID và kết quả: 200, `duplicate: true`, giữ nguyên lượt đã lưu. Cùng UUID nhưng đổi kết quả: `409 RUN_ID_CONFLICT`. `isNewRecord` là false khi gửi lại, khi điểm thấp hơn hoặc bằng kỷ lục.

### Kỷ lục, lịch sử và bảng xếp hạng

`GET /me/records` trả:

```json
{ "data": { "classic": null, "hunt": null } }
```

Nếu có kỷ lục, giá trị tương ứng là `{ "mode", "score", "runId", "achievedAt" }`.

`GET /me/scores?mode=hunt&page=1&pageSize=20`: `mode` có thể bỏ để xem cả hai chế độ. `page` mặc định 1, `pageSize` mặc định 20 và tối đa 100. Response:

```json
{
  "data": {
    "items": [],
    "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
  }
}
```

Lịch sử chỉ thuộc tài khoản đang đăng nhập, sắp xếp mới nhất trước. Mỗi item có cấu trúc `run` như phản hồi lưu thành tích.

`GET /leaderboard?mode=classic&limit=10`: `mode` bắt buộc; `limit` mặc định 10, từ 1–100. Response:

```json
{ "data": { "mode": "classic", "items": [] } }
```

Mỗi item có `{ "rank", "username", "score", "achievedAt" }`. Mỗi người xuất hiện một lần trong từng chế độ. Điểm giảm dần; bằng điểm thì ưu tiên kỷ lục đạt trước; nếu cùng thời điểm dùng user ID để ổn định thứ tự. `rank` là vị trí liên tiếp 1, 2, 3.

### Các lỗi FE cần xử lý

| HTTP | Code | Cách xử lý |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Hiển thị lỗi trường từ `details` |
| 400 | `INVALID_JSON` | Kiểm tra JSON body |
| 401 | `INVALID_CREDENTIALS` | Báo thông tin đăng nhập không đúng |
| 401 | `UNAUTHENTICATED` | Chuyển về guest hoặc yêu cầu đăng nhập |
| 403 | `ORIGIN_NOT_ALLOWED` | Kiểm tra origin FE và cấu hình backend |
| 404 | `NOT_FOUND` | Kiểm tra endpoint |
| 409 | `USERNAME_TAKEN` | Yêu cầu chọn username khác |
| 409 | `NAME_UNAVAILABLE` | Tên đã thuộc tài khoản có mật khẩu cũ, chọn tên khác |
| 409 | `SCORING_NOT_CONFIGURED` | Hệ số/màn chưa chốt, không báo lưu điểm thành công |
| 409 | `RULES_VERSION_MISMATCH` | Tải cấu hình mới trước lượt chơi mới; không gán phiên bản mới vào kết quả cũ |
| 409 | `RUN_ID_CONFLICT` | Giữ nguyên nội dung khi retry; lượt mới phải có UUID mới |
| 413 | `PAYLOAD_TOO_LARGE` | Giảm kích thước request dưới 64 KB |
| 415 | `JSON_REQUIRED` / `UNSUPPORTED_ENCODING` | Gửi UTF-8 JSON với Content-Type phù hợp |
| 429 | `RATE_LIMITED` | Chờ số giây trong header `Retry-After` |
| 500 | `INTERNAL_ERROR` | Ghi nhận `requestId` để đối chiếu lỗi backend |

Ví dụ lỗi:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": [{ "field": "confirmPassword", "message": "Must match password." }],
    "requestId": "generated-request-id"
  }
}
```

## Kiểm thử

`pnpm test` chạy kiểm thử HTTP và nghiệp vụ: chọn tên không mật khẩu, tên Unicode, tên trùng, khách không được lưu điểm, chuyển tên/khách thu hồi phiên cũ, điều kiện vào Top 10, tài khoản cũ, cookie, hết hạn phiên, logout, CORS, JSON lỗi, rate limit, phân quyền dữ liệu, lưu trùng, kỷ lục và The Hunt. Kiểm thử chạy với repository trong bộ nhớ và thời gian có thể điều khiển, không cần database.

`pnpm check` kiểm tra cú pháp toàn bộ JavaScript trong source, test, scripts và cấu hình shared.

## Những quyết định còn chờ

- Hệ số điểm Classic.
- Các màn mở rộng sau hai màn Hunt hiện có; hai màn đầu và hệ số của chúng đã được chốt.
- Adapter database do phần phụ trách database thực hiện. Backend hiện không có dependency MySQL hoặc mã SQL.

## Tài liệu kỹ thuật tham khảo

- [Express API](https://expressjs.com/en/5x/api/)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)
- [Node.js Test Runner](https://nodejs.org/api/test.html)
- [pnpm settings](https://pnpm.io/settings)
