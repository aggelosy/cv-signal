import { importJob, JobSearchError } from "@/lib/job-search";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 4000) return Response.json({ error: "The URL is too long." }, { status: 413 });
    let input;
    try { input = JSON.parse(body); } catch { return Response.json({ error: "Send a valid job posting URL." }, { status: 400 }); }
    if (typeof input?.url !== "string") return Response.json({ error: "Enter a job posting URL." }, { status: 400 });
    const job = await importJob(input.url.trim());
    return Response.json({ job }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof JobSearchError ? error.message : "This page could not be imported. Paste the job description instead." }, { status: error instanceof JobSearchError ? error.status : 500 });
  }
}
