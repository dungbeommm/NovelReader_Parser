# NovelReader Parser JS v2

Bộ **66 parser JavaScript độc lập** chuyển từ NovelReader V73 và nâng cấp để nhận một URL duy nhất.

## Khả năng mới

- Nhận link trang truyện hoặc link chương bằng `resolveInput()`.
- Tự tìm chương đầu.
- Chọn một chương ngẫu nhiên ổn định theo ngày bằng `pickRandomChapter()`.
- Lấy ảnh bìa từ Open Graph, Twitter Card, JSON-LD và selector ảnh phổ biến.
- Tìm ngược trang truyện từ trang chương.
- Lấy tên truyện, tên chương, nội dung, chương trước/sau.
- Chạy được qua Android WebView bằng `execute()` trả chuỗi JSON.

## Cấu trúc

```text
sources/<domain>/<domain>.js
sources/<domain>/manifest.json
sources.json
scripts/live_health_check.mjs
```

## API mỗi nguồn

```javascript
NovelReaderSource.resolveInput(html, url)
NovelReaderSource.parseStory(html, url)
NovelReaderSource.parseChapter(html, url)
NovelReaderSource.parseChapterList(html, url)
NovelReaderSource.getFirstChapterUrl(html, url)
NovelReaderSource.pickRandomChapter(html, url, seed)
NovelReaderSource.findCover(html, url)
```

## Luồng URL trang truyện

1. `resolveInput()` nhận diện đây là trang truyện.
2. `parseStory()` lấy tên, bìa, chương đầu và danh sách chương.
3. `pickRandomChapter()` chọn chương kiểm thử.
4. App tải URL chương rồi gọi `parseChapter()`.

## Kiểm tra trực tiếp

```bash
npm install
npx playwright install chromium
node scripts/live_health_check.mjs
```

Báo cáo được ghi vào `reports/live-health.json`. Website chặn bot, yêu cầu đăng nhập hoặc khóa chương có thể không vượt qua health check dù cú pháp parser vẫn hợp lệ.

## Config dành cho ứng dụng Android

File `parser.json` ở thư mục gốc là cấu hình Kotlin mà NovelReader tải tự động. Khi sửa nguồn, cần cập nhật cả `parser.json` và parser JS tương ứng. App giữ bản mặc định trong APK và chỉ kích hoạt file mới sau khi kiểm tra JSON hợp lệ.
