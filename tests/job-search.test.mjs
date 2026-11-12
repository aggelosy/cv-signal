import assert from 'node:assert/strict';
import { htmlToText, validateImportURL, parseJobHTML, matchesResearch, searchQuery, importJob, researchJobs } from '../lib/job-search.ts';

assert.equal(htmlToText('<h2>Requirements</h2><p>SQL &amp; Tableau</p><script>Python</script><p>&#67;&#x23;</p>'), 'Requirements\nSQL & Tableau\nC#');
for (const url of [
  'http://localhost/admin', 'http://127.0.0.1/', 'http://2130706433/', 'http://0x7f000001/',
  'http://[::1]/', 'http://169.254.169.254/latest/meta-data/', 'https://remotive.com.evil.example/job',
  'https://evil.example/remotive.com', 'https://user:pass@remotive.com/job', 'https://remotive.com:8443/job',
  'file:///etc/passwd', 'ftp://remotive.com/job', 'https://internal.corp/job', 'https://remotive.com./job',
]) assert.throws(() => validateImportURL(url), undefined, `Reject ${url}`);
for (const url of ['https://www.remoterocketship.com/publicjobs/a/', 'https://jobs.lever.co/acme/job', 'https://acme.teamtailor.com/jobs/123']) assert.equal(validateImportURL(url).protocol, 'https:');

const fixture = { id: 'j', title: 'Senior BI Specialist', company: 'Hospital Group', source: 'Fixture', url: 'https://remotive.com/job', description: 'Business intelligence reporting for healthcare.', location: 'Europe' };
assert.ok(matchesResearch(fixture, { role: 'Business Intelligence Specialist', industry: 'Healthcare', location: 'Portugal' }));
assert.ok(!matchesResearch({ ...fixture, title: 'Senior Sales Manager', description: 'We have a business intelligence team.' }, { role: 'Business Intelligence Specialist' }));
assert.ok(!matchesResearch(fixture, { industry: 'Banking' }));
assert.ok(matchesResearch({ ...fixture, company: 'Retail Bank', description: 'Deliver BI dashboards for our banking customers.' }, { industry: 'Financial services' }));
assert.ok(!matchesResearch(fixture, { location: 'USA' }));
assert.ok(matchesResearch({ ...fixture, location: 'Worldwide' }, { location: 'Cyprus' }));
assert.equal(searchQuery({ role: 'BI specialist' }), 'data');
assert.equal(searchQuery({ industry: 'Financial services' }), 'finance');
assert.equal(searchQuery({ industry: 'Banking' }), 'finance');

const structured = `<html><script type="application/ld+json">{"@graph":[{"@type":"JobPosting","title":"BI Engineer","hiringOrganization":{"name":"Acme"},"description":"<p>Required: SQL and Tableau. Build dashboards and use data visualization to share insights with stakeholders. At least two years of relevant experience.</p>","jobLocation":{"address":{"addressCountry":"Portugal"}},"jobLocationType":"TELECOMMUTE","datePosted":"2026-11-10"}]}</script><main>Related jobs mention C++</main></html>`;
let job = parseJobHTML(structured, 'https://remotive.com/job');
assert.equal(job.title, 'BI Engineer');
assert.equal(job.company, 'Acme');
assert.ok(job.description.includes('SQL'));
assert.ok(!job.description.includes('C++'), 'Related-page content excluded when structured description exists.');
assert.throws(() => parseJobHTML('<title>Remote jobs</title><main>Browse all of our featured roles and related jobs. Sign up for job alerts. Data analysts, SQL engineers and finance managers wanted across many different companies.</main>', 'https://remotive.com/'), /individual job posting/);
assert.throws(() => parseJobHTML('<title>Careers</title><div class="job-description">Browse our current vacancies for software developers, financial analysts and healthcare staff. Search your location to discover all available opportunities.</div>', 'https://remotive.com/'), /specific readable job description/);
job = parseJobHTML('<h1>BI Engineer</h1><main>Other jobs mention Java.</main><section id="job-description"><div>Responsibilities</div><div>Build SQL reports and dashboards for finance teams.</div><h2>Requirements</h2><p>Experience using Tableau and interpreting business intelligence metrics is required.</p></section>', 'https://remotive.com/job');
assert.equal(job.title, 'BI Engineer');
assert.ok(job.description.includes('Tableau'));
assert.ok(!job.description.includes('Java'));

const opening = { id: 123, roleTitle: 'BI Specialist', roleDescription: 'Build reliable business intelligence dashboards. Work with product teams to define KPIs and develop actionable reports.', roleRequirements: 'SQL and Tableau preferred. Data analysis experience.', company: { name: 'Jobbex' }, location: 'Portugal', locationType: 'remote' };
const rocketship = `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { jobOpening: opening, relatedJobs: [{ roleDescription: 'Unrelated Java requirements' }] } } })}</script>`;
job = parseJobHTML(rocketship, 'https://www.remoterocketship.com/publicjobs/test/');
assert.equal(job.title, 'BI Specialist');
assert.equal(job.company, 'Jobbex');
assert.equal(job.source, 'Remote Rocketship');
assert.ok(job.description.includes('Tableau'));
assert.ok(!job.description.includes('Java'));

const originalFetch = globalThis.fetch;
let calls = [];
globalThis.fetch = async (url) => { calls.push(String(url)); return new Response('', { status: 302, headers: { location: 'http://169.254.169.254/secret' } }); };
await assert.rejects(() => importJob('https://remotive.com/job'));
assert.equal(calls.length, 1, 'Unsafe redirect is never fetched.');
globalThis.fetch = async () => new Response('<main>x</main>', { headers: { 'content-type': 'text/html', 'content-length': '2000000' } });
await assert.rejects(() => importJob('https://remotive.com/job'), /too large/);

calls = [];
globalThis.fetch = async (url) => {
  calls.push(String(url));
  if (String(url).includes('remotive')) return Response.json({ jobs: [{ id: 123, title: 'BI Specialist', company_name: 'Acme', description: '<p>Required SQL and Tableau.</p>', url: 'https://remotive.com/job', candidate_required_location: 'Worldwide' }] });
  if (String(url).includes('jobicy')) return Response.json({ jobs: [{ id: 456, jobTitle: 'BI Specialist', companyName: 'Acme', jobDescription: '<p>Required SQL and Tableau.</p>', url: 'https://jobicy.com/jobs/123', jobGeo: 'Worldwide' }] });
  return new Response('<html>Provider blocked</html>', { headers: { 'content-type': 'text/html' } });
};
let research = await researchJobs({ role: 'BI Specialist' });
assert.equal(research.jobs.length, 1, 'Cross-board duplicate title/company removed.');
assert.equal(research.sources.find(s => s.name === 'Arbeitnow').status, 'error');
assert.equal(research.sources.filter(s => s.status === 'ok').length, 2);
const previousCalls = calls.length;
research = await researchJobs({ role: 'BI Specialist' });
assert.equal(calls.filter(url => url.includes('remotive')).length, 1, 'Remotive feed cached.');
assert.equal(calls.filter(url => url.includes('jobicy')).length, 1, 'Jobicy query cached.');
assert.equal(calls.length, previousCalls + 1, 'Only failed provider retried.');
await assert.rejects(() => researchJobs({}), /job role or an industry/);
globalThis.fetch = originalFetch;
console.log('Job search tests passed: safe imports, precise parsing, filtering, deduplication, failure isolation and feed cache.');
