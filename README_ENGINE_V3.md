# NovelReader Parser — Engine v3 (chuẩn hoá theo vBook Extension API)

Bộ 66 source đã được viết lại phần **logic lấy truyện** để trả về dữ liệu đầy đủ như
các extension mẫu trong `vbook-extensions-master` (`detail.js`, `toc.js`, `chap.js`).

## 1. Cách nâng cấp

- Giữ nguyên `config` cũ của từng site (selector, webview, checker, proxy, interceptor...)
  nên **không phá vỡ** các site đang chạy tốt.
- Thay toàn bộ engine dùng chung bằng engine v3, thêm nhiều tầng dò dữ liệu:
  1. selector trong `config` (ưu tiên cao nhất)
  2. `config.detail.*` — selector chi tiết mới, đã bổ sung sẵn cho 10 site lớn
     (truyenfull, tangthuvien, metruyencv, sstruyen, sangtacviet, wattpad, docln,
     truyenyy, truyenchu, metruyenchuvn)
  3. JSON-LD (`Book`, `Novel`, `CreativeWork`)
  4. OpenGraph / `og:novel:*` / `itemprop`
  5. Quét bảng nhãn tiếng Việt (Tác giả:, Thể loại:, Trạng thái:, Số chương:, Lượt đọc:,
     Đánh giá:, Cập nhật:, Nguồn:, Dịch giả:, Số từ:)
  6. Heuristic theo cấu trúc DOM

## 2. `parseStory` / `parseDetail` — dữ liệu truyện

| Nhóm | Trường |
|------|--------|
| Định danh | `sourceId`, `host`, `url`, `storyUrl`, `canonicalUrl` |
| Chính | `title`/`name`, `altNames`, `author`, `authorUrl`, `artist`, `translator`, `originalSource`, `coverUrl` |
| Mô tả | `description` (text sạch), `descriptionHtml` (HTML đã lọc script/ads/attr rác) |
| Phân loại | `genres[{title,url}]`, `tags[]` |
| Trạng thái | `status` (`ongoing`/`completed`/`dropped`), `statusText`, `ongoing`, `completed` |
| Số liệu | `rating`, `ratingCount`, `views`, `wordCount`, `updatedAt`, `totalChapters` |
| Chương | `chapters[]`, `chapterCount`, `firstChapterUrl`, `latestChapter`, `randomChapter` |
| Phân trang TOC | `tocPages[]`, `tocTotalPages`, `nextTocUrl`, `buildTocPageUrl(url, page)` |
| Khác | `suggests[]`, `needWebview`, `mayNeedVpn`, `engine` |

Mỗi chương trong `chapters[]`: `name`, `title`, `url`, `index`, `number` (số chương
parse từ tên/URL), `updatedAt`, `lock`, `pay` (nhận diện chương VIP/khoá), `host`.

## 3. `parseChapter` — nội dung chương

Thêm `contentHtml` (HTML sạch, giữ xuống dòng/đoạn), `wordCount`, `readingMinutes`,
`chapterNumber`, `host`, `empty`; vẫn giữ `content`, `storyTitle`, `chapterTitle`,
`storyUrl`, `chapterUrl`, `nextUrl`, `previousUrl`, `coverUrl`.

Bộ lọc nội dung mạnh hơn: loại `script/style/iframe/svg/form/button/ins/.ads`,
xoá attribute rác (chỉ giữ `href/src/alt/title`), xoá dòng rác kiểu
“quảng cáo / đọc truyện tại… / vui lòng đăng nhập / báo lỗi chương”.

## 4. `parseSearch` — kết quả tìm kiếm

Thêm `description`, `cover`, `author`, `latestChapter{name,url}`, `tag`, `host`,
và `searchUrls()` có fallback 3 mẫu URL tìm kiếm phổ biến khi site chưa khai báo.

## 5. API (giữ nguyên cách gọi cũ, chỉ thêm hàm mới)

```js
NovelReaderSource.execute("resolveInput",   { html, url })
NovelReaderSource.execute("parseStory",     { html, url })   // = parseDetail
NovelReaderSource.execute("parseChapter",   { html, url })
NovelReaderSource.execute("parseChapterList",{ html, url })
NovelReaderSource.execute("parseTocPages",  { html, url })   // mới
NovelReaderSource.execute("buildTocPageUrl",{ url, page })   // mới
NovelReaderSource.execute("parseSearch",    { html, url })
NovelReaderSource.execute("pickRandomChapter", { html, url, seed })
NovelReaderSource.execute("isReady",        { html })
```

`headers()` nay trả sẵn User-Agent Chrome Android (giống `UserAgent.chrome()` của vBook).

## 6. Manifest

Mỗi `manifest.json` được `version + 1`, thêm `"engine": 3` và capabilities mới:
`story_metadata`, `chapter_pagination`, `rich_search`.

## 7. Kiểm thử

Chạy thử toàn bộ 66 source trong Chromium headless với fixture HTML kiểu truyenfull:
**66/66 chạy được, 0 lỗi**, lấy đúng tác giả, thể loại, trạng thái, số chương,
lượt đọc, đánh giá, ảnh bìa, danh sách chương, phân trang và nội dung chương.
