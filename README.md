# CV Signal

A job-keyword research app with live public job-board search and local CV comparison.

## Features

- Search by role, industry, or both; optionally narrow by location.
- Research available Remotive, Jobicy and Arbeitnow feeds. Provider errors and sample limits are visible.
- Import supported job-board/ATS URLs, including Remote Rocketship, or paste descriptions.
- Rank observed English skills using posting frequency and explicit requirements, with source evidence.
- Compare CV text for strong, partial and missing wording; show the weighted coverage formula.
- Save up to eight research sets in browser storage and export a CSV.

CV matching runs in the browser. CV text is kept only in React state and is not transmitted or included in saved research. Refreshing clears it. The app does not claim ATS equivalence, universal mandatory keywords, or interview predictions.

## Development

Requires Node >=22.13.0. Install with `npm run install:ci`, then `npm run dev` (port 5173). Production uses Vinext on Cloudflare Workers and the supplied Sites Vite integration.

Checks:

```
node node_modules/typescript/bin/tsc --noEmit
node tests/keywords.test.mjs
node tests/job-search.test.mjs
npm run build
```

No external API key is required. Public feeds are cached for 1–6 hours. Their available samples are remote-focused; industry and location matching are approximate. Import supports allowlisted public job boards/ATS hosts and checks redirect targets. The GitHub repository contains source code; the live search endpoints need a server or Cloudflare Workers deployment. GitHub Pages alone cannot run these endpoints. The included hosting manifest has no Site identity or credentials.

## Main files

- `app/page.tsx`: research workspace and CV comparison interface
- `app/globals.css`: responsive visual system
- `lib/keywords.ts`: extraction, priority, evidence and matching engine
- `lib/job-search.ts`: feed clients, query matching, URL validation and posting parsers
- `app/api/research/route.ts` and `app/api/import/route.ts`: server endpoints

English lexical rules intentionally favor traceable evidence. For broader global coverage, integrate licensed job/search sources and enrich the taxonomy; preserve source provenance and visibly distinguish inferred terms from observed terms.
