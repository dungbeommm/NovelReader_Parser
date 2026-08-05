# NovelReader Parser

Bộ parser source cho app đọc truyện (tương thích luồng **Novel Reader APK** + metadata kiểu **vBook Extension**).

## Engine v4 — nâng cấp lấy truyện & ảnh

Engine v4 được viết lại dựa trên:

1. **`parser.json` trong Novel Reader 3.3.22** — selector `title` / `chapter` / `content` / `next_button` / `pre_button` / `detail_first_chapter` / `content_load_js` / webview checkers.
2. **vBook extensions** (`detail.js`, `toc.js`, `chap.js`, `search.js`, `page.js`) — cách lấy:
   - **Cover**: `div.book img`, `data-src`, `data-pagespeed-high-res-src`, `data-image`, `srcset` (chọn bản rộng nhất), `meta[property=og:image]`, `itemprop=thumbnailUrl`, `<picture><source>`
   - **Detail**: `name`, `cover`, `author`, `description` (HTML), `detail`, `ongoing`, `genres`, `suggests`, `host`
   - **TOC**: list chapter + phân trang / ajax `list_chapter` (truyenfull)
   - **Chap**: HTML sạch, giữ ảnh trong chương, nhận chapter chỉ có ảnh
   - **Search**: cover từ `data-image` / lazy attrs, `next` page

### Cải tiến chính so với v3

| Hạng mục | Chi tiết |
|----------|----------|
| Cover thông minh | Ưu tiên high-res attrs, lọc logo/favicon/pixel, chấm điểm URL, JSON-LD, `data-image` |
| VBook detail compat | Trả `name/cover/author/description/detail/ongoing/genres/suggests/host` |
| Ảnh trong chương | `images[]`, `imageOnly`, `contentHtml` giữ `img[src]` |
| TOC | Parse HTML + JSON `chap_list` + mảng chapter; `toc_ajax` cho truyenfull |
| Search | Trả `{ items, next }`, cover lazy/data-image |
| Headers | Chrome Android UA + `vi-VN` |

## Cấu trúc repo

```
_engine_v4_template.js     # template engine
catalog.json               # index toàn bộ source
sources/<domain>/          # mỗi source 1 folder
  manifest.json
  <domain>.js
reference/                 # parser.json gốc extract từ APK
README.md
```

Hiện có **71** source (merge từ APK VI + EN parser).

## API (giữ tương thích v3)

```js
NovelReaderSource.execute("resolveInput",    { html, url })
NovelReaderSource.execute("parseStory",      { html, url })  // = parseDetail
NovelReaderSource.execute("parseChapter",    { html, url })
NovelReaderSource.execute("parseChapterList",{ html, url })  // HTML hoặc JSON chap_list
NovelReaderSource.execute("parseTocPages",   { html, url })
NovelReaderSource.execute("buildTocPageUrl", { url, page })
NovelReaderSource.execute("parseSearch",     { html, url })
NovelReaderSource.execute("findCover",       { html, url })
NovelReaderSource.execute("pickRandomChapter", { html, url, seed })
NovelReaderSource.execute("isReady",         { html })
```

### `parseStory` fields (rút gọn)

- VBook: `name`, `cover`, `author`, `description`, `detail`, `ongoing`, `genres[]`, `suggests[]`, `host`
- Mở rộng: `coverUrl`, `descriptionHtml`, `descriptionText`, `status`, `chapters[]`, `tocPages`, `tocMode`, `firstChapterUrl`, `latestChapter`, `rating`, `views`, ...

### `parseChapter` fields

- `content`, `contentHtml`, `images[{url,alt}]`, `imageOnly`, `nextUrl`, `previousUrl`, `wordCount`, ...

### `parseSearch`

```json
{ "items": [{ "name", "link", "cover", "author", "description", "host" }], "next": "..." }
```

## Nguồn tham chiếu đã dùng để build

- Novel Reader APK `assets/parser.json` + `en_parser.json` (3.3.22)
- vBook extensions: truyenfull, tangthuvien, sstruyen, truyenyy, truyenchu, chivi, ...

## Ghi chú tích hợp app

1. Load `catalog.json` hoặc từng `manifest.json`.
2. Fetch HTML (hoặc dùng webview nếu `use_webview`).
3. Gọi `execute("isReady")` trước khi parse khi site cần chờ JS.
4. Cover: dùng `cover` / `coverUrl`; với list search ưu tiên field `cover` đã resolve lazy-load.
5. Chapter ảnh: nếu `imageOnly` hoặc `images.length > 0`, render ảnh kèm/ thay text.

## Versioning

- `engine: 4`
- Mỗi source `version: 4` (bump khi đổi selector site)
