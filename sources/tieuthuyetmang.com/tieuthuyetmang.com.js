/* NovelReader source: tieuthuyetmang.com | Generated from app parser.json. */
(function (global) {
  "use strict";

  const config = {"domain":"tieuthuyetmang.com","keys":["tieuthuyetmang"],"use_html_parser":true,"use_webview":true,"title":{"selector":"a:has(svg.lucide-chevron-left)"},"chapter":{"selector":"h1"},"content":{"selector":".whitespace-pre-wrap"},"next_button":{"selector":"a:has(svg.lucide-chevron-right)","value":"href"},"pre_button":{"selector":"a:has(svg.lucide-chevron-left)","element_indexed":1,"value":"href"}};
  const VERSION = 2;
  const COMMON_CONTENT = "#chapter-c,.chapter-c,#chapter-content,.chapter-content,.reading-content,.entry-content,.content-chapter,.chapter-body,#chapterbody,#chr-content,.chr-c,#content,.text-content,.content-body-wrapper,article .content,.post-content,.article-content,.box-chap,.reader-content";
  const CHAPTER_PATTERN = /(chuong|chapter|chap|episode|\/c\/|-c-|tap)[-_\/]?\d/i;
  const BAD_BLOCK = /(comment|footer|header|menu|nav|sidebar|breadcrumb|share|social|advert|\bads?\b|banner|related|recommend|widget|pagination)/i;

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

  function absolute(base, value) {
    if (!value || value === "#" || /^javascript:/i.test(value)) return "";
    try { return new URL(value, base).href; } catch (_) { return String(value).trim(); }
  }

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
    const attr = field.value;
    if (!attr || attr === "text") return text(el);
    let value = el.getAttribute(attr) || "";
    if (["href", "src", "data-src", "data-url", "data-href"].includes(attr)) value = absolute(baseUrl, value);
    return String(value || text(el)).trim();
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

  function guessTitle(doc) {
    const meta = one(doc, 'meta[property="og:title"]');
    if (meta && meta.getAttribute("content")) return meta.getAttribute("content").trim();
    for (const selector of ["h1", "h2", ".chapter-title", ".chapter-name", ".chr-title"]) { const value = text(one(doc, selector)); if (value) return value; }
    return doc.title || "";
  }

  function guessStoryTitle(doc) {
    const meta = one(doc, 'meta[property="og:novel:book_name"]');
    if (meta && meta.getAttribute("content")) return meta.getAttribute("content").trim();
    for (const selector of [".story-title", ".truyen-title", ".book-title", ".novel-title", "h1.title"]) { const value = text(one(doc, selector)); if (value) return value; }
    const crumbs = queryAll(doc, ".breadcrumb a,nav[aria-label=breadcrumb] a");
    return crumbs.length ? text(crumbs[crumbs.length - 1]) : "";
  }

  function imageValue(el, baseUrl) {
    if (!el) return "";
    if (el.tagName && el.tagName.toLowerCase() === "meta") return absolute(baseUrl, el.getAttribute("content"));
    const srcset = el.getAttribute && el.getAttribute("srcset");
    if (srcset) {
      const first = srcset.split(",")[0].trim().split(/\s+/)[0];
      if (first) return absolute(baseUrl, first);
    }
    for (const attr of ["src", "data-src", "data-lazy-src", "data-original", "data-url"]) {
      const value = el.getAttribute && el.getAttribute(attr);
      if (value && !/^data:/i.test(value)) return absolute(baseUrl, value);
    }
    return "";
  }

  function coverFromJsonLd(doc, baseUrl) {
    for (const node of queryAll(doc, 'script[type="application/ld+json"]')) {
      try {
        const data = JSON.parse(node.textContent || "{}");
        const list = Array.isArray(data) ? data : [data];
        for (const item of list) {
          const image = item && item.image;
          const value = Array.isArray(image) ? image[0] : (typeof image === "object" ? image.url : image);
          if (value) return absolute(baseUrl, value);
        }
      } catch (_) {}
    }
    return "";
  }

  function findCover(input, pageUrl) {
    const doc = asDocument(input);
    for (const selector of ['meta[property="og:image"]','meta[name="twitter:image"]','meta[itemprop="image"]','.book-cover img','.story-cover img','.novel-cover img','.book-info img','.info-holder img','.book-img img','.cover img','img[itemprop="image"]']) {
      const value = imageValue(one(doc, selector), pageUrl);
      if (value) return value;
    }
    return coverFromJsonLd(doc, pageUrl);
  }

  function findStoryUrl(input, pageUrl) {
    const doc = asDocument(input);
    for (const selector of ['meta[property="og:url"]','link[rel="canonical"]']) {
      const el = one(doc, selector);
      const raw = el && (el.getAttribute("content") || el.getAttribute("href"));
      if (raw && !CHAPTER_PATTERN.test(raw)) return absolute(pageUrl, raw);
    }
    const crumbs = queryAll(doc, '.breadcrumb a[href],nav[aria-label="breadcrumb"] a[href],a.book-title[href],a.story-title[href]');
    for (let i = crumbs.length - 1; i >= 0; i--) {
      const url = absolute(pageUrl, crumbs[i].getAttribute("href"));
      if (url && !CHAPTER_PATTERN.test(url)) return url;
    }
    try {
      const u = new URL(pageUrl);
      u.pathname = u.pathname.replace(/\/(chuong|chapter|chap)[-_\/]?[^/]+\/?$/i, "/");
      return u.href;
    } catch (_) { return ""; }
  }

  function inputType(input, pageUrl) {
    const doc = asDocument(input);
    if (config.content && one(doc, config.content.selector, config.content.element_indexed)) return "chapter";
    if (CHAPTER_PATTERN.test(pageUrl || "")) return "chapter";
    return "story";
  }

  function findNavigation(doc, baseUrl, type) {
    const field = type === "next" ? config.next_button : config.pre_button;
    const raw = sourceHtml(doc, doc);
    const configured = fieldValue(doc, field, baseUrl, raw);
    if (configured) return absolute(baseUrl, configured);
    const selectors = type === "next" ? ["a#next_chap", "a.next", "a[rel=next]", "a.next-chap", "a.btn-next", "a.chapter-next"] : ["a#prev_chap", "a.prev", "a[rel=prev]", "a.prev-chap", "a.btn-prev", "a.chapter-prev"];
    for (const selector of selectors) { const el = one(doc, selector); const url = el && absolute(baseUrl, el.getAttribute("href")); if (url) return url; }
    const words = type === "next" ? /(chương sau|chương tiếp|next|tiếp\s*→)/i : /(chương trước|previous|prev|←\s*trước)/i;
    for (const el of queryAll(doc, "a[href]")) if (words.test(`${text(el)} ${el.getAttribute("title") || ""}`)) return absolute(baseUrl, el.getAttribute("href"));
    return "";
  }

  function chapterLinks(input, pageUrl) {
    const doc = asDocument(input), out = [], seen = new Set();
    const containers = [".list-chapter", ".chapter-list", "#chapter-list", "#list-chapter", ".chapters", ".list-chapters", ".book-chapters", ".danh-sach-chuong", "#danh-sach-chuong"];
    let links = [];
    for (const selector of containers) { links = queryAll(doc, `${selector} a[href]`); if (links.length >= 3) break; }
    const generic = links.length < 3;
    if (generic) links = queryAll(doc, "a[href]");
    for (const el of links) {
      const url = absolute(pageUrl, el.getAttribute("href"));
      if (!url || (generic && !CHAPTER_PATTERN.test(url)) || seen.has(url)) continue;
      seen.add(url); out.push({ name: text(el) || el.getAttribute("title") || "Chương", url });
    }
    return out;
  }

  function firstChapter(input, pageUrl) {
    const doc = asDocument(input), raw = sourceHtml(input, doc);
    let url = fieldValue(doc, config.detail_first_chapter, pageUrl, raw);
    if (url) return absolute(pageUrl, url);
    const command = config.detail_first_chapter_js || "";
    if (command.startsWith("click:")) {
      const el = one(doc, command.slice(6).trim());
      if (el) for (const attr of ["href", "data-href", "data-url"]) { url = absolute(pageUrl, el.getAttribute(attr)); if (url) return url; }
    }
    const list = chapterLinks(doc, pageUrl);
    return list.length ? list[0].url : "";
  }

  function parseStory(input, pageUrl) {
    const doc = asDocument(input), raw = sourceHtml(input, doc);
    const chapters = chapterLinks(doc, pageUrl);
    return {
      title: fieldValue(doc, config.title, pageUrl, raw) || guessStoryTitle(doc),
      url: pageUrl,
      storyUrl: pageUrl,
      coverUrl: findCover(doc, pageUrl),
      firstChapterUrl: firstChapter(doc, pageUrl),
      chapters
    };
  }

  function parseChapter(input, pageUrl) {
    const doc = asDocument(input), raw = sourceHtml(input, doc);
    const working = doc.cloneNode(true);
    removeNodes(working, config.html_removes || []);
    let storyTitle = fieldValue(working, config.title, pageUrl, raw) || guessStoryTitle(working);
    let chapterTitle = fieldValue(working, config.chapter, pageUrl, raw) || guessTitle(working);
    let content = "";
    if (config.content && config.content.start) content = htmlToText(asDocument(slice(raw, config.content)));
    else {
      const node = config.content ? one(working, config.content.selector, config.content.element_indexed) : null;
      const target = node || bestContent(working);
      if (target) { removeNodes(target, "h1,h2,h3,.chapter-title,.heading".split(",")); content = htmlToText(target); }
    }
    content = cleanContent(content);
    for (const heading of [chapterTitle, storyTitle]) if (heading && content.toLowerCase().startsWith(heading.toLowerCase())) content = content.slice(heading.length).trim();
    return {
      storyTitle,
      chapterTitle: chapterTitle || "Chương không rõ",
      content,
      coverUrl: findCover(working, pageUrl),
      storyUrl: findStoryUrl(working, pageUrl),
      chapterUrl: pageUrl,
      nextUrl: findNavigation(working, pageUrl, "next"),
      previousUrl: findNavigation(working, pageUrl, "prev")
    };
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
    if (type === "chapter") return Object.assign({ inputType: type }, parseChapter(input, pageUrl));
    const story = parseStory(input, pageUrl);
    return Object.assign({ inputType: type, randomChapter: pickRandomChapter(input, pageUrl) }, story);
  }

  function searchUrls(keyword) {
    const search = config.search || {}, encoded = encodeURIComponent(keyword || "");
    const urls = [search.url].concat(search.urls || []).filter(Boolean);
    return Array.from(new Set(urls)).map(url => url.replace(/%s/g, encoded).replace(/%d/g, String(keyword || "")));
  }

  function parseSearch(input, pageUrl) {
    const doc = asDocument(input), search = config.search || {}, out = [], seen = new Set();
    let items = search.item ? queryAll(doc, search.item.selector) : [];
    if (!items.length) items = queryAll(doc, "article,.story-item,.book-item,.item,li");
    for (const item of items) {
      const raw = item.outerHTML || "";
      let url = fieldValue(item, search.link, pageUrl, raw);
      if (!url) { const a = one(item, "a[href]"); url = a ? absolute(pageUrl, a.getAttribute("href")) : ""; }
      if (!url || seen.has(url)) continue;
      if (search.exclude_url_regex) try { if (new RegExp(search.exclude_url_regex, "i").test(url)) continue; } catch (_) {}
      if (search.story_url_regex) try { if (!new RegExp(search.story_url_regex, "i").test(url)) continue; } catch (_) {}
      const title = fieldValue(item, search.title, pageUrl, raw) || text(one(item, "h1,h2,h3,.title,a[href]"));
      if (!title) continue;
      seen.add(url); out.push({ title, url, author: fieldValue(item, search.author, pageUrl, raw), cover: fieldValue(item, search.cover, pageUrl, raw) });
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
    for (const marker of config.data_loading_checker || []) if ((typeof doc.getElementById === "function" && doc.getElementById(marker)) || one(doc, `.${marker}`)) return true;
    const node = config.content ? one(doc, config.content.selector, config.content.element_indexed) : bestContent(doc);
    return !!node && text(node).length >= 50;
  }

  const api = Object.freeze({
    id: config.domain,
    version: VERSION,
    config,
    domains: Array.from(new Set([config.domain].concat(config.keys || []).filter(Boolean))),
    match(url) { try { const host = new URL(url).hostname.toLowerCase(); return this.domains.some(d => host.includes(String(d).toLowerCase())); } catch (_) { return false; } },
    headers() { return Object.assign({}, (config.search && config.search.headers) || {}); },
    searchUrls,
    parseSearch,
    parseStory,
    parseChapterList: chapterLinks,
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
      const table = { searchUrls: () => searchUrls(payload.keyword), parseSearch: () => parseSearch(payload.html, payload.url), parseStory: () => parseStory(payload.html, payload.url), parseChapterList: () => chapterLinks(payload.html, payload.url), getFirstChapterUrl: () => firstChapter(payload.html, payload.url), parseChapter: () => parseChapter(payload.html, payload.url), findCover: () => findCover(payload.html, payload.url), pickRandomChapter: () => pickRandomChapter(payload.html, payload.url, payload.seed), resolveInput: () => resolveInput(payload.html, payload.url), isReady: () => isReady(payload.html) };
      if (!table[action]) throw new Error(`Action không hỗ trợ: ${action}`);
      return JSON.stringify(table[action]());
    }
  });

  global.NovelReaderSource = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
