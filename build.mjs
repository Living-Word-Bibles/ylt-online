// YLT Static Verse Site Generator — Living Word Bibles
.replaceAll("{{CHAPTER}}", String(chapter))
.replaceAll("{{VERSE}}", String(verse))
.replaceAll("{{REF}}", escapeHtml(ref))
.replaceAll("{{VERSE_TEXT}}", escapeHtml(text))
.replaceAll("{{PAGE_TITLE}}", escapeHtml(title))
.replaceAll("{{CANONICAL}}", escapeHtml(canonical));
return body;
}


// ---------- Build ----------
async function main(){
await fs.rm(OUT_DIR, { recursive:true, force:true });
await fs.mkdir(OUT_DIR, { recursive:true });


// CNAME (required for custom domain in GitHub Pages)
await fs.writeFile(path.join(OUT_DIR, "CNAME"), "www.ylt.livingwordbibles.com\n", "utf8");


// robots.txt
await fs.writeFile(path.join(OUT_DIR, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`, "utf8");


const raw = await fetchJson();
const rows = flattenBibleJSON(raw);


// Sort by canonical order
rows.sort((a,b)=>{
const ai = BOOK_ORDER.indexOf(a.book), bi = BOOK_ORDER.indexOf(b.book);
if(ai !== bi) return ai - bi;
if(a.chapter !== b.chapter) return a.chapter - b.chapter;
return a.verse - b.verse;
});


// Group for sitemap
const urls = [];


// Root index redirects to Genesis 1:1
const rootRedirect = `${SITE_ORIGIN}/${BOOK_SLUGS['Genesis']}/1/1/`;
const rootHtml = `<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=${rootRedirect}"><link rel="canonical" href="${rootRedirect}">`;
await fs.writeFile(path.join(OUT_DIR, "index.html"), rootHtml, "utf8");


// Write verse pages
for(const {book,chapter,verse,text} of rows){
if(!BOOK_SLUGS[book]) continue;
const dir = path.join(OUT_DIR, BOOK_SLUGS[book], String(chapter), String(verse));
await fs.mkdir(dir, { recursive:true });
const html = renderHtml({book,chapter,verse,text});
await fs.writeFile(path.join(dir, "index.html"), html, "utf8");


urls.push(`${SITE_ORIGIN}/${BOOK_SLUGS[book]}/${chapter}/${verse}/`);
}


// sitemap.xml
const sm = `<?xml version="1.0" encoding="UTF-8"?>\n`+
`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
urls.map(u=> ` <url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join("\n")+
"\n</urlset>\n";
await fs.writeFile(path.join(OUT_DIR, "sitemap.xml"), sm, "utf8");


console.log(`Built ${urls.length} verse pages → dist/`);
}


main().catch(e=>{ console.error(e); process.exit(1); });
