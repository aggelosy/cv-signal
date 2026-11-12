import assert from 'node:assert/strict';
import { extractKeywords, compareCV, DEMO_JOBS, DEMO_CV } from '../lib/keywords.ts';
const job = (description, id = 'one') => ({ id, title: 'Analyst', company: 'Test', url: '', source: 'Test fixture', description });

let result = extractKeywords([job('Required: SQL and Tableau. Excel is preferred.')]);
assert.equal(result.find(k => k.term === 'SQL')?.requiredCount, 1);
assert.equal(result.find(k => k.term === 'Tableau')?.requiredCount, 1);
assert.equal(result.find(k => k.term === 'Excel')?.requiredCount, 0);
assert.ok(!result.some(k => k.term === 'Python'), 'Skills are never output merely because they exist in the lexicon.');
let compared = compareCV(result, 'Expert SQL user. I build dashboards.');
assert.ok(compared.strong.some(k => k.term === 'SQL'));
assert.ok(compared.partial.some(k => k.term === 'Tableau'));
assert.ok(!compared.strong.some(k => k.term === 'Tableau'), 'Related dashboard work is not equivalent Tableau experience.');

result = extractKeywords([job('C++, C#, .NET and Next.js are required. Familiarity with R programming and Python is preferred.')]);
for (const term of ['C++', 'C#', '.NET', 'Next.js', 'R', 'Python']) assert.ok(result.some(k => k.term === term), `Recognizes ${term}`);
compared = compareCV(result, 'C++ C# ASP.NET NextJS R programming Python');
for (const term of ['C++', 'C#', '.NET', 'Next.js', 'R', 'Python']) assert.ok(compared.strong.some(k => k.term === term), `Matches ${term}`);

result = extractKeywords([job('MySQL, JavaScript and internet tools. Our star performer will join R&D. We go further together.')]);
for (const term of ['SQL', 'Java', '.NET', 'Star Schema', 'R', 'Go']) assert.ok(!result.some(k => k.term === term), `Avoids false positive ${term}`);
assert.ok(result.some(k => k.term === 'MySQL'));

result = extractKeywords([job('Requirements\nSQL\nTableau\nBenefits\nExcel training available.')]);
assert.equal(result.find(k => k.term === 'SQL')?.requiredCount, 1);
assert.equal(result.find(k => k.term === 'Tableau')?.requiredCount, 1);
assert.equal(result.find(k => k.term === 'Excel')?.requiredCount, 0);
result = extractKeywords([job('No experience with SQL required. Tableau is not required. Python is optional.')]);
assert.ok(result.every(k => k.requiredCount === 0));
result = extractKeywords([job('Join our epic team. React quickly to requirements and spark interest. Go further, no SQL required.')]);
assert.ok(!result.some(k => ['Epic', 'React', 'Apache Spark', 'Go'].includes(k.term)), 'Product names used as ordinary English are excluded.');
assert.equal(result.find(k => k.term === 'SQL')?.requiredCount, 0);

result = extractKeywords([job('<h2>Requirements</h2><p>SQL and Tableau are required.</p><script>Python</script>')]);
assert.ok(result.some(k => k.term === 'SQL'));
assert.ok(!result.some(k => k.term === 'Python'));
assert.equal(extractKeywords([job('SQL SQL SQL'), job('SQL SQL SQL', 'duplicate')])[0].total, 1, 'Duplicate corpus documents do not inflate frequency.');
assert.equal(extractKeywords([job('')]).length, 0);
assert.equal(compareCV([], 'SQL').score, 0);

result = extractKeywords([job('Must have experience with Matillion and SQL.')]);
assert.ok(result.some(k => k.term === 'Matillion'), 'Discovers an explicitly named, unknown requirement.');
assert.ok(!result.some(k => k.term === 'Must'), 'Does not treat requirement prose as a named skill.');

const weighted = [
  { id: 'sql', term: 'SQL', category: 'Data', aliases: [], related: [], count: 1, total: 1, requiredCount: 1, priority: 'critical', evidence: [] },
  { id: 'tableau', term: 'Tableau', category: 'Data', aliases: [], related: ['dashboards'], count: 1, total: 1, requiredCount: 0, priority: 'supporting', evidence: [] },
];
assert.equal(compareCV(weighted, 'SQL and dashboards').score, 88, 'Weighted formula is reproducible (3 + .5) / 4.');
assert.equal(compareCV(weighted, 'SQL and Tableau').score, 100);
assert.equal(compareCV(weighted, '').score, 0);

const negationTerms = extractKeywords([job('Required: SQL, Tableau, Snowflake and Python.')]);
for (const cv of ['I have no SQL or Tableau experience.', 'No experience with SQL or Tableau.', 'Tableau: none', 'Have not used Snowflake.', 'I have never used SQL.', 'I do not know Python.', 'SQL experience: none', 'Tableau (no experience)', 'Tableau is not something I know.']) {
  assert.equal(compareCV(negationTerms, cv).strong.length, 0, `Explicit denial is not a strong match: ${cv}`);
}
assert.equal(compareCV(weighted, 'No SQL or dashboards experience.').score, 0, 'Negated related wording earns no partial credit.');
assert.ok(compareCV(negationTerms, 'Not only SQL but Python.').strong.some(k => k.term === 'SQL'), 'Not only is not a denial.');
assert.ok(compareCV(negationTerms, 'Not only SQL but Python.').strong.some(k => k.term === 'Python'));
assert.ok(compareCV(negationTerms, 'Not required to know SQL but used SQL to automate reporting.').strong.some(k => k.term === 'SQL'), 'A positive contrasting clause still counts.');
assert.ok(compareCV(negationTerms, 'No experience with SQL. Used SQL to automate reporting.').strong.some(k => k.term === 'SQL'), 'A later positive statement still counts.');
const mixed = compareCV(negationTerms, 'SQL: proficient, Tableau: none. No Snowflake experience but Python developer.');
assert.deepEqual(mixed.strong.map(k => k.term).sort(), ['Python', 'SQL'], 'Mixed positive and negative list entries are evaluated separately.');

const demo = extractKeywords(DEMO_JOBS);
const demoResult = compareCV(demo, DEMO_CV);
assert.ok(demoResult.strong.length && demoResult.partial.length && demoResult.missing.length);
assert.ok(DEMO_JOBS.every(j => j.source === 'Illustrative sample' && j.url === ''));
console.log(`Keyword engine checks passed. Demo: ${demo.length} terms, ${demoResult.strong.length} strong / ${demoResult.partial.length} partial / ${demoResult.missing.length} missing, ${demoResult.score}% coverage.`);
