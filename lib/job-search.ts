/** Public job-board integrations. CV text never enters these functions. */
export type ResearchJob = {
  id: string; title: string; company: string; url: string; source: string;
  description: string; location?: string; publishedAt?: string;
};
export type ResearchInput = { role?: string; industry?: string; location?: string };
export type SourceStatus = { name: string; status: "ok" | "error"; count: number; message?: string };

const MAX_BODY = 1_500_000;
const memoryCache = new Map<string, { expires: number; body: string }>();
const pending = new Map<string, Promise<string>>();
const USER_AGENT = "CVSignal/1.0 (public job keyword research)";

export class JobSearchError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function decodeEntities(input: string): string {
  const names: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", bull: "•", hellip: "…", middot: "·", eacute: "é", auml: "ä", ouml: "ö", uuml: "ü", szlig: "ß" };
  return input.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : " ";
    }
    return names[code.toLowerCase()] ?? entity;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/section|\/article|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .replace(/[\t\r ]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

async function boundedText(response: Response, limit = MAX_BODY): Promise<string> {
  const size = Number(response.headers.get("content-length") ?? 0);
  if (size > limit) throw new JobSearchError("The page is too large to import. Paste the job description instead.", 422);
  if (!response.body) return "";
  const reader = response.body.getReader(); const decoder = new TextDecoder();
  let bytes = 0, result = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new JobSearchError("The page is too large to import. Paste the job description instead.", 422); }
      result += decoder.decode(chunk.value, { stream: true });
    }
    return result + decoder.decode();
  } finally { reader.releaseLock(); }
}

function workerCache(): Cache | undefined {
  return typeof caches !== "undefined" ? (caches as unknown as { default?: Cache }).default : undefined;
}

