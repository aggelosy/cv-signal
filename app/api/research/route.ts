import { JobSearchError, researchJobs } from "@/lib/job-search";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 2000) return Response.json({ error: "Search input is too long." }, { status: 413 });
    let input;
    try { input = JSON.parse(body); } catch { return Response.json({ error: "Send valid JSON search input." }, { status: 400 }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Enter a job role or industry." }, { status: 400 });
    return Response.json(await researchJobs(input), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof JobSearchError ? error.message : "Research could not complete. Try again or add a job description." }, { status: error instanceof JobSearchError ? error.status : 500 });
  }
}
