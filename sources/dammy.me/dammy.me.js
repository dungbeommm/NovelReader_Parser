/* NovelReader source: dammy.me | Engine v3 (vBook-style rich metadata). Auto-generated. */
(function (global) {
  "use strict";

  const config = {"domain":"dammy.me","keys":["dammy.me","www.dammy.me"],"use_html_parser":true,"use_webview":true,"title":{"selector":"#story_title","value":"value"},"chapter":{"selector":"#chapter_title","value":"value"},"content":{"selector":"#chapter-content-render"},"next_button":{"selector":"a.dammy-next","value":"href"},"pre_button":{"selector":"a.dammy-prev","value":"href"},"detail_first_chapter":{"selector":"#control a.btn-warning","value":"href"},"content_load_js":"(function(){try{if(document.getElementById('dammy-ready'))return;function pseudoText(e){var c='';try{c=getComputedStyle(e,'::before').content||'';}catch(_){c='';}if(!c||c==='none'||c==='normal')return '';try{return JSON.parse(c);}catch(_){return c.replace(/^['\\\"]|['\\\"]$/g,'');}}document.querySelectorAll('#chapter-content-render span[class]').forEach(function(e){var t=pseudoText(e);if(t)e.textContent=t;});function putLink(cls,raw){if(!raw||document.querySelector('a.'+cls))return;var parts=raw.split(',');if(parts.length<2)return;var a=document.createElement('a');a.className=cls;a.href=location.origin+'/'+parts[0]+'/'+parts[1]+'.html';a.style.display='none';document.body.appendChild(a);}function nav(id,cls){var b=document.getElementById(id);if(!b)return;var oc=b.getAttribute('onclick')||'';var m=oc.match(/actionChangeChapter\\('([^']+)'\\)/);if(m)putLink(cls,m[1]);}nav('next_chapter_btn','dammy-next');nav('prev_chapter_btn','dammy-prev');var r=document.createElement('div');r.id='dammy-ready';r.style.display='none';document.body.appendChild(r);}catch(e){try{var r=document.createElement('div');r.id='dammy-ready';r.style.display='none';document.body.appendChild(r);}catch(_){}}})()","data_loading_checker":["dammy-ready"],"chapter_ignore_domain":true};
  const VERSION = 3;
  const ENGINE = 3;

  /* ------------------------------------------------------------------ *
   * Hằng số dò tìm
   * ------------------------------------------------------------------ */
  const COMMON_CONTENT = "#chapter-c,.chapter-c,#chapter-content,.chapter-content,.reading-content,.entry-content,.content-chapter,.chapter-body,#chapterbody,#chr-content,.chr-c,#content,.text-content,.content-body-wrapper,article .content,.post-content,.article-content,.box-chap,.reader-content,.contentbox";
  const CHAPTER_PATTERN = /(chuong|chapter|chap|episode|\/c\/|-c-|tap)[-_\/]?\d/i;
  const BAD_BLOCK = /(comment|footer|header|menu|nav|sidebar|breadcrumb|share|social|advert|\bads?\b|banner|related|recommend|widget|pagination)/i;
  const JUNK_INLINE = /(quảng cáo|nguồn:\s*truyen|đọc truyện tại|vui lòng đăng nhập|báo lỗi chương|donate)/i;

  const LABELS = {
    author: ["tác giả", "tacgia", "author", "作者"],
    artist: ["họa sĩ", "minh họa", "artist", "illustrator"],
    translator: ["dịch giả", "người dịch", "nhóm dịch", "converter", "editor", "translator"],
    genres: ["thể loại", "theloai", "genre", "genres", "category", "danh mục", "分类"],
    tags: ["tag", "tags", "từ khóa", "thẻ"],
    status: ["trạng thái", "tình trạng", "status", "状态"],
    source: ["nguồn", "source"],
    chapters: ["số chương", "số chapter", "chương", "chapters"],
    views: ["lượt đọc", "lượt xem", "lượt view", "view", "views", "đọc"],
    rating: ["đánh giá", "điểm", "rating", "vote"],
    updated: ["cập nhật", "mới nhất", "updated", "last update"],
    words: ["số từ", "số chữ", "word count", "字数"]
  };

  const STATUS_DONE = /(hoàn thành|hoàn tất|full|completed|complete|đã xong|đã hoàn|已完结|完本)/i;
  const STATUS_ONGOING = /(đang ra|đang tiến hành|đang cập nhật|ongoing|updating|连载)/i;
  const STATUS_DROP = /(tạm ngưng|tạm dừng|drop|dropped|ngừng)/i;

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
      if (ch === "\"" || ch === "'") { quote = ch; continue; }
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
    if (!value || value === "#" || /^javascript:/i.test(value)) return "";
    try { return new URL(value, base).href; } catch (_) { return String(value).trim(); }
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
    const raw = String(value == null ? "" : value).replace(/[.,\s]/g, "").match(/\d+(?:\d*)/);
    if (!raw) return null;
    let n = parseInt(raw[0], 10);
    if (/k\b/i.test(String(value))) n *= 1000;
    if (/m\b|tr\b|triệu/i.test(String(value))) n *= 1000000;
    return Number.isFinite(n) ? n : null;
  }

  function toFloat(value) {
    const m = String(value == null ? "" : value).replace(",", ".").match(/\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }

  /* ------------------------------------------------------------------ *
   * Field resolver (tương thích config cũ)
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
    if (["href", "src", "data-src", "data-url", "data-href"].includes(name)) value = absolute(baseUrl, value);
    return String(value || text(el)).trim();
  }

  function firstText(root, selectors, baseUrl) {
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
      for (const node of queryAll(root, selector)) node.remove();
    }
  }

  function htmlToText(node) {
    if (!node) return "";
    const clone = node.cloneNode(true);
    removeNodes(clone, ["script", "style", "noscript", "template", "iframe", "svg", "canvas"]);
    for (const br of queryAll(clone, "br")) br.replaceWith("\n");
    for (const p of queryAll(clone, "p,div,section,article,li,h1,h2,h3,h4")) p.append("\n");
    return text(clone).replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function sanitizeHtml(node) {
    if (!node) return "";
    const clone = node.cloneNode(true);
    removeNodes(clone, ["script", "style", "noscript", "template", "iframe", "svg", "canvas", "form", "button", "ins", ".ads", ".ads-responsive", "[class*=advert]", "[id*=advert]"]);
    for (const el of queryAll(clone, "*")) {
      for (const name of Array.from(el.attributes || []).map(a => a.name)) {
        if (!["href", "src", "alt", "title"].includes(name)) { try { el.removeAttribute(name); } catch (_) {} }
      }
      if (JUNK_INLINE.test(text(el)) && text(el).length < 120) el.remove();
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
    const holders = queryAll(doc, ".info div, .info p, .info li, .book-info p, .book-info li, .detail p, .detail li, .story-info p, .story-info li, .truyen-info p, .truyen-info li, .meta li, .meta p, table tr, ul.list-info li, .book-information p, .item, .info-item, dl div");
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
   * Ảnh bìa / URL truyện
   * ------------------------------------------------------------------ */
  function imageValue(el, baseUrl) {
    if (!el) return "";
    if (el.tagName && el.tagName.toLowerCase() === "meta") return absolute(baseUrl, attr(el, "content"));
    const srcset = attr(el, "srcset");
    if (srcset) {
      const first = srcset.split(",")[0].trim().split(/\s+/)[0];
      if (first) return absolute(baseUrl, first);
    }
    for (const name of ["src", "data-src", "data-lazy-src", "data-original", "data-url", "data-cfsrc"]) {
      const value = attr(el, name);
      if (value && !/^data:/i.test(value)) return absolute(baseUrl, value);
    }
    const style = attr(el, "style");
    const bg = style && style.match(/url\((['"]?)(.*?)\1\)/);
    if (bg) return absolute(baseUrl, bg[2]);
    return "";
  }

  function coverFromJsonLd(doc, baseUrl) {
    for (const item of jsonLdNodes(doc)) {
      const image = item.image || item.thumbnailUrl;
      const value = Array.isArray(image) ? image[0] : (image && typeof image === "object" ? image.url : image);
      if (value) return absolute(baseUrl, value);
    }
    return "";
  }

  function findCover(input, pageUrl) {
    const doc = asDocument(input);
    const configured = config.cover ? fieldValue(doc, config.cover, pageUrl, sourceHtml(input, doc)) : "";
    if (configured) return absolute(pageUrl, configured);
    for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[itemprop="image"]', '.book-cover img', '.story-cover img', '.novel-cover img', '.book-info img', '.info-holder img', '.book-img img', '.books img', '.cover img', '.thumb img', 'img[itemprop="image"]', '.detail img']) {
      const value = imageValue(one(doc, selector), pageUrl);
      if (value) return value;
    }
    return coverFromJsonLd(doc, pageUrl);
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
    if (meta) return meta.trim();
    for (const selector of ["h1", "h2", ".chapter-title", ".chapter-name", ".chr-title"]) {
      const value = text(one(doc, selector));
      if (value) return value;
    }
    return doc.title || "";
  }

  function guessStoryTitle(doc) {
    const meta = metaContent(doc, ["og:novel:book_name", "books:title"]);
    if (meta) return meta.trim();
    for (const selector of [".story-title", ".truyen-title", ".book-title", ".novel-title", "h1.title", "h1", "h3.title"]) {
      const value = text(one(doc, selector));
      if (value) return value;
    }
    const crumbs = queryAll(doc, ".breadcrumb a,nav[aria-label=breadcrumb] a");
    return crumbs.length ? text(crumbs[crumbs.length - 1]) : "";
  }

  /* ------------------------------------------------------------------ *
   * Danh sách chương + phân trang
   * ------------------------------------------------------------------ */
  const CHAPTER_CONTAINERS = [".list-chapter", ".chapter-list", "#chapter-list", "#list-chapter", ".chapters", ".list-chapters", ".book-chapters", ".danh-sach-chuong", "#danh-sach-chuong", "#chapters", ".chapter_list", ".list-chapters-wrap", "ul.chapter", ".episode-list", "#tab-chapper"];

  function chapterNumber(name, url) {
    const fromName = String(name || "").match(/(?:chương|chapter|chap|quyển\s*\d+\s*chương|c)\s*[.\-_]?\s*(\d+(?:\.\d+)?)/i);
    if (fromName) return parseFloat(fromName[1]);
    const fromUrl = String(url || "").match(/(?:chuong|chapter|chap|c)[-_\/]?(\d+(?:[-.]\d+)?)/i);
    if (fromUrl) return parseFloat(String(fromUrl[1]).replace("-", "."));
    return null;
  }

  function chapterFlags(el) {
    const marker = `${attr(el, "class")} ${el.innerHTML || ""}`.toLowerCase();
    return {
      lock: /(lock|khóa|locked|fa-lock|premium)/.test(marker),
      pay: /(vip|pay|coin|xu|mua chương|charge)/.test(marker)
    };
  }

  function chapterLinks(input, pageUrl) {
    const doc = asDocument(input), out = [], seen = new Set();
    let links = [];
    for (const selector of (config.toc && config.toc.selector ? [config.toc.selector] : []).concat(CHAPTER_CONTAINERS.map(s => `${s} a[href]`))) {
      links = queryAll(doc, selector);
      if (links.length >= 3) break;
    }
    const generic = links.length < 3;
    if (generic) links = queryAll(doc, "a[href]");
    for (const el of links) {
      const url = absolute(pageUrl, attr(el, "href"));
      if (!url || (generic && !CHAPTER_PATTERN.test(url)) || seen.has(url)) continue;
      seen.add(url);
      const name = text(el) || attr(el, "title") || "Chương";
      const flags = chapterFlags(el);
      out.push({
        name,
        title: name,
        url,
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

  function hostOf(url) {
    try { const u = new URL(url); return `${u.protocol}//${u.host}`; } catch (_) { return ""; }
  }

  function tocPages(input, pageUrl) {
    const doc = asDocument(input), out = [], seen = new Set();
    const pager = queryAll(doc, ".pagination a[href], .paging a[href], .page-nav a[href], ul.pager a[href], nav.pagination a[href], .pagination-container a[href]");
    let max = 1;
    for (const el of pager) {
      const url = absolute(pageUrl, attr(el, "href"));
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const n = toNumber(text(el)) || toNumber((url.match(/(?:page|trang)[=\-\/](\d+)/i) || [])[1]);
      if (n && n > max) max = n;
      out.push({ page: n || out.length + 2, url });
    }
    return { pages: out, totalPages: max };
  }

  function buildTocPageUrl(storyUrl, page) {
    if (!storyUrl || !page || page < 2) return storyUrl || "";
    try {
      const u = new URL(storyUrl);
      if (/[?&]page=\d+/.test(u.href)) return u.href.replace(/([?&]page=)\d+/, `$1${page}`);
      if (/\/trang-\d+/.test(u.pathname)) return u.href.replace(/\/trang-\d+/, `/trang-${page}`);
      u.searchParams.set("page", String(page));
      return u.href;
    } catch (_) { return storyUrl; }
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
   * parseStory — thông tin truyện đầy đủ (chuẩn vBook detail.js)
   * ------------------------------------------------------------------ */
  function parseStory(input, pageUrl) {
    const doc = asDocument(input);
    const raw = sourceHtml(input, doc);
    const detailCfg = config.detail || {};
    const rows = labelRows(doc);
    const ld = jsonLdNodes(doc).find(x => /Book|Novel|CreativeWork|Product|Series/i.test(String(x["@type"] || ""))) || {};

    const name = fieldValue(doc, config.title, pageUrl, raw) ||
      fieldValue(doc, detailCfg.name, pageUrl, raw) ||
      ldName(ld.name) || guessStoryTitle(doc);

    // Tác giả
    let author = fieldValue(doc, detailCfg.author, pageUrl, raw) ||
      firstText(doc, ['a[itemprop="author"]', '[itemprop="author"]', 'meta[property="og:novel:author"]', ".author a", ".author", ".tac-gia a", ".book-info a[href*=tac-gia]", 'a[href*="tac-gia"]', 'a[href*="author"]']) ||
      ldName(ld.author);
    let authorUrl = "";
    const authorRow = rowFor(rows, LABELS.author);
    if (!author && authorRow) author = authorRow.value;
    const authorLink = one(doc, 'a[itemprop="author"], a[href*="tac-gia"], a[href*="author"]') || (authorRow ? one(authorRow.el, "a[href]") : null);
    if (authorLink) authorUrl = absolute(pageUrl, attr(authorLink, "href"));
    author = (author || "").replace(/^(tác giả|author)\s*[::]\s*/i, "").trim();

    // Mô tả
    const descEl = one(doc, (detailCfg.description && detailCfg.description.selector) || '[itemprop="description"], .desc-text, .description, .book-intro, .story-detail, .summary, .book-info-detail .book-intro, #gioi-thieu, .gioi-thieu, .detail-content');
    const descriptionHtml = descEl ? sanitizeHtml(descEl) : "";
    const description = descEl ? htmlToText(descEl) : (metaContent(doc, ["og:description", "description"]) || ldName(ld.description));

    // Thể loại / tag
    let genres = [];
    if (detailCfg.genres && detailCfg.genres.selector) {
      genres = queryAll(doc, detailCfg.genres.selector).map(a => ({ title: text(a), url: absolute(pageUrl, attr(a, "href")) })).filter(g => g.title);
    }
    if (!genres.length) genres = linksIn(doc.body || doc, pageUrl).filter(g => /the-loai|theloai|genre|category|tag/i.test(g.url) && g.title.length < 40);
    const genreRow = rowFor(rows, LABELS.genres);
    if (!genres.length && genreRow) genres = splitList(genreRow.value).map(t => ({ title: t, url: "" }));
    genres = unique(genres).slice(0, 30);

    const tagRow = rowFor(rows, LABELS.tags);
    const tags = unique((tagRow ? splitList(tagRow.value) : []).concat(queryAll(doc, ".tags a, .tag-list a").map(a => text(a)))).filter(Boolean).slice(0, 30);

    // Trạng thái
    const statusRow = rowFor(rows, LABELS.status);
    const statusRaw = fieldValue(doc, detailCfg.status, pageUrl, raw) ||
      (statusRow ? statusRow.value : "") ||
      metaContent(doc, ["og:novel:status"]) ||
      firstText(doc, [".status", ".text-success", ".label-status", ".book-state"]);
    const status = normalizeStatus(statusRaw || raw.slice(0, 20000));

    // Số liệu
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

    const story = {
      // định danh
      inputType: "story",
      sourceId: config.domain,
      host: hostOf(canonical || pageUrl),
      url: pageUrl,
      storyUrl: canonical,
      canonicalUrl: canonical,
      // thông tin chính
      title: name,
      name: name,
      altNames: unique(splitList(metaContent(doc, ["og:novel:alternate_name"]) || (rowFor(rows, ["tên khác", "tên gốc", "alt"]) || {}).value)),
      author: author,
      authorUrl: authorUrl,
      artist: (rowFor(rows, LABELS.artist) || {}).value || "",
      translator: translatorRow ? translatorRow.value : "",
      originalSource: sourceRow ? sourceRow.value : "",
      coverUrl: findCover(doc, pageUrl),
      cover: findCover(doc, pageUrl),
      description: description,
      descriptionHtml: descriptionHtml,
      genres: genres,
      tags: tags,
      // trạng thái & số liệu
      status: status.status,
      statusText: (statusRaw || "").trim(),
      ongoing: status.ongoing == null ? true : status.ongoing,
      completed: status.status === "completed",
      rating: rating == null ? null : rating,
      ratingCount: ratingCount,
      views: toNumber(viewRow ? viewRow.value : "") ?? toNumber(metaContent(doc, ["og:novel:read"])),
      wordCount: toNumber(wordRow ? wordRow.value : ""),
      updatedAt: (updatedRow ? updatedRow.value : "") || metaContent(doc, ["og:novel:update_time", "article:modified_time"]),
      // chương
      totalChapters: toNumber(chapterRow ? chapterRow.value : "") || chapters.length,
      chapterCount: chapters.length,
      firstChapterUrl: firstChapter(doc, pageUrl),
      latestChapter: latest ? { name: latest.name, url: latest.url, number: latest.number } : null,
      chapters: chapters,
      tocPages: paging.pages,
      tocTotalPages: paging.totalPages,
      nextTocUrl: paging.totalPages > 1 ? buildTocPageUrl(canonical, 2) : "",
      // gợi ý
      suggests: unique(queryAll(doc, ".same-author a, .related a, .suggest a, .list-truyen a").slice(0, 20).map(a => ({ title: text(a), url: absolute(pageUrl, attr(a, "href")) })).filter(x => x.title)),
      // cờ kỹ thuật cho app
      needWebview: !!config.use_webview,
      mayNeedVpn: !!config.may_need_vpn,
      engine: ENGINE
    };
    return story;
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
      ? ["a#next_chap", "a.next", "a[rel=next]", "a.next-chap", "a.btn-next", "a.chapter-next"]
      : ["a#prev_chap", "a.prev", "a[rel=prev]", "a.prev-chap", "a.btn-prev", "a.chapter-prev"];
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
    removeNodes(working, config.html_removes || []);
    const storyTitle = fieldValue(working, config.title, pageUrl, raw) || guessStoryTitle(working);
    const chapterTitle = fieldValue(working, config.chapter, pageUrl, raw) || guessTitle(working);

    let content = "", contentHtml = "";
    if (config.content && config.content.start) {
      const fragment = asDocument(slice(raw, config.content));
      content = htmlToText(fragment.body || fragment);
      contentHtml = sanitizeHtml(fragment.body || fragment);
    } else {
      const node = config.content ? one(working, config.content.selector, config.content.element_indexed) : null;
      const target = node || bestContent(working);
      if (target) {
        removeNodes(target, ["h1", "h2", "h3", ".chapter-title", ".heading", ".ads-responsive"]);
        content = htmlToText(target);
        contentHtml = sanitizeHtml(target);
      }
    }
    content = cleanContent(content);
    for (const heading of [chapterTitle, storyTitle]) {
      if (heading && content.toLowerCase().startsWith(heading.toLowerCase())) content = content.slice(heading.length).trim();
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
      wordCount: words,
      readingMinutes: words ? Math.max(1, Math.round(words / 200)) : 0,
      coverUrl: findCover(working, pageUrl),
      storyUrl: findStoryUrl(working, pageUrl),
      chapterUrl: pageUrl,
      host: hostOf(pageUrl),
      nextUrl: findNavigation(working, pageUrl, "next"),
      previousUrl: findNavigation(working, pageUrl, "prev"),
      empty: !content,
      engine: ENGINE
    };
  }

  function bestContent(doc) {
    const preferred = one(doc, COMMON_CONTENT);
    if (preferred && text(preferred).length >= 100) return preferred;
    let best = null, score = 0;
    for (const el of queryAll(doc, "article,main,section,div")) {
      const marker = `${el.id || ""} ${el.className || ""}`;
      if (BAD_BLOCK.test(marker)) continue;
      const size = text(el).length + queryAll(el, "p").length * 25;
      if (size > score) { score = size; best = el; }
    }
    return best;
  }

  /* ------------------------------------------------------------------ *
   * Tìm kiếm / phân loại input
   * ------------------------------------------------------------------ */
  function inputType(input, pageUrl) {
    const doc = asDocument(input);
    if (config.content && one(doc, config.content.selector, config.content.element_indexed)) return "chapter";
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
    const urls = [search.url].concat(search.urls || []).filter(Boolean);
    if (!urls.length) {
      const base = "https://" + String(config.domain || "").replace(/^https?:\/\//, "");
      return [`${base}/tim-kiem?tukhoa=${encoded}`, `${base}/?s=${encoded}`, `${base}/search?q=${encoded}`];
    }
    return unique(urls).map(url => url.replace(/%s/g, encoded).replace(/%d/g, String(keyword || "")));
  }

  function parseSearch(input, pageUrl) {
    const doc = asDocument(input), search = config.search || {}, out = [], seen = new Set();
    let items = search.item ? queryAll(doc, search.item.selector) : [];
    if (!items.length) items = queryAll(doc, ".story-item,.book-item,.row-story,.list-truyen .row,article,.item,li");
    for (const item of items) {
      const raw = item.outerHTML || "";
      let url = fieldValue(item, search.link, pageUrl, raw);
      if (!url) { const a = one(item, "a[href]"); url = a ? absolute(pageUrl, attr(a, "href")) : ""; }
      if (!url || seen.has(url)) continue;
      if (search.exclude_url_regex) { try { if (new RegExp(search.exclude_url_regex, "i").test(url)) continue; } catch (_) {} }
      if (search.story_url_regex) { try { if (!new RegExp(search.story_url_regex, "i").test(url)) continue; } catch (_) {} }
      const title = fieldValue(item, search.title, pageUrl, raw) || text(one(item, "h1,h2,h3,.title,a[href]"));
      if (!title) continue;
      seen.add(url);
      const latest = one(item, ".chapter-text, .text-info a, .latest-chapter, a[href*=chuong]");
      out.push({
        title,
        name: title,
        url,
        link: url,
        author: fieldValue(item, search.author, pageUrl, raw) || text(one(item, ".author, [itemprop=author], a[href*=tac-gia]")),
        cover: fieldValue(item, search.cover, pageUrl, raw) || imageValue(one(item, "img"), pageUrl),
        description: text(one(item, ".desc, .description, .summary")).slice(0, 300),
        latestChapter: latest ? { name: text(latest), url: absolute(pageUrl, attr(latest, "href")) } : null,
        tag: text(one(item, ".label, .status, .tag")),
        host: hostOf(url)
      });
    }
    return out;
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
    return !!node && text(node).length >= 50;
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
    match(url) { try { const host = new URL(url).hostname.toLowerCase(); return this.domains.some(d => host.includes(String(d).toLowerCase())); } catch (_) { return false; } },
    headers() { return Object.assign({ "user-agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36" }, (config.search && config.search.headers) || {}); },
    searchUrls,
    parseSearch,
    parseStory,
    parseDetail: parseStory,
    parseChapterList: chapterLinks,
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
        parseChapterList: () => chapterLinks(payload.html, payload.url),
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
