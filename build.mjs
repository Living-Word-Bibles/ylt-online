// YLT Static Verse Site Generator — single-file build (no deps)
// Output: ./dist/<book>/<chapter>/<verse>/index.html

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- Domain / Origin ----------
const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN?.trim(); // e.g., "ylt.livingwordbibles.com"
const DOMAIN = CUSTOM_DOMAIN || "ylt.livingwordbibles.com";          // default: no "www"
const SITE_ORIGIN = `https://${DOMAIN}`;

// ---------- Brand / Ads ----------
const BRAND = "Living Word Bibles";
const LOGO_URL = "https://static1.squarespace.com/static/68d6b7d6d21f02432fd7397b/t/690209b3567af44aabfbdaca/1761741235124/LivingWordBibles01.png";
const ADSENSE_CLIENT = "ca-pub-5303063222439969";
const TITLE_MAIN = "The Holy Bible: Young's Literal Translation";

// ---------- Data (prefers local, falls back to pinned JSON) ----------
const LOCAL_JSON = path.join(__dirname, "data", "YLT_bible.json");
const DATA_URLS = [
  "https://cdn.jsdelivr.net/gh/jadenzaleski/bible-translations@86d528c69b5bbcca9ce0dc0b17b037c1128c6651/YLT/YLT_bible.json",
  "https://raw.githubusercontent.com/jadenzaleski/bible-translations/86d528c69b5bbcca9ce0dc0b17b037c1128c6651/YLT/YLT_bible.json"
];

// ---------- Output ----------
const OUT_DIR = path.join(__dirname, "dist");

// ---------- Canon order & slugs ----------
const BOOK_ORDER = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings',
  '1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon','Isaiah',
  'Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah',
  'Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians',
  'Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];

const BOOK_SLUGS = {
  "Genesis":"genesis","Exodus":"exodus","Leviticus":"leviticus","Numbers":"numbers","Deuteronomy":"deuteronomy",
  "Joshua":"joshua","Judges":"judges","Ruth":"ruth","1 Samuel":"1-samuel","2 Samuel":"2-samuel",
  "1 Kings":"1-kings","2 Kings":"2-kings","1 Chronicles":"1-chronicles","2 Chronicles":"2-chronicles",
  "Ezra":"ezra","Nehemiah":"nehemiah","Esther":"esther","Job":"job","Psalms":"psalms","Proverbs":"proverbs",
  "Ecclesiastes":"ecclesiastes","Song of Solomon":"song-of-solomon","Isaiah":"isaiah","Jeremiah":"jeremiah",
  "Lamentations":"lamentations","Ezekiel":"ezekiel","Daniel":"daniel","Hosea":"hosea","Joel":"joel","Amos":"amos",
  "Obadiah":"obadiah","Jonah":"jonah","Micah":"micah","Nahum":"nahum","Habakkuk":"habakkuk","Zephaniah":"zephaniah",
  "Haggai":"haggai","Zechariah":"zechariah","Malachi":"malachi",
  "Matthew":"matthew","Mark":"mark","Luke":"luke","John":"john","Acts":"acts","Romans":"romans",
  "1 Corinthians":"1-corinthians","2 Corinthians":"2-corinthians","Galatians":"galatians","Ephesians":"ephesians",
  "Philippians":"philippians","Colossians":"colossians","1 Thessalonians":"1-thessalonians","2 Thessalonians":"2-thessalonians",
  "1 Timothy":"1-timothy","2 Timothy":"2-timothy","Titus":"titus","Philemon":"philemon","Hebrews":"hebrews",
  "James":"james","1 Peter":"1-peter","2 Peter":"2-peter","1 John":"1-john","2 John":"2-john","3 John":"3-john",
  "Jude":"jude","Revelation":"revelation"
};

// ---------- Helpers ----------
const sleep = (ms)=> new Promise(r=> setTimeout(r, ms));
const escapeHtml = (s)=> String(s ?? "").replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));

function detectFields(sample){
  const opt = { bk:['book','book_name','name','title','b','book_id'], ch:['chapter','chapter_num','c','chap','number'], vs:['verse','verse_num','v','num','id'], tx:['text','content','verse_text','t','body'] };
  const pick = arr=> arr.find(k=>k in sample) || null;
  const bk=pick(opt.bk), ch=pick(opt.ch), vs=pick(opt.vs), tx=pick(opt.tx);
  if(!bk||!ch||!vs||!tx) return null; return {bk,ch,vs,tx};
}
const normalizeBook = (v)=> typeof v==='number' ? BOOK_ORDER[Math.max(1,Math.min(66,v))-1] : String(v).trim();