async function cachedFeed(url: string, ttlSeconds: number): Promise<unknown> {
  const old = memoryCache.get(url);
  if (old && old.expires > Date.now()) return JSON.parse(old.body);
  if (pending.has(url)) return JSON.parse(await pending.get(url)!);
  const task = (async () => {
    const cache = workerCache();
    const key = new Request(url, { method: "GET" });
    try { const cached = await cache?.match(key); if (cached) return await cached.text(); } catch { /* Local environments may not expose Worker Cache API. */ }
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 16_000);
    try {
      const response = await fetch(url, { headers: { Accept: "application/json", "User-Agent": USER_AGENT }, signal: controller.signal });
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
      const body = await boundedText(response, 8_000_000);
      try { JSON.parse(body); } catch { throw new Error("Provider returned an unreadable response"); }
      memoryCache.set(url, { body, expires: Date.now() + ttlSeconds * 1000 });
      // Avoid retaining unbounded search strings in a warm isolate.
      if (memoryCache.size > 100) memoryCache.delete(memoryCache.keys().next().value!);
      try { await cache?.put(key, new Response(body, { headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${ttlSeconds}` } })); } catch { /* Caching is best effort outside Workers. */ }
      return body;
    } finally { clearTimeout(timer); }
  })();
  pending.set(url, task);
  try { return JSON.parse(await task); } finally { pending.delete(url); }
}

const normal = (value: string) => value.toLowerCase().replace(/[–—_/-]/g, " ").replace(/\s+/g, " ").trim();
const escaped = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, term: string) => new RegExp(`(?:^|[^a-z0-9])${escaped(normal(term))}(?=$|[^a-z0-9])`, "i").test(normal(text));

const ROLE_GROUPS = [
  { trigger: /\b(?:business intelligence|bi (?:analyst|developer|specialist|engineer))\b|^bi$/i, query: "data", aliases: ["business intelligence", "BI analyst", "BI developer", "BI specialist", "analytics engineer", "data analyst"] },
  { trigger: /\bdata analyst|\banalytics\b/i, query: "data", aliases: ["data analyst", "data analytics", "analytics analyst", "analytics engineer", "business intelligence"] },
  { trigger: /\bdata (?:scientist|science)\b/i, query: "data", aliases: ["data scientist", "data science", "machine learning"] },
  { trigger: /\bdata engineer/i, query: "data", aliases: ["data engineer", "analytics engineer", "data platform"] },
  { trigger: /\b(?:software (?:engineer|developer)|full.?stack|back.?end|front.?end)\b/i, query: "developer", aliases: ["software engineer", "software developer", "full stack", "fullstack", "frontend", "front end", "backend", "back end", "web developer"] },
  { trigger: /\b(?:product manager|product management)\b/i, query: "product", aliases: ["product manager", "product management", "product owner"] },
  { trigger: /\b(?:project manager|project management)\b/i, query: "project", aliases: ["project manager", "project management", "program manager"] },
  { trigger: /\b(?:ux|ui|user experience|product designer)\b/i, query: "design", aliases: ["product designer", "ux", "ui", "user experience", "user interface"] },
];
const INDUSTRY_GROUPS = [
  ["healthcare", "health care", "healthtech", "medical", "clinical", "hospital", "pharmaceutical"],
  ["finance", "financial services", "financial", "fintech", "banking", "insurance", "investment", "banking and finance"],
  ["technology", "tech", "software", "saas", "information technology"],
  ["retail", "ecommerce", "e commerce", "consumer goods", "merchandising"],
  ["manufacturing", "industrial", "production", "factory"],
  ["education", "edtech", "learning", "university", "school"],
  ["energy", "renewable", "utilities", "oil and gas", "solar"],
  ["logistics", "supply chain", "transportation", "shipping", "freight"],
];
const REGION_GROUPS = [
  ["europe", "european", "emea", "eu"], ["united states", "usa", "us", "north america"],
  ["united kingdom", "uk", "britain", "great britain"], ["asia", "apac", "asia pacific"],
];
const EUROPE_COUNTRIES = ["portugal", "cyprus", "greece", "germany", "france", "spain", "italy", "netherlands", "ireland", "belgium", "poland", "sweden", "denmark", "finland", "norway", "austria", "switzerland", "czechia", "romania", "bulgaria", "croatia", "hungary", "lithuania", "latvia", "estonia", "slovakia", "slovenia", "malta", "luxembourg"];

export function searchQuery(input: ResearchInput): string {
  const role = (input.role ?? "").trim();
  const group = ROLE_GROUPS.find((item) => item.trigger.test(role));
  if (group) return group.query;
  if (!role) {
    const industry = normal(input.industry ?? "");
    const industryGroup = INDUSTRY_GROUPS.find((aliases) => aliases.includes(industry));
    if (industryGroup) return industryGroup[0];
  }
  const value = role || input.industry || "";
  const words = normal(value).split(" ").filter((word) => !["senior", "junior", "lead", "principal", "specialist", "manager", "management", "head", "director", "of"].includes(word));
  return (words.join(" ") || value).slice(0, 50);
}

export function matchesResearch(job: ResearchJob, input: ResearchInput): boolean {
  const role = normal(input.role ?? ""), industry = normal(input.industry ?? ""), location = normal(input.location ?? "");
  const title = normal(job.title), text = `${title}\n${job.company}\n${job.description}`;
  if (role) {
    const group = ROLE_GROUPS.find((item) => item.trigger.test(role));
    if (group) {
      if (!group.aliases.some((alias) => has(title, alias))) return false;
    } else {
      const terms = role.split(" ").filter((word) => !["senior", "junior", "lead", "principal", "head", "of"].includes(word));
      if (!has(title, role) && !terms.every((term) => has(title, term))) return false;
    }
  }
  if (industry && !["all", "all industries", "any", "any industry"].includes(industry)) {
    const aliases = INDUSTRY_GROUPS.find((group) => group.includes(industry)) ?? [industry];
    if (!aliases.some((alias) => has(text, alias))) return false;
  }
  if (location && !["all", "any", "anywhere", "worldwide", "remote", "global"].includes(location)) {
    const geo = normal(job.location ?? "");
    if (!geo) return false;
    const worldwide = /\b(worldwide|anywhere|global)\b/.test(geo);
    const region = REGION_GROUPS.find((group) => group.includes(location));
    const europeEligible = EUROPE_COUNTRIES.includes(location) && ["europe", "european", "emea", "eu"].some((term) => has(geo, term));
    if (!worldwide && !has(geo, location) && !region?.some((term) => has(geo, term)) && !europeEligible) return false;
  }
  return true;
}

function safeListingURL(value: unknown, sourceHost?: string): string {
  try { const url = new URL(String(value)); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password && (!sourceHost || url.hostname === sourceHost || url.hostname.endsWith(`.${sourceHost}`)) ? url.href : ""; } catch { return ""; }
}

const providers = [
  { name: "Remotive", endpoint: () => "https://remotive.com/api/remote-jobs?limit=1000", ttl: 21_600,
    parse: (data: any): ResearchJob[] => (Array.isArray(data.jobs) ? data.jobs : []).map((j: any) => ({ id: `remotive-${j.id}`, title: htmlToText(String(j.title ?? "")), company: htmlToText(String(j.company_name ?? "")), description: htmlToText(String(j.description ?? "")), url: safeListingURL(j.url, "remotive.com"), source: "Remotive", location: String(j.candidate_required_location ?? ""), publishedAt: String(j.publication_date ?? "") })) },
  { name: "Jobicy", endpoint: (query: string) => `https://jobicy.com/api/jobs?count=200&tag=${encodeURIComponent(query.length >= 3 ? query : "")}`, ttl: 3600,
    parse: (data: any): ResearchJob[] => (Array.isArray(data.jobs) ? data.jobs : []).map((j: any) => ({ id: `jobicy-${j.id}`, title: htmlToText(String(j.jobTitle ?? "")), company: htmlToText(String(j.companyName ?? "")), description: htmlToText(String(j.jobDescription ?? "")), url: safeListingURL(j.url, "jobicy.com"), source: "Jobicy", location: String(j.jobGeo ?? ""), publishedAt: String(j.pubDate ?? j.publicationDate ?? "") })) },
  { name: "Arbeitnow", endpoint: () => "https://www.arbeitnow.com/api/job-board-api", ttl: 3600,
    parse: (data: any): ResearchJob[] => (Array.isArray(data.data) ? data.data : []).map((j: any) => ({ id: `arbeitnow-${j.slug}`, title: htmlToText(String(j.title ?? "")), company: htmlToText(String(j.company_name ?? "")), description: htmlToText(String(j.description ?? "")), url: safeListingURL(j.url, "arbeitnow.com"), source: "Arbeitnow", location: String(j.location ?? "") + (j.remote ? " (Remote)" : ""), publishedAt: typeof j.created_at === "number" ? new Date(j.created_at * 1000).toISOString() : "" })) },
];

export async function researchJobs(input: ResearchInput) {
  const clean: ResearchInput = {};
  for (const key of ["role", "industry", "location"] as const) {
    const value = input[key];
    if (value !== undefined && typeof value !== "string") throw new JobSearchError(`${key} must be text.`);
    if (value && value.length > 120) throw new JobSearchError(`${key} must be 120 characters or fewer.`);
    clean[key] = (value ?? "").trim();
  }
  if (!clean.role && !clean.industry) throw new JobSearchError("Enter a job role or an industry to begin.");
  const query = searchQuery(clean);
  const responses = await Promise.all(providers.map(async (provider) => {
    try {
      const data = await cachedFeed(provider.endpoint(query), provider.ttl);
      const container = data as Record<string, unknown>;
      if (!container || !Array.isArray(provider.name === "Arbeitnow" ? container.data : container.jobs)) throw new Error("Provider returned no readable jobs array");
      const all = provider.parse(data).filter((job) => job.title && job.description && job.url);
      const jobs = all.filter((job) => matchesResearch(job, clean));
      const hours = provider.ttl / 3600;
      return { jobs, source: { name: provider.name, status: "ok", count: jobs.length, message: `${all.length} available listings checked. Cached up to ${hours} ${hours === 1 ? "hour" : "hours"}.` } as SourceStatus };
    } catch (error) {
      const timeout = error instanceof Error && /abort|timeout/i.test(error.name + error.message);
      return { jobs: [], source: { name: provider.name, status: "error", count: 0, message: timeout ? "Provider timed out. Try again later or paste a job description." : "Provider is unavailable. Other sources can still return results." } as SourceStatus };
    }
  }));
  const seen = new Set<string>();
  const jobs = responses.flatMap((response) => response.jobs).filter((job) => {
    const key = normal(`${job.title}|${job.company}`);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 150);
  return {
    jobs, sources: responses.map((response) => response.source), searchedAt: new Date().toISOString(),
    queries: [query],
    notice: "A sample of available public job-board listings, not the whole job market. Remotive listings are delayed by 24 hours; Jobicy covers the last 7 days; Arbeitnow checks its latest page. Industry matching uses description keywords and may include adjacent sectors. Location matching is approximate; confirm eligibility in the original listing.",
  };
}

// Restrict imports to known public job boards/ATS hosts. Arbitrary company URLs
// deliberately require paste input so this endpoint cannot be used as an open proxy.
const IMPORT_DOMAINS = ["remoterocketship.com", "remotive.com", "jobicy.com", "arbeitnow.com", "arbeitnow.co.uk", "boards.greenhouse.io", "job-boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com", "apply.workable.com", "jobs.smartrecruiters.com", "teamtailor.com", "join.com", "jobs.personio.com", "recruitee.com"];

export function validateImportURL(raw: string): URL {
  let url: URL;
  try { url = new URL(raw); } catch { throw new JobSearchError("Enter a valid job posting URL, or paste its description."); }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.port || /[\[\]:]/.test(url.hostname)) throw new JobSearchError("Use a public job posting URL without credentials or a custom port.");
  const hostname = url.hostname.toLowerCase();
  if (!IMPORT_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) throw new JobSearchError("URL import supports Remote Rocketship, Remotive, Jobicy, Arbeitnow and major job-board/ATS domains. For this website, paste the job description instead.", 422);
  url.hash = "";
  return url;
}

function findJobPosting(value: unknown): Record<string, any> | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) { for (const item of value) { const found = findJobPosting(item); if (found) return found; } return undefined; }
  const record = value as Record<string, any>;
  const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
  if (types.includes("JobPosting")) return record;
  if (record["@graph"]) return findJobPosting(record["@graph"]);
  return undefined;
}

function metaValue(html: string, property: string): string {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs: Record<string, string> = {};
    for (const attr of match[0].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) attrs[attr[1].toLowerCase()] = attr[3];
    if (attrs.property === property || attrs.name === property) return decodeEntities(attrs.content ?? "");
  }
  return "";
}

function recognizedDescriptionRegion(html: string): string | undefined {
  // Broad <main>/<article> fallbacks can mix unrelated jobs, navigation and
  // sign-up copy into the keyword corpus. Require an explicitly marked job
  // description region and evidence of duties/requirements in that region.
  const markers = new Set(["job-description", "jobdescription", "job_description", "job-desc", "job__description", "posting-description", "job-details-description", "job-description-body", "job-description-container"]);
  for (const match of html.matchAll(/<([a-z][\w:-]*)\b([^>]*)>/gi)) {
    const tag = match[1].toLowerCase();
    const attributes: Record<string, string> = {};
    for (const attr of match[2].matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) attributes[attr[1].toLowerCase()] = attr[3].toLowerCase();
    const named = [attributes.id, attributes["data-testid"], attributes["data-test"], ...(attributes.class ?? "").split(/\s+/)].some((name) => markers.has(name));
    if (!named && attributes.itemprop !== "description") continue;
    if (["script", "style", "input", "meta", "link", "img", "br"].includes(tag)) continue;
    const start = (match.index ?? 0) + match[0].length;
    const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, "gi");
    tags.lastIndex = start;
    let depth = 1, closing: RegExpExecArray | null;
    while ((closing = tags.exec(html))) {
      if (closing[0].startsWith("</")) depth--;
      else if (!closing[0].endsWith("/>")) depth++;
      if (depth === 0) {
        const region = html.slice(start, closing.index);
        const text = htmlToText(region);
        if (text.length >= 100 && /\b(requirements|qualifications|responsibilities|what you(?:'|’)ll (?:do|bring)|what you will do|skills (?:and|&) experience|must (?:have|be)|required (?:skills|experience)|you (?:will|have))\b/i.test(text)) return region;
        break;
      }
    }
  }
  return undefined;
}

export function parseJobHTML(html: string, url: string): ResearchJob {
  // Remote Rocketship publishes the selected job as inert Next page data.
  // Read only jobOpening; relatedJobs is deliberately excluded from the corpus.
  if (new URL(url).hostname.replace(/^www\./, "") === "remoterocketship.com") {
    const pageData = html.match(/<script\b[^>]*id\s*=\s*["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script\s*>/i)?.[1];
    if (pageData) {
      try {
        const opening = JSON.parse(pageData)?.props?.pageProps?.jobOpening;
        if (opening && typeof opening.roleTitle === "string" && typeof opening.roleDescription === "string") {
          const description = [opening.roleDescription, opening.roleRequirements ? `Requirements\n${opening.roleRequirements}` : ""].filter(Boolean).map((part) => htmlToText(String(part))).join("\n\n");
          if (description.length >= 100) return {
            id: `rocketship-${opening.id}`, title: htmlToText(opening.roleTitle), company: htmlToText(String(opening.company?.name ?? "Unknown company")),
            url, source: "Remote Rocketship", description: description.slice(0, 100_000),
            location: [opening.location, opening.locationType === "remote" ? "Remote" : ""].filter(Boolean).join(" · "), publishedAt: String(opening.created_at ?? ""),
          };
        }
      } catch { /* Fall through to standard job data or readable HTML. */ }
    }
  }
  let posting: Record<string, any> | undefined;
  for (const script of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)) {
    try { posting = findJobPosting(JSON.parse(script[1])); if (posting) break; } catch { /* Some pages contain other malformed JSON-LD blocks. */ }
  }
  let title = "", description = "", company = "", location = "", publishedAt = "";
  if (posting) {
    title = htmlToText(String(posting.title ?? posting.name ?? ""));
    description = htmlToText(String(posting.description ?? ""));
    const organization = posting.hiringOrganization;
    company = htmlToText(typeof organization === "string" ? organization : String(organization?.name ?? ""));
    const places = Array.isArray(posting.jobLocation) ? posting.jobLocation : [posting.jobLocation];
    location = places.filter(Boolean).map((place: any) => {
      const address = place.address ?? {};
      return [address.addressLocality, address.addressRegion, typeof address.addressCountry === "string" ? address.addressCountry : address.addressCountry?.name].filter(Boolean).join(", ");
    }).filter(Boolean).join(" · ");
    if (posting.jobLocationType === "TELECOMMUTE") location = location ? `${location} (Remote)` : "Remote — eligibility unspecified";
    publishedAt = String(posting.datePosted ?? "");
  }
  if (!description || description.length < 100) {
    const region = recognizedDescriptionRegion(html);
    if (!region) throw new JobSearchError("This page does not expose a specific readable job description. Open an individual job posting, or paste its description instead.", 422);
    description = htmlToText(region);
    title ||= htmlToText(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1\s*>/i)?.[1] ?? "");
  }
  title ||= metaValue(html, "og:title") || htmlToText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1] ?? "Imported job posting");
  if (description.length < 100 || /^(just a moment|access denied|captcha|please enable javascript)/i.test(description)) throw new JobSearchError("This page could not be read. Paste the job description instead.", 422);
  return { id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, title: title.slice(0, 250), company: company || new URL(url).hostname.replace(/^www\./, ""), url, source: "Imported posting", description: description.slice(0, 100_000), location, publishedAt };
}

export async function importJob(raw: string): Promise<ResearchJob> {
  if (!raw || raw.length > 3000) throw new JobSearchError("Enter a valid job posting URL.");
  let url = validateImportURL(raw);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 16_000);
  try {
    for (let hop = 0; hop < 5; hop++) {
      const response = await fetch(url.href, { redirect: "manual", signal: controller.signal, headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": USER_AGENT } });
      if (response.status >= 300 && response.status < 400) {
        const destination = response.headers.get("location");
        if (!destination) throw new JobSearchError("This page redirected without a destination. Paste the description instead.", 422);
        await response.body?.cancel();
        url = validateImportURL(new URL(destination, url).href);
        continue;
      }
      if (!response.ok) throw new JobSearchError(`The website returned HTTP ${response.status}. Paste the job description instead.`, 422);
      const contentType = response.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new JobSearchError("The URL must open an HTML job posting. Paste its description instead.", 422);
      return parseJobHTML(await boundedText(response), url.href);
    }
    throw new JobSearchError("The page redirected too many times. Paste the job description instead.", 422);
  } catch (error) {
    if (error instanceof JobSearchError) throw error;
    throw new JobSearchError("The website could not be reached or blocked automated access. Paste the job description instead.", 422);
  } finally { clearTimeout(timer); }
}
