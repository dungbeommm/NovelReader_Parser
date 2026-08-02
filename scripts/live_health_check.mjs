#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'sources.json'), 'utf8'));
const limitArg = process.argv.find(x => x.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : sources.length;
const selected = sources.slice(0, limit);
const browser = await chromium.launch({ headless: true });
const report = [];

for (const item of selected) {
  const started = Date.now();
  const page = await browser.newPage({ userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/122 Mobile Safari/537.36' });
  page.setDefaultTimeout(20000);
  try {
    const folder = path.join(root, 'sources', item.id.replace(/[^A-Za-z0-9._-]+/g, '_'));
    const jsName = fs.readdirSync(folder).find(name => name.endsWith('.js'));
    const js = fs.readFileSync(path.join(folder, jsName), 'utf8');
    await page.goto(item.homepage_url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    const candidates = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]')).map(a => a.href).filter((u, i, a) => u && a.indexOf(u) === i && /(\/truyen\/|\/story\/|\/novel\/|\/manga\/|\/doc-truyen\/)/i.test(u) && !/(chuong|chapter|chap)[-_\/]?\d/i.test(u)).slice(0, 50));
    const storyUrl = candidates[Math.abs(item.id.split('').reduce((h,c) => ((h * 31) + c.charCodeAt(0)) | 0, 7)) % Math.max(1, candidates.length)] || item.homepage_url;
    await page.goto(storyUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.addScriptTag({ content: js });
    await page.waitForTimeout(700);
    const story = await page.evaluate(() => window.NovelReaderSource.parseStory(document, location.href));
    const picked = await page.evaluate(seed => window.NovelReaderSource.pickRandomChapter(document, location.href, seed), new Date().toISOString().slice(0, 10));
    const chapterUrl = picked?.url || story.firstChapterUrl;
    if (!chapterUrl) throw new Error('Không tìm thấy chương');
    await page.goto(chapterUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.addScriptTag({ content: js });
    await page.waitForTimeout(700);
    const chapter = await page.evaluate(() => window.NovelReaderSource.parseChapter(document, location.href));
    const cover = story.coverUrl || chapter.coverUrl || '';
    const ok = chapter.content.trim().length >= 100;
    report.push({ id:item.id, ok, storyUrl, chapterUrl, chapterTitle:chapter.chapterTitle, contentLength:chapter.content.length, coverUrl:cover, hasCover:!!cover, elapsedMs:Date.now()-started, error:ok?'':'Nội dung quá ngắn' });
  } catch (error) {
    report.push({ id:item.id, ok:false, elapsedMs:Date.now()-started, error:String(error.message || error) });
  } finally { await page.close(); }
}
await browser.close();
fs.mkdirSync(path.join(root, 'reports'), { recursive:true });
fs.writeFileSync(path.join(root, 'reports', 'live-health.json'), JSON.stringify({ checkedAt:new Date().toISOString(), total:report.length, passed:report.filter(x=>x.ok).length, results:report }, null, 2) + '\n');
console.log(`Live health: ${report.filter(x=>x.ok).length}/${report.length}`);
process.exit(report.every(x=>x.ok) ? 0 : 1);