function flattenBibleJSON(input){
  if(Array.isArray(input) && input.length){
    const f=detectFields(input[0]);
    if(f) return input.map(r=>({book:normalizeBook(r[f.bk]),chapter:+r[f.ch],verse:+r[f.vs],text:String(r[f.tx]).trim()}));
  }
  if(input && Array.isArray(input.books)){
    const out=[];
    input.books.forEach((b,bi)=>{
      const bname = normalizeBook(b.name||b.title||BOOK_ORDER[bi]||"");
      (b.chapters||b.Chapters||[]).forEach((c,ci)=>{
        const cnum = +(c.chapter||c.number||ci+1);
        (c.verses||c.Verses||[]).forEach((v,vi)=>{
          if(typeof v==='string') out.push({book:bname,chapter:cnum,verse:vi+1,text:v});
          else if(v) out.push({book:bname,chapter:cnum,verse:+(v.verse||v.number||vi+1),text:String(v.text||v.content||v.verse_text||"").trim()});
        });
      });
    });
    return out;
  }
  if(input && typeof input==='object'){
    const out=[];
    for(const bk of Object.keys(input)){
      const bname = normalizeBook(bk);
      const chs=input[bk]; if(!chs||typeof chs!=='object') continue;
      for(const ch of Object.keys(chs)){
        const cnum=+ch;
        const vobj=chs[ch]; if(typeof vobj!=='object') continue;
        for(const vs of Object.keys(vobj)){
          out.push({book:bname,chapter:cnum,verse:+vs,text:String(vobj[vs]).trim()});
        }
      }
    }
    if(out.length) return out;
  }
  throw new Error("Unsupported JSON shape");
}

async function fetchJson(){
  try{
    const buf = await fs.readFile(LOCAL_JSON, "utf8");
    console.log("Using local data:", LOCAL_JSON);
    return JSON.parse(buf);
  }catch(_){}
  let lastErr=null;
  for(const u of DATA_URLS){
    try{
      console.log("Fetching:", u);
      const r = await fetch(u, { cache: "no-store" });
      if(!r.ok) throw new Error("HTTP "+r.status);
      return await r.json();
    }catch(e){ lastErr=e; await sleep(200); }
  }
  throw lastErr || new Error("All fetches failed");
}

