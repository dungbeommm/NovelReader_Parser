/* NovelReader source: hatduahau.com | Engine v4 (VBook + NovelReader APK cover/story). Auto-generated. */
(function (global) {
  "use strict";

  const config = {"logo":"https://www.google.com/s2/favicons?sz=128&domain=hatduahau.com","domain":"hatduahau.com","keys":["hatduahau","hatduahau.com"],"use_html_parser":true,"use_webview":true,"title":{"selector":"#breadcrumb-manga"},"chapter":{"selector":"h1.uk-h2"},"content":{"selector":"#chapter-content"},"next_button":{"selector":"#next-link","value":"href"},"pre_button":{"selector":"#prev-link","value":"href"},"detail_first_chapter":{"selector":"a.uk-button-primary[href*='/chuong-1/']","value":"href","element_indexed":0},"data_ready_checker":["Đang tải nội dung..."]};
  const VERSION = 4;
  const ENGINE = 4;

  /* ------------------------------------------------------------------ *
   * Hằng số dò tìm (chuẩn hoá từ vBook detail/search + APK parser.json)
   * ------------------------------------------------------------------ */
  const COMMON_CONTENT = "#chapter-c,.chapter-c,#chapter-content,.chapter-content,.reading-content,.entry-content,.content-chapter,.chapter-body,#chapterbody,#chr-content,.chr-c,#content,.text-content,.content-body-wrapper,article .content,.post-content,.article-content,.box-chap,.reader-content,.contentbox,#inner_chap_content_1,.chap-content,#bookContentBody";
  const CHAPTER_PATTERN = /(chuong|chapter|chap|episode|\/c\/|-c-|tap|quyen)[-_\/]?\d/i;
  const BAD_BLOCK = /(comment|footer|header|menu|nav|sidebar|breadcrumb|share|social|advert|\bads?\b|banner|related|recommend|widget|pagination|popup)/i;
  const JUNK_INLINE = /(quảng cáo|nguồn:\s*truyen|đọc truyện tại|vui lòng đăng nhập|báo lỗi chương|donate|patreon|ko-fi)/i;
  const BAD_COVER = /(logo|favicon|sprite|icon[_-]?\d|avatar|blank|placeholder|1x1|pixel|spacer|loading\.gif|ads?[_-]|banner|button)/i;

  const LABELS = {
    author: ["tác giả", "tacgia", "author", "作者", "au"],
    artist: ["họa sĩ", "minh họa", "artist", "illustrator"],
    translator: ["dịch giả", "người dịch", "nhóm dịch", "converter", "editor", "translator", "nhóm"],
    genres: ["thể loại", "theloai", "genre", "genres", "category", "danh mục", "分类"],
    tags: ["tag", "tags", "từ khóa", "thẻ"],
    status: ["trạng thái", "tình trạng", "status", "状态"],
    source: ["nguồn", "source", "raw"],
    chapters: ["số chương", "số chapter", "chương", "chapters"],
    views: ["lượt đọc", "lượt xem", "lượt view", "view", "views", "đọc"],
    rating: ["đánh giá", "điểm", "rating", "vote", "score"],
    updated: ["cập nhật", "mới nhất", "updated", "last update"],
    words: ["số từ", "số chữ", "word count", "字数"]
  };

  const STATUS_DONE = /(hoàn thành|hoàn tất|full|completed|complete|đã xong|đã hoàn|已完结|完本)/i;
  const STATUS_ONGOING = /(đang ra|đang tiến hành|đang cập nhật|còn tiếp|ongoing|updating|连载)/i;
  const STATUS_DROP = /(tạm ngưng|tạm dừng|drop|dropped|ngừng)/i;

  const COVER_SELECTORS = [
    'meta[property="og:image"]',
    'meta[property="og:image:secure_url"]',
    'meta[name="twitter:image"]',
    'meta[itemprop="image"]',
    'meta[itemprop="thumbnailUrl"]',
    '[itemprop="thumbnailUrl"]',
    'div.book img',
    '.book img',
    '.book-cover img',
    '.book-img img',
    '.story-cover img',
    '.novel-cover img',
    '.series-cover img',
    '.cover img',
    '.thumb img',
    '.thumbnail img',
    '.image-story img',
    '#anhbia img',
    '.books img',
    '.info-holder img',
    '.book-info img',
    '.book-information img',
    'img[itemprop="image"]',
    '.detail img',
    '.wrap-detail img',
    'picture source',
    '.cover source'
  ];

  const IMAGE_ATTRS = [
    "data-pagespeed-high-res-src",
    "data-lazy-src",
    "data-original",
    "data-src",
    "data-url",
    "data-cfsrc",
    "data-image",
    "data-bg",
    "data-background",
    "data-srcset",
    "srcset",
    "src"
  ];

  /* ------------------------------------------------------------------ *
   * Tiện ích DOM
   * ------------------------------------------------------------------ */
  function asDocument(input) {
    if (input && input.nodeType === 9) return input;
    if (typeof input === "string" && typeof DOMParser !== "undefined") {
      return new DOMParser().parseFromString(input, "text/html");
    }
    if (typeof document !== "undefined") return document;
    throw new Error("Không có DOM để phân tích");
  }

  function sourceHtml(input, doc) {
    if (typeof input === "string") return input;
    return doc && doc.documentElement ? doc.documentElement.outerHTML : "";
  }

  function splitSelectors(selector) {
    if (!selector) return [];
    const out = [];
    let quote = "", square = 0, round = 0, start = 0;
    for (let i = 0; i < selector.length; i++) {
      const ch = selector[i];
      if (quote) { if (ch === quote && selector[i - 1] !== "\\") quote = ""; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (ch === "[") square++; else if (ch === "]") square = Math.max(0, square - 1);
      else if (ch === "(") round++; else if (ch === ")") round = Math.max(0, round - 1);
      else if (ch === "," && square === 0 && round === 0) { out.push(selector.slice(start, i).trim()); start = i + 1; }
    }
    out.push(selector.slice(start).trim());
    return out.filter(Boolean);
  }

  function queryPart(root, part) {
    const match = part.match(/:contains\((?:"([^"]*)"|'([^']*)'|([^)]*))\)/i);
    let css = part, wanted = "";
    if (match) { wanted = (match[1] || match[2] || match[3] || "").trim().toLowerCase(); css = part.replace(match[0], "").trim() || "*"; }
    try {
      const nodes = Array.from(root.querySelectorAll(css));
      return wanted ? nodes.filter(n => text(n).toLowerCase().includes(wanted)) : nodes;
    } catch (_) { return []; }
  }

  function queryAll(root, selector) {
    if (!root || !selector) return [];
    const result = [], seen = new Set();
    for (const part of splitSelectors(selector)) {
      for (const node of queryPart(root, part)) if (!seen.has(node)) { seen.add(node); result.push(node); }
    }
    return result;
  }

  function one(root, selector, index) {
    const nodes = queryAll(root, selector);
    const i = Number.isInteger(index) ? index : 0;
    return nodes[i] || null;
  }

  function text(node) {
    return node ? String(node.innerText || node.textContent || "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim() : "";
  }

  function attr(node, name) {
    return node && node.getAttribute ? (node.getAttribute(name) || "") : "";
  }

  function absolute(base, value) {
    if (!value || value === "#" || /^javascript:/i.test(value) || /^data:/i.test(value)) return "";
    let v = String(value).trim().replace(/^['"]|['"]$/g, "");
    if (v.startsWith("//")) v = "https:" + v;
    try { return new URL(v, base || "https://example.com").href; } catch (_) { return v; }
  }

  function unique(list) {
    const seen = new Set(), out = [];
    for (const item of list || []) {
      const key = typeof item === "string" ? item : JSON.stringify(item);
      if (!key || seen.has(key)) continue;
      seen.add(key); out.push(item);
    }
    return out;
  }

  function toNumber(value) {
    const s = String(value == null ? "" : value).trim().toLowerCase();
    if (!s) return null;
    const m = s.replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*([kmbtriệu]*)/i);
    if (!m) return null;
    let n = parseFloat(m[1]);
    const u = m[2] || "";
    if (/^k/i.test(u)) n *= 1000;
    else if (/^m|tr|triệu/i.test(u)) n *= 1000000;
    else if (/^b/i.test(u)) n *= 1000000000;
    return Number.isFinite(n) ? Math.round(n) : null;
  }

  function toFloat(value) {
    const m = String(value == null ? "" : value).replace(",", ".").match(/\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  function hostOf(url) {
    try { const u = new URL(url); return `${u.protocol}//${u.host}`; } catch (_) { return ""; }
  }

  /* ------------------------------------------------------------------ *
   * Field resolver (tương thích config cũ APK NovelReader)
   * ------------------------------------------------------------------ */
  function slice(raw, field) {
    if (!field || !field.start) return "";
    let begin = raw.indexOf(field.start);
    if (begin < 0) return "";
    begin += field.start.length;
    if (field.middle) { const middle = raw.indexOf(field.middle, begin); if (middle < 0) return ""; begin = middle + field.middle.length; }
    let end = field.end ? raw.indexOf(field.end, begin) : raw.length;
    if (end < 0) end = raw.length;
    return raw.slice(begin, end);
  }

  function fieldValue(root, field, baseUrl, rawHtml) {
    if (!field) return "";
    if (field.start) return slice(rawHtml || "", field).trim();
    const el = one(root, field.selector, field.element_indexed);
    if (!el) return "";
    const name = field.value;
    if (!name || name === "text") return text(el);
    if (name === "html") return el.innerHTML || "";
    let value = attr(el, name);
    if (!value && field.fallback_value) value = attr(el, field.fallback_value);
    if (["href", "src", "data-src", "data-url", "data-href", "data-image", "data-original", "data-lazy-src", "data-pagespeed-high-res-src", "srcset", "content"].includes(name) || field.fallback_value) {
      if (name === "srcset" || field.fallback_value === "srcset") value = bestFromSrcset(value || attr(el, "srcset")) || value;
      value = absolute(baseUrl, value);
    }
    if (!value && (!name || name === "text")) return text(el);
    return String(value || "").trim();
  }

  function firstText(root, selectors) {
    for (const selector of selectors) {
      const el = one(root, selector);
      if (!el) continue;
      if (el.tagName && el.tagName.toLowerCase() === "meta") {
        const value = attr(el, "content").trim();
        if (value) return value;
        continue;
      }
      const value = text(el);
      if (value) return value;
    }
    return "";
  }

  function removeNodes(root, selectors) {
    for (const item of selectors || []) {
      const selector = typeof item === "string" ? item : (item && item.selector);
      if (!selector) continue;
      for (const node of queryAll(root, selector)) try { node.remove(); } catch (_) {}
    }
  }

  function htmlToText(node) {
    if (!node) return "";
    const clone = node.cloneNode(true);
    removeNodes(clone, ["script", "style", "noscript", "template", "iframe", "svg", "canvas", "ins"]);
    for (const br of queryAll(clone, "br")) br.replaceWith("\n");
    for (const p of queryAll(clone, "p,div,section,article,li,h1,h2,h3,h4")) p.append("\n");
    return text(clone).replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function sanitizeHtml(node, keepImages) {
    if (!node) return "";
    const clone = node.cloneNode(true);
    removeNodes(clone, ["script", "style", "noscript", "template", "iframe", "svg", "canvas", "form", "button", "ins", ".ads", ".ads-responsive", "[class*=advert]", "[id*=advert]", "[style*='font-size:0']", "[style*='font-size: 0']"]);
    // vBook chap.js: remove bare anchors often used for ads
    for (const a of queryAll(clone, "a")) {
      const href = attr(a, "href");
      const t = text(a);
      if (!href || /ads|click|bit\.ly|goo\.gl/i.test(href) || (t && JUNK_INLINE.test(t))) {
        try { a.replaceWith(document.createTextNode(t)); } catch (_) {
          try { a.remove(); } catch (__) {}
        }
      }
    }
    for (const el of queryAll(clone, "*")) {
      const tag = (el.tagName || "").toLowerCase();
      const keep = keepImages && tag === "img"
        ? ["src", "data-src", "data-original", "data-lazy-src", "alt", "title"]
        : ["href", "src", "alt", "title"];
      for (const name of Array.from(el.attributes || []).map(a => a.name)) {
        if (!keep.includes(name)) { try { el.removeAttribute(name); } catch (_) {} }
      }
      if (tag === "img" && keepImages) {
        const src = imageValue(el, "");
        if (src) try { el.setAttribute("src", src); } catch (_) {}
      }
      if (JUNK_INLINE.test(text(el)) && text(el).length < 120 && tag !== "img") {
        try { el.remove(); } catch (_) {}
      }
    }
    return String(clone.innerHTML || "").replace(/\s{2,}/g, " ").trim();
  }

  function cleanContent(value) {
    let out = String(value || "").replace(/\r/g, "").replace(/\u00a0/g, " ");
    for (const rule of config.content_removes || []) {
      if (!rule || !rule.start) continue;
      let begin = out.indexOf(rule.start);
      while (begin >= 0) {
        let end = rule.end ? out.indexOf(rule.end, begin + rule.start.length) : out.length;
        if (end < 0) end = out.length; else end += rule.end.length;
        out = out.slice(0, begin) + out.slice(end);
        begin = out.indexOf(rule.start);
      }
    }
    for (const value of config.content_replaces || []) if (value) out = out.split(value).join("");
    // strip leftover ad-like lines
    out = out.split("\n").filter(line => !JUNK_INLINE.test(line) || line.length > 160).join("\n");
    return out.replace(/[ \t]+\n/g, "\n").replace(/\n[ \t]+/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ------------------------------------------------------------------ *
   * Metadata: JSON-LD + OpenGraph + bảng nhãn
   * ------------------------------------------------------------------ */
  function jsonLdNodes(doc) {
    const out = [];
    for (const node of queryAll(doc, 'script[type="application/ld+json"]')) {
      let data;
      try { data = JSON.parse((node.textContent || "").trim()); } catch (_) { continue; }
      const stack = Array.isArray(data) ? data.slice() : [data];
      while (stack.length) {
        const item = stack.pop();
        if (!item || typeof item !== "object") continue;
        out.push(item);
        if (Array.isArray(item["@graph"])) stack.push.apply(stack, item["@graph"]);
      }
    }
    return out;
  }

  function ldName(value) {
    if (!value) return "";
    if (typeof value === "string") return value.trim();
    if (Array.isArray(value)) return value.map(ldName).filter(Boolean).join(", ");
    return String(value.name || value["@id"] || "").trim();
  }

  function metaContent(doc, names) {
    for (const name of names) {
      const el = one(doc, `meta[property="${name}"], meta[name="${name}"], meta[itemprop="${name}"]`);
      const value = attr(el, "content").trim();
      if (value) return value;
    }
    return "";
  }

  function labelRows(doc) {
    const rows = [];
    const holders = queryAll(doc, ".info div, .info p, .info li, .book-info p, .book-info li, .detail p, .detail li, .story-info p, .story-info li, .truyen-info p, .truyen-info li, .meta li, .meta p, table tr, ul.list-info li, .book-information p, .item, .info-item, dl div, .novel-meta li, .novel-meta p, .content1 div.info, .justify-end");
    for (const el of holders) {
      const whole = text(el);
      if (!whole || whole.length > 400) continue;
      const parts = whole.split(/[::]/);
      if (parts.length < 2) continue;
      const label = parts.shift().trim().toLowerCase();
      const value = parts.join(":").trim();
      if (!label || !value || label.length > 40) continue;
      rows.push({ label, value, el });
    }
    return rows;
  }

  function rowFor(rows, keys) {
    for (const row of rows) for (const key of keys) if (row.label.includes(key)) return row;
    return null;
  }

  function linksIn(el, baseUrl) {
    return queryAll(el, "a[href]").map(a => ({ title: text(a), url: absolute(baseUrl, attr(a, "href")) })).filter(x => x.title);
  }

  function splitList(value) {
    return String(value || "").split(/[,;\/|·•]/).map(s => s.trim()).filter(s => s && s.length < 60);
  }

  function normalizeStatus(raw) {
    const value = String(raw || "");
    if (STATUS_DONE.test(value)) return { status: "completed", ongoing: false };
    if (STATUS_DROP.test(value)) return { status: "dropped", ongoing: false };
    if (STATUS_ONGOING.test(value)) return { status: "ongoing", ongoing: true };
    return { status: "", ongoing: null };
  }

  /* ------------------------------------------------------------------ *
   * Ảnh bìa / ảnh trong chương — bám pattern VBook + APK og:image
   * ------------------------------------------------------------------ */
  function bestFromSrcset(srcset) {
    if (!srcset) return "";
    let best = "", bestW = -1;
    for (const part of String(srcset).split(",")) {
      const bits = part.trim().split(/\s+/);
      if (!bits[0]) continue;
      const wMatch = (bits[1] || "").match(/(\d+)w/i);
      const w = wMatch ? parseInt(wMatch[1], 10) : 0;
      if (w >= bestW) { bestW = w; best = bits[0]; }
      if (!bits[1] && !best) best = bits[0];
    }
    return best;
  }

  function isBadCoverUrl(url) {
    if (!url) return true;
    if (/^data:/i.test(url)) return true;
    if (BAD_COVER.test(url)) return true;
    // tiny tracking pixels often end with =1 or /1.gif
    if (/\/(1x1|pixel|blank)\b/i.test(url)) return true;
    return false;
  }

  function imageValue(el, baseUrl) {
    if (!el) return "";
    const tag = el.tagName ? el.tagName.toLowerCase() : "";
    if (tag === "meta") {
      const c = absolute(baseUrl, attr(el, "content"));
      return isBadCoverUrl(c) ? "" : c;
    }
    // picture/source
    if (tag === "source") {
      const ss = bestFromSrcset(attr(el, "srcset") || attr(el, "data-srcset"));
      const abs = absolute(baseUrl, ss || attr(el, "src"));
      return isBadCoverUrl(abs) ? "" : abs;
    }
    for (const name of IMAGE_ATTRS) {
      let value = attr(el, name);
      if (!value) continue;
      if (name === "srcset" || name === "data-srcset") value = bestFromSrcset(value);
      const abs = absolute(baseUrl, value);
      if (abs && !isBadCoverUrl(abs)) return abs;
    }
    // style background-image
    const style = attr(el, "style") || "";
    const bg = style.match(/url\((['"]?)(.*?)\1\)/i);
    if (bg) {
      const abs = absolute(baseUrl, bg[2]);
      if (abs && !isBadCoverUrl(abs)) return abs;
    }
    // parent data-image (truyenfull search cards)
    const parent = el.parentElement;
    if (parent) {
      const di = attr(parent, "data-image") || attr(el, "data-image");
      const abs = absolute(baseUrl, di);
      if (abs && !isBadCoverUrl(abs)) return abs;
    }
    return "";
  }

  function scoreCoverUrl(url) {
    if (!url) return -1e9;
    let s = 0;
    if (/cover|bia|thumb|poster|book/i.test(url)) s += 5;
    if (/\.(webp|jpg|jpeg|png)(\?|$)/i.test(url)) s += 2;
    if (/uploads|images|files|covers/i.test(url)) s += 2;
    if (isBadCoverUrl(url)) s -= 50;
    const dim = url.match(/(\d{2,4})x(\d{2,4})/);
    if (dim) s += Math.min(10, (parseInt(dim[1], 10) * parseInt(dim[2], 10)) / 20000);
    return s;
  }

  function coverFromJsonLd(doc, baseUrl) {
    const cands = [];
    for (const item of jsonLdNodes(doc)) {
      const image = item.image || item.thumbnailUrl;
      const list = Array.isArray(image) ? image : [image];
      for (const img of list) {
        const value = img && typeof img === "object" ? (img.url || img.contentUrl) : img;
        const abs = absolute(baseUrl, value);
        if (abs && !isBadCoverUrl(abs)) cands.push(abs);
      }
    }
    cands.sort((a, b) => scoreCoverUrl(b) - scoreCoverUrl(a));
    return cands[0] || "";
  }

  function findCover(input, pageUrl) {
    const doc = asDocument(input);
    const raw = sourceHtml(input, doc);
    const cands = [];

    // 1) config.cover (VBook-style / site override)
    if (config.cover) {
      const configured = fieldValue(doc, config.cover, pageUrl, raw);
      if (configured) cands.push(absolute(pageUrl, configured));
      // multi-attr fallback on same selector
      const el = one(doc, config.cover.selector, config.cover.element_indexed);
      if (el) {
        const v = imageValue(el, pageUrl);
        if (v) cands.push(v);
      }
    }

    // 2) known selectors (APK uses og:image; VBook uses div.book img, data-src, srcset...)
    for (const selector of COVER_SELECTORS) {
      for (const el of queryAll(doc, selector).slice(0, 4)) {
        const v = imageValue(el, pageUrl);
        if (v) cands.push(v);
      }
    }

    // 3) any [data-image] on page (truyenfull lists)
    for (const el of queryAll(doc, "[data-image]").slice(0, 5)) {
      const v = absolute(pageUrl, attr(el, "data-image"));
      if (v && !isBadCoverUrl(v)) cands.push(v);
    }

    // 4) JSON-LD
    const ld = coverFromJsonLd(doc, pageUrl);
    if (ld) cands.push(ld);

    // 5) largest reasonable content image near book info
    for (const el of queryAll(doc, ".book-information img, .book-info img, .info img, article img").slice(0, 8)) {
      const v = imageValue(el, pageUrl);
      if (v) cands.push(v);
    }

    const cleaned = unique(cands.filter(u => u && !isBadCoverUrl(u)));
    cleaned.sort((a, b) => scoreCoverUrl(b) - scoreCoverUrl(a));
    return cleaned[0] || "";
  }

  function extractContentImages(node, baseUrl) {
    if (!node) return [];
    const out = [];
    for (const img of queryAll(node, "img")) {
      const url = imageValue(img, baseUrl);
      if (url && !isBadCoverUrl(url)) out.push({ url, alt: attr(img, "alt") || "" });
    }
    // vBook note: some chapters are image-only
    return unique(out);
  }

  function findStoryUrl(input, pageUrl) {
    const doc = asDocument(input);
    for (const selector of ['meta[property="og:url"]', 'link[rel="canonical"]']) {
      const el = one(doc, selector);
      const raw = el && (attr(el, "content") || attr(el, "href"));
      if (raw && !CHAPTER_PATTERN.test(raw)) return absolute(pageUrl, raw);
    }
    const crumbs = queryAll(doc, '.breadcrumb a[href],nav[aria-label="breadcrumb"] a[href],a.book-title[href],a.story-title[href],.truyen-title a[href]');
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const url = absolute(pageUrl, attr(crumbs[i], "href"));
      if (url && !CHAPTER_PATTERN.test(url)) return url;
    }
    try {
      const u = new URL(pageUrl);
      u.pathname = u.pathname.replace(/\/(chuong|chapter|chap)[-_\/]?[^/]+\/?$/i, "/");
      u.search = "";
      return u.href;
    } catch (_) { return ""; }
  }

  function guessTitle(doc) {
    const meta = metaContent(doc, ["og:title", "twitter:title"]);
    if (meta) return meta.replace(/\s*[|–-].*$/, "").trim();
    for (const selector of ["h1", "h2", ".chapter-title", ".chapter-name", ".chr-title"]) {
      const value = text(one(doc, selector));
      if (value) return value;
    }
    return doc.title || "";
  }

  function guessStoryTitle(doc) {
    const meta = metaContent(doc, ["og:novel:book_name", "books:title", "og:title"]);
    if (meta) return meta.replace(/\s*[|–-].*$/, "").trim();
    for (const selector of [".story-title", ".truyen-title", ".book-title", ".novel-title", "h1.title", "h3.title", "h1"]) {
      const value = text(one(doc, selector));
      if (value) return value;
    }
    const crumbs = queryAll(doc, ".breadcrumb a,nav[aria-label=breadcrumb] a");
    return crumbs.length ? text(crumbs[crumbs.length - 1]) : "";
  }

  /* ------------------------------------------------------------------ *
   * Danh sách chương + phân trang (VBook toc.js / page.js)
   * ------------------------------------------------------------------ */
  const CHAPTER_CONTAINERS = [".list-chapter", ".chapter-list", "#chapter-list", "#list-chapter", ".chapters", ".list-chapters", ".book-chapters", ".danh-sach-chuong", "#danh-sach-chuong", "#chapters", ".chapter_list", ".list-chapters-wrap", "ul.chapter", ".episode-list", "#tab-chapper", ".list-chap", ".volume-list", ".novel-detail"];

  function chapterNumber(name, url) {
    const fromName = String(name || "").match(/(?:chương|chapter|chap|quyển\s*\d+\s*chương|c)\s*[.\-_]?\s*(\d+(?:\.\d+)?)/i);
    if (fromName) return parseFloat(fromName[1]);
    const fromUrl = String(url || "").match(/(?:chuong|chapter|chap|c)[-_\/]?(\d+(?:[-.]\d+)?)/i);
    if (fromUrl) return parseFloat(String(fromUrl[1]).replace("-", "."));
    return null;
  }

  function chapterFlags(el) {
    const marker = `${attr(el, "class")} ${el.innerHTML || ""} ${attr(el, "title")}`.toLowerCase();
    const vipImg = !!(el.querySelector && el.querySelector("img[data-src*='vip'], img[src*='vip'], .vip, .lock"));
    return {
      lock: vipImg || /(lock|khóa|locked|fa-lock|premium)/.test(marker),
      pay: vipImg || /(vip|pay|coin|xu|mua chương|charge)/.test(marker)
    };
  }

  function chapterLinks(input, pageUrl) {
    const doc = asDocument(input), out = [], seen = new Set();
    let links = [];
    const selectors = [];
    if (config.toc && config.toc.selector) selectors.push(config.toc.selector);
    for (const s of CHAPTER_CONTAINERS) selectors.push(`${s} a[href]`);
    for (const selector of selectors) {
      links = queryAll(doc, selector);
      if (links.length >= 3) break;
    }
    const generic = links.length < 3;
    if (generic) links = queryAll(doc, "a[href]");
    for (const el of links) {
      const url = absolute(pageUrl, attr(el, "href"));
      if (!url || seen.has(url)) continue;
      if (generic && !CHAPTER_PATTERN.test(url) && !CHAPTER_PATTERN.test(text(el))) continue;
      seen.add(url);
      const name = text(el) || attr(el, "title") || "Chương";
      const flags = chapterFlags(el);
      out.push({
        name,
        title: name,
        url,
        link: url,
        index: out.length,
        number: chapterNumber(name, url),
        updatedAt: text(one(el.parentElement || el, ".time,.date,.chapter-time,time")) || "",
        lock: flags.lock,
        pay: flags.pay,
        host: hostOf(url)
      });
    }
    return out;
  }

  function tocPages(input, pageUrl) {
    const doc = asDocument(input), out = [], seen = new Set();
    // VBook page.js patterns
    const totalInput = one(doc, "input#total-page, input[name=total-page], #total-page");
    const totalFromInput = toNumber(attr(totalInput, "value") || text(totalInput));
    const pager = queryAll(doc, ".pagination a[href], .paging a[href], .page-nav a[href], ul.pager a[href], nav.pagination a[href], .pagination-container a[href], li.nexts > a, .pagination li a");
    let max = totalFromInput || 1;
    for (const el of pager) {
      const url = absolute(pageUrl, attr(el, "href"));
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const n = toNumber(text(el)) || toNumber((url.match(/(?:page|trang|p)[=\-\/](\d+)/i) || [])[1]);
      if (n && n > max) max = n;
      out.push({ page: n || out.length + 2, url });
    }
    // Build synthetic ajax TOC pages for truyenfull-like sites
    const ajax = config.toc_ajax;
    if (ajax) {
      const tid = attr(one(doc, ajax.id_selector || "input#truyen-id"), "value");
      const tascii = attr(one(doc, ajax.ascii_selector || "input#truyen-ascii"), "value");
      const total = toNumber(attr(one(doc, ajax.total_page_selector || "input#total-page"), "value")) || max || 1;
      if (tid && tascii) {
        const pages = [];
        for (let i = 1; i <= total; i++) {
          const path = String(ajax.url_template || "/ajax.php?type=list_chapter&tid={tid}&tascii={tascii}&page={page}&totalp={total}")
            .replace(/\{tid\}/g, encodeURIComponent(tid))
            .replace(/\{tascii\}/g, encodeURIComponent(tascii))
            .replace(/\{page\}/g, String(i))
            .replace(/\{total\}/g, String(total));
          pages.push({ page: i, url: absolute(pageUrl, path) });
        }
        return { pages, totalPages: total, mode: "ajax", listSelector: ajax.list_selector || ".list-chapter li a" };
      }
    }
    return { pages: out, totalPages: max, mode: "html" };
  }

  function buildTocPageUrl(storyUrl, page) {
    if (!storyUrl || !page || page < 2) return storyUrl || "";
    try {
      const u = new URL(storyUrl);
      if (/[?&]page=\d+/.test(u.href)) return u.href.replace(/([?&]page=)\d+/, `$1${page}`);
      if (/[?&]p=\d+/.test(u.href)) return u.href.replace(/([?&]p=)\d+/, `$1${page}`);
      if (/\/trang-\d+/.test(u.pathname)) return u.href.replace(/\/trang-\d+/, `/trang-${page}`);
      if (/\/danh-sach-chuong/.test(u.pathname)) {
        u.searchParams.set("p", String(page));
        return u.href;
      }
      u.searchParams.set("page", String(page));
      return u.href;
    } catch (_) { return storyUrl; }
  }

  function parseTocFromHtmlOrJson(input, pageUrl) {
    // Support VBook toc.js that receives JSON { chap_list: "html" }
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const data = JSON.parse(trimmed);
          if (data && typeof data.chap_list === "string") {
            return chapterLinks(data.chap_list, pageUrl);
          }
          if (Array.isArray(data)) {
            return data.map((c, i) => ({
              name: c.name || c.title || `Chương ${i + 1}`,
              title: c.name || c.title || `Chương ${i + 1}`,
              url: absolute(pageUrl, c.url || c.link || c.slug || ""),
              link: absolute(pageUrl, c.url || c.link || c.slug || ""),
              index: i,
              number: c.number != null ? c.number : chapterNumber(c.name || c.title, c.url || c.link),
              lock: !!c.lock,
              pay: !!c.pay,
              host: hostOf(absolute(pageUrl, c.url || c.link || ""))
            })).filter(c => c.url);
          }
          if (data && Array.isArray(data.chaps)) {
            return data.chaps.map((e, i) => ({
              name: e.title || e.name || `Chương ${i + 1}`,
              title: e.title || e.name || `Chương ${i + 1}`,
              url: absolute(pageUrl, e.url || e.link || ""),
              link: absolute(pageUrl, e.url || e.link || ""),
              index: i,
              number: e.chidx != null ? e.chidx : chapterNumber(e.title, e.url),
              lock: false,
              pay: false,
              host: hostOf(pageUrl)
            }));
          }
        } catch (_) {}
      }
    }
    return chapterLinks(input, pageUrl);
  }

  function firstChapter(input, pageUrl) {
    const doc = asDocument(input), raw = sourceHtml(input, doc);
    let url = fieldValue(doc, config.detail_first_chapter, pageUrl, raw);
    if (url) return absolute(pageUrl, url);
    const command = config.detail_first_chapter_js || "";
    if (command.startsWith("click:")) {
      const el = one(doc, command.slice(6).trim());
      if (el) for (const name of ["href", "data-href", "data-url"]) { url = absolute(pageUrl, attr(el, name)); if (url) return url; }
    }
    const list = chapterLinks(doc, pageUrl);
    if (!list.length) return "";
    const sorted = list.slice().sort((a, b) => (a.number == null ? 1e9 : a.number) - (b.number == null ? 1e9 : b.number));
    return sorted[0].url;
  }

  /* ------------------------------------------------------------------ *
   * parseStory — map 1-1 field VBook detail.js + metadata giàu
   * ------------------------------------------------------------------ */
  function parseStory(input, pageUrl) {
    const doc = asDocument(input);
    const raw = sourceHtml(input, doc);
    const detailCfg = config.detail || {};
    const rows = labelRows(doc);
    const ld = jsonLdNodes(doc).find(x => /Book|Novel|CreativeWork|Product|Series/i.test(String(x["@type"] || ""))) || {};

    const name = fieldValue(doc, detailCfg.name, pageUrl, raw) ||
      fieldValue(doc, config.title, pageUrl, raw) ||
      ldName(ld.name) || guessStoryTitle(doc);

    let author = fieldValue(doc, detailCfg.author, pageUrl, raw) ||
      firstText(doc, ['a[itemprop="author"]', '[itemprop="author"]', 'meta[property="og:novel:author"]', ".author a", ".author", ".tac-gia a", ".book-info a[href*=tac-gia]", 'a[href*="tac-gia"]', 'a[href*="author"]']) ||
      ldName(ld.author);
    let authorUrl = "";
    const authorRow = rowFor(rows, LABELS.author);
    if (!author && authorRow) author = authorRow.value;
    const authorLink = one(doc, 'a[itemprop="author"], a[href*="tac-gia"], a[href*="author"]') || (authorRow ? one(authorRow.el, "a[href]") : null);
    if (authorLink) authorUrl = absolute(pageUrl, attr(authorLink, "href"));
    author = (author || "").replace(/^(tác giả|author)\s*[::]\s*/i, "").trim();

    const descEl = one(doc, (detailCfg.description && detailCfg.description.selector) || '[itemprop="description"], .desc-text, .description, .book-intro, .story-detail, .summary, .book-info-detail .book-intro, #gioi-thieu, .gioi-thieu, .detail-content, #summary_markdown, section#id_novel_summary, .intro');
    const descriptionHtml = descEl ? sanitizeHtml(descEl, false) : "";
    let description = descEl ? htmlToText(descEl) : (metaContent(doc, ["og:description", "description"]) || ldName(ld.description));

    // VBook `detail` field = HTML info block
    const detailEl = one(doc, ".info, div.info, .book-info > p, .content1 div.info, .novel-meta, .detail-info, .book-information .book-info");
    const detailHtml = detailEl ? sanitizeHtml(detailEl, false) : "";

    let genres = [];
    if (detailCfg.genres && detailCfg.genres.selector) {
      genres = queryAll(doc, detailCfg.genres.selector).map(a => ({
        title: text(a),
        url: absolute(pageUrl, attr(a, "href")),
        input: absolute(pageUrl, attr(a, "href")),
        link: absolute(pageUrl, attr(a, "href"))
      })).filter(g => g.title);
    }
    if (!genres.length) {
      genres = queryAll(doc, 'a[itemprop="genre"], a[href*="the-loai"], a[href*="theloai"], a[href*="genre"], a[href*="category"]').map(a => ({
        title: text(a),
        url: absolute(pageUrl, attr(a, "href")),
        input: absolute(pageUrl, attr(a, "href")),
        link: absolute(pageUrl, attr(a, "href"))
      })).filter(g => g.title && g.title.length < 40);
    }
    const genreRow = rowFor(rows, LABELS.genres);
    if (!genres.length && genreRow) genres = splitList(genreRow.value).map(t => ({ title: t, url: "", input: "", link: "" }));
    genres = unique(genres).slice(0, 30);

    const tagRow = rowFor(rows, LABELS.tags);
    const tags = unique((tagRow ? splitList(tagRow.value) : []).concat(queryAll(doc, ".tags a, .tag-list a, li.tags a").map(a => text(a)))).filter(Boolean).slice(0, 30);

    const statusRow = rowFor(rows, LABELS.status);
    const statusRaw = fieldValue(doc, detailCfg.status, pageUrl, raw) ||
      (statusRow ? statusRow.value : "") ||
      metaContent(doc, ["og:novel:status"]) ||
      firstText(doc, [".status", ".text-success", ".label-status", ".book-state", "p.tag"]);
    // VBook often checks raw HTML for ">Đang ra<"
    const status = normalizeStatus(statusRaw || raw.slice(0, 30000));

    const chapterRow = rowFor(rows, LABELS.chapters);
    const viewRow = rowFor(rows, LABELS.views);
    const ratingRow = rowFor(rows, LABELS.rating);
    const wordRow = rowFor(rows, LABELS.words);
    const updatedRow = rowFor(rows, LABELS.updated);
    const translatorRow = rowFor(rows, LABELS.translator);
    const sourceRow = rowFor(rows, LABELS.source);

    const chapters = chapterLinks(doc, pageUrl);
    const paging = tocPages(doc, pageUrl);
    const latest = chapters.length ? chapters.reduce((a, b) => ((b.number || 0) >= (a.number || 0) ? b : a)) : null;

    const rating = toFloat(fieldValue(doc, detailCfg.rating, pageUrl, raw)) ??
      toFloat(ratingRow ? ratingRow.value : "") ??
      toFloat(metaContent(doc, ["og:novel:score"])) ??
      toFloat(text(one(doc, '[itemprop="ratingValue"]')));
    const ratingCount = toNumber(text(one(doc, '[itemprop="ratingCount"], [itemprop="reviewCount"]')));

    const canonical = findStoryUrl(doc, pageUrl) || pageUrl;
    const cover = findCover(doc, pageUrl);

    // VBook suggests blocks
    let suggests = queryAll(doc, ".same-author a, .related a, .suggest a, .like-more-list a, .list-truyen a").slice(0, 20).map(a => ({
      title: text(a),
      name: text(a),
      url: absolute(pageUrl, attr(a, "href")),
      link: absolute(pageUrl, attr(a, "href")),
      input: absolute(pageUrl, attr(a, "href"))
    })).filter(x => x.title);
    if (authorUrl) {
      suggests = [{ title: "Cùng tác giả", name: "Cùng tác giả", url: authorUrl, link: authorUrl, input: authorUrl }].concat(suggests);
    }
    suggests = unique(suggests).slice(0, 20);

    const ongoing = status.ongoing == null ? true : status.ongoing;

    return {
      // định danh
      inputType: "story",
      sourceId: config.domain,
      host: hostOf(canonical || pageUrl),
      url: pageUrl,
      storyUrl: canonical,
      canonicalUrl: canonical,
      link: canonical,
      // VBook detail.js fields
      name: name,
      title: name,
      cover: cover,
      coverUrl: cover,
      author: author,
      authorUrl: authorUrl,
      description: descriptionHtml || description,
      descriptionText: description,
      descriptionHtml: descriptionHtml,
      detail: detailHtml,
      ongoing: ongoing,
      genres: genres,
      suggests: suggests,
      // mở rộng
      altNames: unique(splitList(metaContent(doc, ["og:novel:alternate_name"]) || (rowFor(rows, ["tên khác", "tên gốc", "alt"]) || {}).value)),
      artist: (rowFor(rows, LABELS.artist) || {}).value || "",
      translator: translatorRow ? translatorRow.value : "",
      originalSource: sourceRow ? sourceRow.value : "",
      tags: tags,
      status: status.status || (ongoing ? "ongoing" : "completed"),
      statusText: (statusRaw || "").trim(),
      completed: status.status === "completed" || ongoing === false,
      rating: rating == null ? null : rating,
      ratingCount: ratingCount,
      views: toNumber(viewRow ? viewRow.value : "") ?? toNumber(metaContent(doc, ["og:novel:read"])),
      wordCount: toNumber(wordRow ? wordRow.value : ""),
      updatedAt: (updatedRow ? updatedRow.value : "") || metaContent(doc, ["og:novel:update_time", "article:modified_time"]),
      totalChapters: toNumber(chapterRow ? chapterRow.value : "") || chapters.length || paging.totalPages || null,
      chapterCount: chapters.length,
      firstChapterUrl: firstChapter(doc, pageUrl),
      latestChapter: latest ? { name: latest.name, url: latest.url, number: latest.number } : null,
      chapters: chapters,
      tocPages: paging.pages,
      tocTotalPages: paging.totalPages,
      tocMode: paging.mode || "html",
      nextTocUrl: paging.totalPages > 1 ? (paging.pages[1] && paging.pages[1].url) || buildTocPageUrl(canonical, 2) : "",
      needWebview: !!config.use_webview,
      mayNeedVpn: !!config.may_need_vpn,
      useHtmlParser: config.use_html_parser !== false,
      logo: config.logo || "",
      engine: ENGINE
    };
  }

  /* ------------------------------------------------------------------ *
   * parseChapter
   * ------------------------------------------------------------------ */
  function findNavigation(doc, baseUrl, type) {
    const field = type === "next" ? config.next_button : config.pre_button;
    const raw = sourceHtml(doc, doc);
    const configured = fieldValue(doc, field, baseUrl, raw);
    if (configured) return absolute(baseUrl, configured);
    const selectors = type === "next"
      ? ["a#next_chap", "a.next", "a[rel=next]", "a.next-chap", "a.btn-next", "a.chapter-next", "#btnNextChapter", "#next-link"]
      : ["a#prev_chap", "a.prev", "a[rel=prev]", "a.prev-chap", "a.btn-prev", "a.chapter-prev", "#btnPreChapter", "#prev-link"];
    for (const selector of selectors) {
      const el = one(doc, selector);
      const url = el && absolute(baseUrl, attr(el, "href"));
      if (url) return url;
    }
    const words = type === "next" ? /(chương sau|chương tiếp|next|tiếp\s*→)/i : /(chương trước|previous|prev|←\s*trước)/i;
    for (const el of queryAll(doc, "a[href]")) if (words.test(`${text(el)} ${attr(el, "title")}`)) return absolute(baseUrl, attr(el, "href"));
    return "";
  }

  function parseChapter(input, pageUrl) {
    const doc = asDocument(input), raw = sourceHtml(input, doc);
    const working = doc.cloneNode(true);
    removeNodes(working, (config.html_removes || []).concat(["noscript", "script", "iframe", "ins", "div.ads-responsive"]));
    const storyTitle = fieldValue(working, config.title, pageUrl, raw) || guessStoryTitle(working);
    const chapterTitle = fieldValue(working, config.chapter, pageUrl, raw) || guessTitle(working);

    let content = "", contentHtml = "", images = [];
    if (config.content && config.content.start) {
      const fragment = asDocument(slice(raw, config.content));
      const body = fragment.body || fragment;
      content = htmlToText(body);
      contentHtml = sanitizeHtml(body, true);
      images = extractContentImages(body, pageUrl);
    } else {
      const node = config.content ? one(working, config.content.selector, config.content.element_indexed) : null;
      const target = node || bestContent(working);
      if (target) {
        removeNodes(target, ["h1", "h2", "h3", ".chapter-title", ".heading", ".ads-responsive"]);
        images = extractContentImages(target, pageUrl);
        content = htmlToText(target);
        contentHtml = sanitizeHtml(target, true);
      }
    }
    content = cleanContent(content);
    for (const heading of [chapterTitle, storyTitle]) {
      if (heading && content.toLowerCase().startsWith(heading.toLowerCase())) content = content.slice(heading.length).trim();
    }
    // Image-only chapter marker (VBook)
    const imageOnly = (!content || content.length < 80) && images.length > 0;
    if (imageOnly && !content) {
      content = images.map((img, i) => `[Ảnh ${i + 1}] ${img.url}`).join("\n");
    }
    const words = content ? content.split(/\s+/).filter(Boolean).length : 0;
    return {
      inputType: "chapter",
      sourceId: config.domain,
      storyTitle,
      chapterTitle: chapterTitle || "Chương không rõ",
      chapterNumber: chapterNumber(chapterTitle, pageUrl),
      content,
      contentHtml,
      images,
      imageOnly,
      wordCount: words,
      readingMinutes: words ? Math.max(1, Math.round(words / 200)) : (imageOnly ? Math.max(1, images.length) : 0),
      coverUrl: findCover(working, pageUrl),
      cover: findCover(working, pageUrl),
      storyUrl: findStoryUrl(working, pageUrl),
      chapterUrl: pageUrl,
      host: hostOf(pageUrl),
      nextUrl: findNavigation(working, pageUrl, "next"),
      previousUrl: findNavigation(working, pageUrl, "prev"),
      empty: !content && images.length === 0,
      engine: ENGINE
    };
  }

  function bestContent(doc) {
    const preferred = one(doc, COMMON_CONTENT);
    if (preferred && (text(preferred).length >= 100 || queryAll(preferred, "img").length > 0)) return preferred;
    let best = null, score = 0;
    for (const el of queryAll(doc, "article,main,section,div")) {
      const marker = `${el.id || ""} ${el.className || ""}`;
      if (BAD_BLOCK.test(marker)) continue;
      const size = text(el).length + queryAll(el, "p").length * 25 + queryAll(el, "img").length * 40;
      if (size > score) { score = size; best = el; }
    }
    return best;
  }

  /* ------------------------------------------------------------------ *
   * Tìm kiếm / phân loại input
   * ------------------------------------------------------------------ */
  function inputType(input, pageUrl) {
    const doc = asDocument(input);
    if (config.content && one(doc, config.content.selector, config.content.element_indexed)) {
      const n = one(doc, config.content.selector, config.content.element_indexed);
      if (n && (text(n).length > 80 || queryAll(n, "img").length)) return "chapter";
    }
    if (CHAPTER_PATTERN.test(pageUrl || "")) return "chapter";
    return "story";
  }

  function pickRandomChapter(input, pageUrl, seed) {
    const chapters = chapterLinks(input, pageUrl);
    if (!chapters.length) {
      const first = firstChapter(input, pageUrl);
      return first ? { name: "Chương đầu", url: first, index: 0, total: 1 } : null;
    }
    const value = String(seed == null ? new Date().toISOString().slice(0, 10) : seed);
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    const index = Math.abs(hash) % chapters.length;
    return Object.assign({ index, total: chapters.length }, chapters[index]);
  }

  function resolveInput(input, pageUrl) {
    const type = inputType(input, pageUrl);
    if (type === "chapter") return parseChapter(input, pageUrl);
    const story = parseStory(input, pageUrl);
    story.randomChapter = pickRandomChapter(input, pageUrl);
    return story;
  }

  function searchUrls(keyword) {
    const search = config.search || {}, encoded = encodeURIComponent(keyword || "");
    const domain = String(config.domain || "").replace(/^https?:\/\//, "");
    const urls = [search.url].concat(search.urls || []).filter(Boolean);
    if (!urls.length) {
      const base = "https://" + domain;
      return [
        `${base}/tim-kiem?tukhoa=${encoded}`,
        `${base}/tim-kiem/?tukhoa=${encoded}`,
        `${base}/tim-truyen/${encoded}`,
        `${base}/ket-qua-tim-kiem?term=${encoded}`,
        `${base}/?s=${encoded}`,
        `${base}/search?q=${encoded}`
      ];
    }
    return unique(urls).map(url => url
      .replace(/\{domain\}/g, domain)
      .replace(/%s/g, encoded)
      .replace(/%d/g, String(keyword || "")));
  }

  function parseSearch(input, pageUrl) {
    const doc = asDocument(input), search = config.search || {}, out = [], seen = new Set();
    let items = search.item ? queryAll(doc, search.item.selector) : [];
    if (!items.length) {
      items = queryAll(doc, ".list-truyen div[itemscope], .list-truyen .row, .story-item, .book-item, .row-story, #rank-view-list ul li, .table-list tr, .books-list > li, book-list > a, article, .item");
    }
    for (const item of items) {
      const raw = item.outerHTML || "";
      let url = fieldValue(item, search.link, pageUrl, raw);
      if (!url) { const a = one(item, "a[href]"); url = a ? absolute(pageUrl, attr(a, "href")) : ""; }
      if (!url || seen.has(url)) continue;
      if (search.exclude_url_regex) { try { if (new RegExp(search.exclude_url_regex, "i").test(url)) continue; } catch (_) {} }
      if (search.story_url_regex) { try { if (!new RegExp(search.story_url_regex, "i").test(url)) continue; } catch (_) {} }
      const title = fieldValue(item, search.title, pageUrl, raw) || text(one(item, "h1,h2,h3,h4,.title,.truyen-title,.book-title,a[href]"));
      if (!title || title.length < 2) continue;
      seen.add(url);

      // Cover: VBook uses data-image, data-src, src, srcset
      let cover = fieldValue(item, search.cover, pageUrl, raw);
      if (!cover) cover = absolute(pageUrl, attr(one(item, "[data-image]"), "data-image"));
      if (!cover) cover = imageValue(one(item, "img, source, picture source"), pageUrl);
      if (!cover) {
        const m = raw.match(/(https?:\/\/[^\"'\s]+\.(?:jpg|jpeg|png|webp))/i);
        if (m) cover = m[1];
      }

      const latest = one(item, ".chapter-text, .text-info a, .latest-chapter, a[href*=chuong], .chapters a");
      out.push({
        title,
        name: title,
        url,
        link: url,
        author: fieldValue(item, search.author, pageUrl, raw) || text(one(item, ".author, [itemprop=author], a[href*=tac-gia], .book-author")),
        cover: cover,
        coverUrl: cover,
        description: text(one(item, ".desc, .description, .summary, .info")).slice(0, 300),
        latestChapter: latest ? { name: text(latest), url: absolute(pageUrl, attr(latest, "href")) } : null,
        tag: text(one(item, ".label, .status, .tag, .rate")),
        host: hostOf(url)
      });
    }

    // next page (VBook search pagination)
    let next = "";
    const nextEl = one(doc, ".pagination > li.active + li a, .pagination li.active + li a, ul.pagination > li.active + li, li.next a, a[rel=next]");
    if (nextEl) {
      next = text(nextEl) || attr(nextEl, "href") || "";
      const href = attr(nextEl, "href");
      if (href) next = absolute(pageUrl, href);
    }
    return { items: out, next, host: hostOf(pageUrl), engine: ENGINE };
  }

  function prepare() {
    if (!config.content_load_js) return true;
    try { Function(config.content_load_js).call(global); return true; } catch (_) { return false; }
  }

  function isReady(input) {
    const doc = asDocument(input), body = text(doc.body || doc);
    for (const marker of config.data_ready_checker || []) {
      if (body.includes(marker) || one(doc, `.${marker}`)) return false;
      const el = typeof doc.getElementById === "function" ? doc.getElementById(marker) : null;
      if (el && el.offsetParent !== null) return false;
    }
    for (const marker of config.data_loading_checker || []) {
      if ((typeof doc.getElementById === "function" && doc.getElementById(marker)) || one(doc, `.${marker}`)) return true;
    }
    const node = config.content ? one(doc, config.content.selector, config.content.element_indexed) : bestContent(doc);
    return !!node && (text(node).length >= 50 || queryAll(node, "img").length > 0);
  }

  /* ------------------------------------------------------------------ *
   * API
   * ------------------------------------------------------------------ */
  const api = Object.freeze({
    id: config.domain,
    version: VERSION,
    engine: ENGINE,
    config,
    domains: unique([config.domain].concat(config.keys || []).filter(Boolean)),
    match(url) {
      try {
        const host = new URL(url).hostname.toLowerCase();
        return this.domains.some(d => host === String(d).toLowerCase() || host.endsWith("." + String(d).toLowerCase()) || host.includes(String(d).toLowerCase()));
      } catch (_) { return false; }
    },
    headers() {
      return Object.assign({
        "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
        "accept-language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7"
      }, (config.search && config.search.headers) || {});
    },
    searchUrls,
    parseSearch,
    parseStory,
    parseDetail: parseStory,
    parseChapterList: parseTocFromHtmlOrJson,
    parseTocPages: tocPages,
    buildTocPageUrl,
    getFirstChapterUrl: firstChapter,
    parseChapter,
    findCover,
    findStoryUrl,
    inputType,
    pickRandomChapter,
    resolveInput,
    prepare,
    isReady,
    execute(action, payload) {
      payload = payload || {};
      const table = {
        searchUrls: () => searchUrls(payload.keyword),
        parseSearch: () => parseSearch(payload.html, payload.url),
        parseStory: () => parseStory(payload.html, payload.url),
        parseDetail: () => parseStory(payload.html, payload.url),
        parseChapterList: () => parseTocFromHtmlOrJson(payload.html, payload.url),
        parseTocPages: () => tocPages(payload.html, payload.url),
        buildTocPageUrl: () => buildTocPageUrl(payload.url, payload.page),
        getFirstChapterUrl: () => firstChapter(payload.html, payload.url),
        parseChapter: () => parseChapter(payload.html, payload.url),
        findCover: () => findCover(payload.html, payload.url),
        pickRandomChapter: () => pickRandomChapter(payload.html, payload.url, payload.seed),
        resolveInput: () => resolveInput(payload.html, payload.url),
        isReady: () => isReady(payload.html)
      };
      if (!table[action]) throw new Error(`Action không hỗ trợ: ${action}`);
      return JSON.stringify(table[action]());
    }
  });

  global.NovelReaderSource = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
