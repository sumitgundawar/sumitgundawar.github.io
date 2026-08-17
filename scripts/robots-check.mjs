/* What robots.txt actually permits, evaluated rather than eyeballed.
 *
 * The live file is not the file in this repo. Cloudflare prepends a managed
 * block that disallows nine agents, and public/robots.txt is appended after it,
 * so the effective policy is the combination of the two and cannot be read off
 * either one. Reading it wrongly is easy: the first version of this checker
 * merged each agent's own rules with the wildcard group and concluded that CCBot
 * was allowed, which is the opposite of the truth.
 *
 * So this implements the matcher properly: most specific group only, falling
 * back to the wildcard when an agent has no group of its own; groups naming the
 * same agent combined; longest path match wins; on a tie the least restrictive
 * wins. Then it asserts the intended policy rather than describing the file.
 *
 * Usage: node scripts/robots-check.mjs
 */

/* RFC 9309 + Google's matcher, correctly this time:
   - a crawler uses the MOST SPECIFIC matching group only, falling back to * if
     it has no group of its own
   - groups naming the same agent are combined
   - the longest matching path wins; on a tie the least restrictive wins */
function parse(txt){
  const groups=new Map(); let cur=[];
  let expectingAgents=false;
  for(const raw of txt.split("\n")){
    const line=raw.replace(/#.*$/,"").trim(); if(!line) continue;
    const i=line.indexOf(":"); if(i<0) continue;
    const key=line.slice(0,i).trim().toLowerCase(); const val=line.slice(i+1).trim();
    if(key==="user-agent"){
      if(!expectingAgents){ cur=[]; expectingAgents=true; }
      cur.push(val); if(!groups.has(val)) groups.set(val,[]);
    } else if(key==="allow"||key==="disallow"){
      expectingAgents=false;
      for(const ua of cur) groups.get(ua).push({type:key,path:val});
    }
  }
  return groups;
}
function allowed(groups, ua, path){
  const own = groups.get(ua);
  const rules = (own && own.length) ? own : (groups.get("*") || []);
  const matching = rules.filter(r => r.path === "" || path.startsWith(r.path));
  if(!matching.length) return true;
  const max = Math.max(...matching.map(r => r.path.length));
  const top = matching.filter(r => r.path.length === max);
  return top.some(r => r.type === "allow");
}
const txt = await (await fetch("https://sumitgundawar.com/robots.txt?cb="+Date.now())).text();
const g = parse(txt);
const want = {
  ClaudeBot:"allowed", GPTBot:"allowed", "Google-Extended":"allowed",
  CloudflareBrowserRenderingCrawler:"allowed",
  Googlebot:"allowed", Bingbot:"allowed",
  CCBot:"blocked", Bytespider:"blocked", Amazonbot:"blocked", "meta-externalagent":"blocked",
};
let bad=0;
for(const [ua,exp] of Object.entries(want)){
  const got = allowed(g,ua,"/") ? "allowed" : "blocked";
  const api = allowed(g,ua,"/api/x") ? "allowed" : "blocked";
  const ok = got===exp;
  if(!ok) bad++;
  console.log(`${ok?"pass":"FAIL"}  ${ua.padEnd(34)} site ${got.padEnd(7)} (want ${exp})   /api/ ${api}`);
}
console.log(`\n${Object.keys(want).length-bad} passed, ${bad} failed`);
process.exit(bad?1:0);