function pageHtml({book,chapter,verse,text}){
  const ref = `${book} ${chapter}:${verse}`;
  const canonical = `${SITE_ORIGIN}/${BOOK_SLUGS[book]}/${chapter}/${verse}/`;
  const title = `${ref} — ${TITLE_MAIN}`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${escapeHtml(title)}</title>
<link rel="canonical" href="${escapeHtml(canonical)}"/>
<meta name="description" content="${escapeHtml(ref)} — ${escapeHtml(TITLE_MAIN)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,600&display=swap" rel="stylesheet">
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}" crossorigin="anonymous"></script>
<style>
:root{--bg:#fff;--ink:#111;--ink-soft:#444;--border:#e6e6e6;--muted:#737373;--chip:#f5f5f5;--brand:#0f766e;--maxw:980px}
body{margin:0;background:var(--bg);color:var(--ink);font-family:'EB Garamond',serif}
.wrap{max-width:var(--maxw);margin:16px auto;padding:0 10px}
header{border:1px solid var(--border);border-radius:16px;padding:16px;background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.06);text-align:center}
header .logo{height:120px;width:auto;border-radius:12px;object-fit:contain}
header h1{margin:8px 0 0;font-size:24px;font-weight:600}
.actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:8px}
.btn{border:1px solid var(--border);background:#fff;color:var(--ink);border-radius:10px;padding:10px 14px;cursor:pointer;text-decoration:none;font-size:14px}
.btn.primary{background:var(--brand);border-color:var(--brand);color:#fff}
.search{display:flex;gap:8px;align-items:center}
.search input{border:1px solid var(--border);border-radius:10px;padding:10px 12px;font-size:14px;min-width:260px}
.passage{border:1px solid var(--border);border-radius:14px;padding:14px;margin-top:12px;background:#fff}
.refline{display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:6px}
.ref{font-variant:small-caps;letter-spacing:.03em;color:var(--ink-soft);font-size:14px}
.verse{font-size:20px;line-height:1.65}
.vnum{font-size:.7em;vertical-align:super;margin-right:6px;color:#777}
.sharebar{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.chip{background:var(--chip);border:1px solid var(--border);border-radius:999px;padding:8px 12px;font-size:13px;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
.chip:hover{background:#eee}
.icon{width:16px;height:16px;display:inline-block}
footer{margin:24px 0;color:var(--muted);font-size:13px;text-align:center}
footer .inner{border-top:1px solid var(--border);padding-top:10px}
footer a{color:var(--ink-soft);text-decoration:underline}
@media (max-width:560px){.search input{min-width:0;width:180px}}
</style>
</head>
<body>
<div class="wrap">
<header>
  <img class="logo" alt="${escapeHtml(BRAND)}" src="${escapeHtml(LOGO_URL)}"/>
  <h1>${escapeHtml(TITLE_MAIN)}</h1>
  <div class="actions">
    <a class="btn primary" href="https://www.livingwordbibles.com/read-the-bible-online/ylt">The Holy Bible</a>
    <form class="search" id="yltSearch" role="search" aria-label="Search verse">
      <input type="text" id="yltQuery" placeholder="Search verse (e.g., John 3:16)" aria-label="Verse reference">
      <button type="submit" class="btn">Go</button>
    </form>
  </div>
</header>

<main class="passage">
  <div class="refline"><div class="ref" id="refText">${escapeHtml(ref)}</div></div>
  <div class="verse"><span class="vnum">${verse}</span>${escapeHtml(text)}</div>

  <div class="sharebar" id="shareBar" aria-label="Share actions">
    <!-- ORDER: Facebook, Instagram, X, LinkedIn, Email, Copy -->
    <button class="chip" id="fbBtn" title="Share on Facebook">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12.06C22 6.55 17.52 2 12.06 2 6.55 2 2 6.55 2 12.06 2 17.03 5.66 21.17 10.39 22v-7.02h-2.9v-2.92h2.9V9.41c0-2.87 1.7-4.46 4.3-4.46 1.25 0 2.56.22 2.56.22v2.82h-1.44c-1.42 0-1.86.88-1.86 1.79v2.16h3.17l-.51 2.92h-2.66V22C18.34 21.17 22 17.03 22 12.06z"/></svg>
      </span><span>Facebook</span>
    </button>
    <button class="chip" id="igBtn" title="Share to Instagram">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 2h10a5 5 0 015 5v10a5 5 0 01-5 5H7a5 5 0 01-5-5V7a5 5 0 015-5zm10 2H7a3 3 0 00-3 3v10a3 3 0 003 3h10a3 3 0 003-3V7a3 3 0 00-3-3zm-5 3a5 5 0 110 10 5 5 0 010-10zm0 2.2a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6z"/></svg>
      </span><span>Instagram</span>
    </button>
    <button class="chip" id="xBtn" title="Share on X">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h4.6l5.1 7.3L18.6 3H21l-7 9.3L21 21h-4.6l-5.3-7.6L5.4 21H3l7.6-10.2L3 3z"/></svg>
      </span><span>X</span>
    </button>
    <button class="chip" id="liBtn" title="Share on LinkedIn">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8h5v16H0V8zm7.5 0h4.8v2.2H12c.67-1.27 2.3-2.6 4.74-2.6 5.07 0 6.01 3.33 6.01 7.65V24h-5V16c0-1.91-.03-4.37-2.66-4.37-2.66 0-3.07 2.08-3.07 4.23V24h-5V8z"/></svg>
      </span><span>LinkedIn</span>
    </button>
    <button class="chip" id="emailBtn" title="Share via Email">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 6a2 2 0 012-2h16a2 2 0 012 2l-10 7L2 6zm0 2.24V18a2 2 0 002 2h16a2 2 0 002-2V8.24l-9.12 6.38a2 2 0 01-2.28 0L2 8.24z"/></svg>
      </span><span>Email</span>
    </button>
    <button class="chip" id="copyBtn" title="Copy verse">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H6a2 2 0 00-2 2v12h2V3h10V1zm3 4H10a2 2 0 00-2 2v14a2 2 0 002 2h9a2 2 0 002-2V7a2 2 0 00-2-2zm0 16H10V7h9v14z"/></svg>
      </span><span>Copy</span>
    </button>
  </div>

  <!-- Optional manual ad slot -->
  <ins class="adsbygoogle" style="display:block;text-align:center;margin:12px 0"
       data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="REPLACE_WITH_SLOT_ID"
       data-ad-format="auto" data-full-width-responsive="true"></ins>
  <script>(adsbygoogle = window.adsbygoogle || []).push({});</script>
</main>

<footer>
  <div class="inner">
    Copyright © 2025 | Living Word Bibles | All Rights Reserved |
    <a href="https://www.livingwordbibles.com" rel="noopener">www.livingwordbibles.com</a>
  </div>
</footer>
</div>

<script>
const ORIGIN = "${SITE_ORIGIN}";
const BOOK_SLUGS = ${JSON.stringify(BOOK_SLUGS)};
const ABBR = {"gen":"Genesis","ex":"Exodus","exod":"Exodus","lev":"Leviticus","num":"Numbers","deut":"Deuteronomy","dt":"Deuteronomy","josh":"Joshua","judg":"Judges","1sam":"1 Samuel","2sam":"2 Samuel","1kgs":"1 Kings","2kgs":"2 Kings","1chr":"1 Chronicles","2chr":"2 Chronicles","neh":"Nehemiah","esth":"Esther","job":"Job","ps":"Psalms","psa":"Psalms","prov":"Proverbs","eccl":"Ecclesiastes","song":"Song of Solomon","cant":"Song of Solomon","isa":"Isaiah","jer":"Jeremiah","lam":"Lamentations","ezek":"Ezekiel","dan":"Daniel","hos":"Hosea","joel":"Joel","amos":"Amos","obad":"Obadiah","jon":"Jonah","mic":"Micah","nah":"Nahum","hab":"Habakkuk","zeph":"Zephaniah","hag":"Haggai","zech":"Zechariah","mal":"Malachi","mt":"Matthew","matt":"Matthew","mk":"Mark","mrk":"Mark","lk":"Luke","lu":"Luke","jn":"John","rom":"Romans","1cor":"1 Corinthians","2cor":"2 Corinthians","gal":"Galatians","eph":"Ephesians","phil":"Philippians","col":"Colossians","1thess":"1 Thessalonians","2thess":"2 Thessalonians","1tim":"1 Timothy","2tim":"2 Timothy","tit":"Titus","phlm":"Philemon","heb":"Hebrews","jas":"James","1pet":"1 Peter","2pet":"2 Peter","1jn":"1 John","2jn":"2 John","3jn":"3 John","jude":"Jude","rev":"Revelation"};

(function(){
  const form = document.getElementById("yltSearch");
  const input = document.getElementById("yltQuery");
  if(!form||!input) return;
  form.addEventListener("submit", (e)=>{
    e.preventDefault();
    const q = (input.value||"").trim().replace(/\s+/g," ");
    const m = q.match(/^(.+?)\s+(\d+)(?::|\.)(\d+)$/);
    if(!m){ input.value=""; input.placeholder="Try e.g., John 3:16"; return; }
    const raw = m[1].trim(), chap=+m[2], vs=+m[3];
    const key = raw.toLowerCase().replace(/\s+/g,'');
    const book = ABBR[key] || raw.replace(/\b([a-z])/gi,(x)=>x.toUpperCase()).replace(/([A-Z])([A-Z]+)/g,(m,a,b)=>a+b.toLowerCase());
    const slug = BOOK_SLUGS[book];
    if(!slug) { input.value=""; input.placeholder="Try e.g., John 3:16"; return; }
    location.href = \`\${ORIGIN}/\${slug}/\${chap}/\${vs}/\`;
  });
})();
</script>
</body></html>`;
}

// ---------- Build ----------
async function main(){
  try{
    console.log("Building for domain:", DOMAIN);

    await fs.rm(OUT_DIR, { recursive:true, force:true });
    await fs.mkdir(OUT_DIR, { recursive:true });

    // CNAME & robots
    await fs.writeFile(path.join(OUT_DIR, "CNAME"), DOMAIN + "\n", "utf8");
    await fs.writeFile(path.join(OUT_DIR, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`, "utf8");

    const raw = await fetchJson();
    const rows = flattenBibleJSON(raw);

    // Sort canonically
    rows.sort((a,b)=>{
      const ai = BOOK_ORDER.indexOf(a.book), bi = BOOK_ORDER.indexOf(b.book);
      if(ai !== bi) return ai - bi;
      if(a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });

    // Root redirect → Genesis 1:1
    const rootRedirect = `${SITE_ORIGIN}/${BOOK_SLUGS['Genesis']}/1/1/`;
    await fs.writeFile(path.join(OUT_DIR, "index.html"),
      `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${rootRedirect}"><link rel="canonical" href="${rootRedirect}">`,
      "utf8"
    );

    // Write pages
    const urls = [];
    for(const {book,chapter,verse,text} of rows){
      if(!BOOK_SLUGS[book]) continue;
      const dir = path.join(OUT_DIR, BOOK_SLUGS[book], String(chapter), String(verse));
      await fs.mkdir(dir, { recursive:true });
      await fs.writeFile(path.join(dir, "index.html"), pageHtml({book,chapter,verse,text}), "utf8");
      urls.push(`${SITE_ORIGIN}/${BOOK_SLUGS[book]}/${chapter}/${verse}/`);
    }

    // sitemap.xml
    const sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map(u=>`  <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join("\n") +
      `\n</urlset>\n`;
    await fs.writeFile(path.join(OUT_DIR, "sitemap.xml"), sm, "utf8");

    console.log(`Built ${urls.length} verse pages → dist/`);
  }catch(e){
    console.error("BUILD FAILED:", e?.stack || e?.message || e);
    process.exit(1);
  }
}

await main();
