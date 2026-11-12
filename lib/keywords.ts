/** Source-backed English keyword extraction. This is a transparent lexical model,
 * not an ATS simulation or a prediction of hiring decisions. */
export type Job = {
  id: string;
  title: string;
  company: string;
  url: string;
  source: string;
  description: string;
  location?: string;
  publishedAt?: string;
};

export type Keyword = {
  id: string;
  term: string;
  category: string;
  aliases: string[];
  related: string[];
  count: number;
  total: number;
  requiredCount: number;
  priority: "critical" | "important" | "supporting";
  evidence: { jobId: string; quote: string }[];
};

export type Match = Keyword & { matchedText?: string; reason: string };
export type Comparison = { score: number; strong: Match[]; partial: Match[]; missing: Match[] };
type Definition = { term: string; category: string; aliases: string[]; related: string[] };

const lexicon: Definition[] = [];
const termPatterns = new Map<string, RegExp>();
function group(category: string, rows: string[]) {
  for (const row of rows) {
    const [term, aliases = "", related = ""] = row.split("|");
    lexicon.push({ term, category, aliases: aliases.split(";").filter(Boolean), related: related.split(";").filter(Boolean) });
  }
}

group("Data & analytics", [
  "Business Intelligence|BI|reporting;business analytics",
  "SQL|Structured Query Language|database querying;relational databases",
  "Python||scripting;programming",
  "R|R programming;R language;R statistical language|statistical computing",
  "Tableau||data visualization;dashboard development;dashboards",
  "Power BI|Microsoft Power BI;PowerBI|data visualization;dashboards",
  "Excel|Microsoft Excel;MS Excel|spreadsheets",
  "Google Sheets||spreadsheets",
  "Looker||data visualization;dashboards",
  "Looker Studio|Google Data Studio|dashboards",
  "Qlik|QlikView;Qlik Sense|dashboards",
  "Snowflake||data warehouse;data warehousing",
  "Databricks||data engineering;Spark",
  "BigQuery|Google BigQuery|data warehousing",
  "Redshift|Amazon Redshift|data warehousing",
  "Data Analysis|data analyses|analytics;analyzing data;analysing data",
  "Data Visualization|data visualisation|dashboards;charting",
  "Data Modeling|data modelling|database design",
  "Data Warehousing|data warehouse;data warehouses|data architecture",
  "ETL|extract transform load;extract, transform, load|data integration;data pipelines",
  "ELT|extract load transform|data integration;data pipelines",
  "Data Pipelines|data pipeline|data integration",
  "dbt|data build tool|data transformation",
  "Apache Airflow|Airflow|workflow orchestration",
  "Apache Spark|Spark;PySpark|distributed computing",
  "Hadoop||distributed computing;big data",
  "Kafka|Apache Kafka|event streaming",
  "DAX|Data Analysis Expressions|Power BI",
  "Power Query||data transformation",
  "Star Schema|star schemas|dimensional modeling;dimensional modelling",
  "Dimensional Modeling|dimensional modelling|star schema",
  "Data Quality||data validation;quality assurance",
  "Data Governance||data management",
  "Master Data Management|MDM|data governance",
  "Statistics|statistical analysis|quantitative analysis",
  "Mathematics|mathematical methods|quantitative analysis",
  "Computer Science||software engineering",
  "Machine Learning|ML|predictive modeling;predictive modelling",
  "Deep Learning||neural networks",
  "Natural Language Processing|NLP|text analytics",
  "Artificial Intelligence|AI|machine learning",
  "Generative AI|GenAI;generative artificial intelligence|large language models",
  "Large Language Models|LLM;LLMs|generative AI",
  "Predictive Modeling|predictive modelling|forecasting",
  "Forecasting||predictive modeling;trend analysis",
  "A/B Testing|A/B tests;AB testing;split testing|experimentation",
  "Pandas||data analysis",
  "NumPy||scientific computing",
  "TensorFlow||deep learning",
  "PyTorch||deep learning",
  "scikit-learn|sklearn|machine learning",
  "Jupyter|Jupyter Notebook;JupyterLab|data analysis",
  "SAS||statistical analysis",
  "SPSS||statistical analysis",
  "MATLAB||numerical computing",
  "Dashboard Development|building dashboards;developing dashboards|reporting",
  "Reporting||business intelligence",
  "KPI|KPIs;key performance indicators|performance metrics",
  "Big Data||large datasets;distributed computing",
]);

group("Software & cloud", [
  "JavaScript|JS|web development",
  "TypeScript||JavaScript",
  "Java||object oriented programming",
  "C++||systems programming",
  "C#|C Sharp|.NET",
  ".NET|dotnet;ASP.NET;ASP.NET Core|C#",
  "Go|Golang;Go programming|backend development",
  "Rust||systems programming",
  "PHP||backend development",
  "Ruby||backend development",
  "Ruby on Rails|Rails|Ruby",
  "Swift||iOS development",
  "Kotlin||Android development",
  "React|React.js;ReactJS|frontend development",
  "Next.js|NextJS;Next JS|React",
  "Vue|Vue.js;VueJS|frontend development",
  "Angular|AngularJS|frontend development",
  "Svelte|SvelteKit|frontend development",
  "Node.js|NodeJS;Node JS|backend development",
  "Django||Python",
  "Flask||Python",
  "FastAPI||Python",
  "Spring Boot||Java",
  "HTML|HTML5|web development",
  "CSS|CSS3|web design",
  "Tailwind CSS|Tailwind|CSS",
  "REST API|REST APIs;RESTful API;RESTful APIs|API development",
  "GraphQL||API development",
  "API Development|API design|software integration",
  "Microservices|microservice architecture|distributed systems",
  "PostgreSQL|Postgres|SQL;relational databases",
  "MySQL||SQL;relational databases",
  "SQL Server|Microsoft SQL Server;MSSQL|SQL",
  "Oracle Database|Oracle SQL|SQL",
  "MongoDB||NoSQL",
  "Redis||caching",
  "NoSQL||nonrelational databases",
  "Git|version control with Git|version control",
  "GitHub||Git",
  "GitLab||Git",
  "Docker||containerization;containerisation",
  "Kubernetes|K8s|container orchestration",
  "Terraform||infrastructure as code",
  "Infrastructure as Code|IaC|infrastructure automation",
  "AWS|Amazon Web Services|cloud computing",
  "Azure|Microsoft Azure|cloud computing",
  "Google Cloud|Google Cloud Platform;GCP|cloud computing",
  "Cloud Computing|cloud infrastructure|distributed systems",
  "CI/CD|continuous integration;continuous delivery;continuous deployment|DevOps",
  "DevOps||infrastructure automation",
  "Linux||Unix",
  "Bash|shell scripting|scripting",
  "PowerShell||scripting",
  "Unit Testing|unit tests|automated testing",
  "Test Automation|automated testing|quality assurance",
  "Playwright||test automation",
  "Cypress||test automation",
  "Selenium||test automation",
  "Jest||unit testing",
  "Cybersecurity|cyber security;information security|security engineering",
  "Penetration Testing|pentesting;pen testing|security testing",
  "Network Security||cybersecurity",
  "SIEM|security information and event management|security monitoring",
  "SOC 2|SOC2|security compliance",
  "ISO 27001|ISO27001|information security",
  "OAuth|OAuth2;OAuth 2.0|authentication",
  "Accessibility|WCAG;web accessibility|inclusive design",
  "System Design|systems design|software architecture",
  "Distributed Systems||microservices",
]);

group("Business & delivery", [
  "Stakeholder Management|managing stakeholders|stakeholder engagement;cross-functional collaboration",
  "Requirements Gathering|requirements elicitation;gathering requirements|business requirements",
  "Business Analysis||requirements gathering",
  "Project Management|managing projects|project coordination",
  "Program Management|programme management|project management",
  "Product Management||product strategy",
  "Product Roadmap|product roadmaps;roadmapping|product strategy",
  "Agile||iterative delivery",
  "Scrum||Agile",
  "Kanban||Agile",
  "Jira||issue tracking;project management",
  "Confluence||documentation",
  "Quality Assurance|QA|quality control;testing",
  "Quality Control|QC|quality assurance",
  "Continuous Improvement||process optimization;process optimisation;process improvement",
  "Process Improvement||continuous improvement;process optimization",
  "Six Sigma|Lean Six Sigma|process improvement",
  "Lean Manufacturing|lean production|continuous improvement",
  "Change Management||organizational change;organisational change",
  "Risk Management||risk assessment",
  "Strategic Planning||business strategy",
  "Cross-functional Collaboration|cross functional collaboration|teamwork;stakeholder engagement",
  "Communication|communication skills|presentations;report writing",
  "Leadership|team leadership|people management",
  "People Management|managing people|leadership",
  "Problem Solving|problem-solving|analytical thinking",
  "Critical Thinking||analytical thinking",
  "Documentation|technical documentation|report writing",
  "Budget Management|budgeting|financial planning",
  "Vendor Management|supplier management|procurement",
  "Customer Service|customer support|customer experience",
  "Customer Success||account management",
]);

group("Sales & marketing", [
  "B2B Sales|business-to-business sales;business to business sales|enterprise sales;account management",
  "B2C Sales|business-to-consumer sales|consumer sales",
  "Salesforce||CRM;customer relationship management",
  "HubSpot||CRM;marketing automation",
  "CRM|customer relationship management|customer data management",
  "Account Management|managing accounts|client relationships",
  "Business Development||sales strategy",
  "Lead Generation||prospecting",
  "Sales Pipeline|sales pipelines;pipeline management|sales forecasting",
  "Negotiation|negotiating|commercial agreements",
  "Digital Marketing||online marketing",
  "SEO|search engine optimization;search engine optimisation|organic search",
  "SEM|search engine marketing|paid search",
  "PPC|pay per click;pay-per-click|paid advertising",
  "Google Ads|Google AdWords|paid search",
  "Google Analytics|GA4;Google Analytics 4|web analytics",
  "Content Marketing||content strategy",
  "Email Marketing||lifecycle marketing",
  "Social Media Marketing||social media management",
  "Marketing Automation||email marketing",
  "Conversion Rate Optimization|conversion rate optimisation;CRO|experimentation",
  "Market Research||customer research",
  "Copywriting||content writing",
  "Brand Strategy|brand management|marketing strategy",
  "E-commerce|ecommerce;electronic commerce|online retail",
  "Shopify||e-commerce",
  "Figma||UI design;UX design",
  "User Research|UX research|customer research",
  "UX Design|user experience design|interaction design",
  "UI Design|user interface design|visual design",
  "Prototyping||wireframing",
  "Adobe Photoshop|Photoshop|graphic design",
  "Adobe Illustrator|Illustrator|graphic design",
]);

group("Finance & compliance", [
  "Financial Analysis||financial modeling;financial modelling",
  "Financial Modeling|financial modelling|forecasting",
  "FP&A|financial planning and analysis|budgeting;financial analysis",
  "Accounting||bookkeeping",
  "IFRS|International Financial Reporting Standards|financial reporting",
  "GAAP|Generally Accepted Accounting Principles|financial reporting",
  "Financial Reporting||accounting",
  "Accounts Payable|AP accounting|invoice processing",
  "Accounts Receivable|AR accounting|credit control",
  "Reconciliation|reconciliations|accounting",
  "Auditing|internal audit;external audit|compliance",
  "Tax Compliance|taxation|tax reporting",
  "Treasury||cash management",
  "AML|anti-money laundering;anti money laundering|financial crime",
  "KYC|know your customer|customer due diligence",
  "GDPR|General Data Protection Regulation|data privacy",
  "Regulatory Compliance||compliance management",
  "SOX|Sarbanes-Oxley|internal controls",
  "SAP|SAP ERP;SAP S/4HANA|ERP",
  "ABAP|SAP ABAP|SAP",
  "ERP|enterprise resource planning|business systems",
  "QuickBooks||accounting software",
  "Xero||accounting software",
  "NetSuite|Oracle NetSuite|ERP",
]);

group("Operations & engineering", [
  "Supply Chain|supply chain management|logistics",
  "Logistics||supply chain",
  "Procurement|purchasing|sourcing",
  "Inventory Management|stock management|warehouse operations",
  "Demand Planning||forecasting",
  "Operations Management||operational efficiency",
  "Manufacturing||production operations",
  "ISO 9001|ISO9001|quality management",
  "Health and Safety|occupational health and safety;HSE;EHS|workplace safety",
  "AutoCAD||CAD;computer aided design",
  "SolidWorks||CAD;computer aided design",
  "Revit||BIM;building information modeling",
  "BIM|building information modeling;building information modelling|construction design",
  "PLC|programmable logic controller|industrial automation",
  "SCADA|supervisory control and data acquisition|industrial automation",
  "Mechanical Engineering||engineering design",
  "Electrical Engineering||electrical design",
  "Civil Engineering||construction engineering",
  "Preventive Maintenance|preventative maintenance|asset maintenance",
  "Root Cause Analysis|RCA|problem solving",
]);

group("Healthcare & life sciences", [
  "Patient Care||clinical care",
  "Clinical Research||clinical trials",
  "Clinical Trials||clinical research",
  "GCP Compliance|Good Clinical Practice|clinical research",
  "GMP|Good Manufacturing Practice;Good Manufacturing Practices|quality systems",
  "HIPAA||healthcare privacy",
  "Electronic Health Records|EHR;EMR;electronic medical records|health informatics",
  "Epic||electronic health records",
  "Pharmacovigilance||drug safety",
  "Medical Coding||clinical coding",
  "ICD-10|ICD10|medical coding",
  "Nursing||patient care",
  "BLS|Basic Life Support|emergency care",
  "ACLS|Advanced Cardiovascular Life Support|emergency care",
  "Biostatistics||statistics",
]);

function plainText(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(?:p|li|h[1-6]|div|section)>|<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);|&#(?:39|34|160);/gi, (entity) => ({ "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&#39;": "'", "&#34;": '"', "&#160;": " " }[entity.toLowerCase()] || " "))
    .replace(/[\u2010-\u2015]/g, "-").replace(/[^\S\n]+/g, " ").trim();
}

function escaped(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "[\\s-]+");
}

/** Boundary matching protects SQL/MySQL, Java/JavaScript, R/R&D and .NET/internet. */
function findTerm(text: string, term: string): string | undefined {
  if (term === "R") {
    return text.match(/\bR\s+(?:programming|language|statistical\s+(?:language|computing))\b|\b(?:programming\s+(?:in|with)|proficien(?:t|cy)\s+(?:in|with)|skills?\s*:)\s+R\b|\b(?:Python|SQL|SAS|MATLAB)\s*(?:[,/&]|and|or)\s*R\b(?!\s*&)|\bR\s*(?:[,/]|and|or)\s*(?:Python|SQL|SAS|MATLAB)\b/gi)?.[0];
  }
  if (term === "Go") {
    return text.match(/\bGo\s+(?:programming|language|developer|development)\b|\b(?:programming\s+(?:in|with)|proficien(?:t|cy)\s+(?:in|with))\s+Go\b|\b(?:Java|Python|Rust)\s*[,/&]\s*Go\b/gi)?.[0];
  }
  let pattern = termPatterns.get(term);
  if (!pattern) {
    pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escaped(term)}(?![\\p{L}\\p{N}_+#])`, "giu");
    if (termPatterns.size < 4000) termPatterns.set(term, pattern);
  }
  for (const match of text.matchAll(pattern)) {
    const after = text.slice((match.index ?? 0) + match[0].length, (match.index ?? 0) + match[0].length + 65);
    // These product names are also ordinary English words. Exclude common prose uses.
    if (term === "React" && /^\s+(?:quickly|appropriately|to|well|when|fast|calmly|positively)\b/i.test(after)) continue;
    if (term === "Spark" && /^\s+(?:interest|curiosity|ideas|innovation|joy|enthusiasm|conversation|change|creativity)\b/i.test(after)) continue;
    if (term === "Epic" && /^\s+(?:team|journey|adventure|opportunity|challenge|story|stories|experience|projects?)\b/i.test(after)) continue;
    if (term === "Swift" && /^\s+(?:action|response|responses|resolution|resolutions|decisions?|progress)\b/i.test(after)) continue;
    if (term === "Rust" && /^\s+(?:removal|prevention|treatment|protection|corrosion)\b/i.test(after)) continue;
    return match[0];
  }
  return undefined;
}

function findDefinition(text: string, definition: Definition): string | undefined {
  for (const term of [definition.term, ...definition.aliases].sort((a, b) => b.length - a.length)) {
    const match = findTerm(text, term);
    if (match) return match;
  }
  return undefined;
}

type Segment = { text: string; required: boolean };
function segments(description: string): Segment[] {
  const result: Segment[] = [];
  let requiredSection = false;
  for (const line of plainText(description).split(/\n+/)) {
    const heading = line.trim().replace(/^[-*•\d.)\s]+/, "");
    if (/^(?:requirements|qualifications|what you (?:need|bring)|must[- ]haves?|essential skills|required skills)(?:\s*[:：])?$/i.test(heading)) requiredSection = true;
    else if (/^(?:benefits|perks|about (?:us|the (?:company|role))|responsibilities|what (?:we offer|you(?:'ll| will) do)|nice[- ]to[- ]haves?|preferred (?:skills|qualifications))(?:\s*[:：])?$/i.test(heading)) requiredSection = false;
    for (const text of line.split(/(?<=[.!?;])\s+(?=[A-Z•*-])/).map((piece) => piece.trim()).filter(Boolean)) {
      const preferred = /\b(?:nice[- ]to[- ]have|preferred|desirable|a plus|optional|bonus|not required|no (?:prior )?(?:experience|knowledge).{0,45}required|no [^.!?;\n]{1,45}required)\b/i.test(text);
      const explicit = /\b(?:must|mandatory|essential|required|requirement|minimum qualifications|need to have)\b|\b(?:proficien(?:t|cy)|expertise|strong (?:knowledge|experience))\s+(?:in|with|of)\b/i.test(text);
      result.push({ text, required: !preferred && (requiredSection || explicit) });
    }
  }
  return result;
}

function discoveredDefinitions(jobs: Job[]): Definition[] {
  const found = new Map<string, Definition>();
  for (const job of jobs) {
    for (const segment of segments(job.description)) {
      if (!segment.required) continue;
      const matches = segment.text.matchAll(/\b(?:experience (?:with|in)|knowledge of|proficien(?:t|cy) (?:in|with)|expertise in|must (?:know|use)|tools?\s*:)\s+([^.!?;\n]+)/gi);
      for (const match of matches) {
        for (const fragment of match[1].split(/\s*(?:,|\band\b|\bor\b)\s*/)) {
          const candidate = fragment.trim().replace(/^["'“”]+|["'“”.:]+$/g, "");
          if (!candidate || candidate.length > 45 || candidate.split(/\s+/).length > 4) continue;
          // Only explicit, named tools/phrases. Ordinary requirement prose is not a skill.
          if (!/^(?:[A-Z][\w+#.-]*)(?:\s+(?:[A-Z][\w+#.-]*|of|for|and)){0,3}$/.test(candidate)) continue;
          if (/^(?:Experience|Knowledge|Proficiency|Strong|Excellent|Good|Ability|English|French|German|Spanish|Portuguese|Bachelor|Master|You|We|The|Our|This)\b/.test(candidate)) continue;
          if (lexicon.some((entry) => findDefinition(candidate, entry))) continue;
          const key = candidate.toLocaleLowerCase("en");
          found.set(key, { term: candidate, aliases: [], related: [], category: "Other named skills" });
        }
      }
    }
  }
  return [...found.values()];
}

function keywordId(term: string): string {
  return term.toLowerCase().replace(/\+/g, "plus").replace(/#/g, "sharp").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Each keyword is counted at most once per posting. Empty/duplicate postings do not inflate counts. */
export function extractKeywords(inputJobs: Job[]): Keyword[] {
  const seen = new Set<string>();
  const jobs = inputJobs.filter((job) => {
    const fingerprint = job.url || `${job.title.toLowerCase()}|${job.company.toLowerCase()}|${plainText(job.description).toLowerCase()}`;
    if (!job.description.trim() || seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
  if (!jobs.length) return [];
  const prepared = jobs.map((job) => ({ job, text: plainText(job.description), parts: segments(job.description) }));
  const definitions = [...lexicon, ...discoveredDefinitions(jobs)];
  const keywords: Keyword[] = [];
  for (const definition of definitions) {
    let count = 0;
    let requiredCount = 0;
    const evidence: Keyword["evidence"] = [];
    for (const { job, text, parts } of prepared) {
      if (!findDefinition(text, definition)) continue;
      count++;
      const matches = parts.filter((part) => findDefinition(part.text, definition));
      const requiredMatch = matches.find((part) => part.required);
      if (requiredMatch) requiredCount++;
      const quote = (requiredMatch || matches[0])?.text || text;
      evidence.push({ jobId: job.id, quote: quote.length > 420 ? excerpt(quote, findDefinition(quote, definition) || definition.term) : quote });
    }
    if (!count) continue;
    const frequency = count / jobs.length;
    const priority: Keyword["priority"] = requiredCount >= Math.ceil(jobs.length * 0.5) || (count >= 3 && frequency >= 0.7)
      ? "critical" : requiredCount > 0 || frequency >= 0.4 ? "important" : "supporting";
    keywords.push({ ...definition, id: keywordId(definition.term), count, total: jobs.length, requiredCount, priority, evidence });
  }
  const rank = { critical: 0, important: 1, supporting: 2 };
  return keywords.sort((a, b) => rank[a.priority] - rank[b.priority] || b.count - a.count || b.requiredCount - a.requiredCount || a.term.localeCompare(b.term));
}

function excerpt(text: string, term: string): string {
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  const start = Math.max(0, at - 120);
  return `${start ? "…" : ""}${text.slice(start, start + 400)}${start + 400 < text.length ? "…" : ""}`;
}

/** Remove explicit denials before matching. Keep contrasting clauses and later
 * positive statements so a negated mention does not hide genuine evidence. This
 * deliberately handles direct English wording, not inferred proficiency. */
function positiveCVText(cv: string): string {
  return plainText(cv)
    .split(/(?<=[.!?;])\s+|\n+|\b(?:but|however|yet|instead)\b|,(?=\s*(?:[A-Za-z][^,:;\n]{0,35}:|(?:I\b|we\b|proficient\b|experienced\b|skilled\b|expert\b|advanced\b|familiar\b)))/i)
    .map((clause) => {
      // Skill-list labels such as “Tableau: none” and “SQL experience: none”.
      if (/^\s*[^.!?;\n]{1,100}?(?:\s*[:=-]\s*|\s+(?:is|are|was|were)\s+)(?:none\b|no (?:experience|knowledge|proficiency)\b|not (?:used|known|applicable|a skill)\b)/i.test(clause)) return "";
      // A trailing denial applies to its preceding skill: “SQL experience is
      // absent”, “Tableau is not something I know”, “SQL (no experience)”.
      if (/\b(?:is|are|was|were)\s+not\s+(?:something|a skill|known|used|familiar)\b|\((?:no (?:experience|knowledge)|never used|not used)\)/i.test(clause)) return "";
      return clause.replace(/\b(?:no(?!\s+(?:longer|only)\b)|without|lack(?:ing|s)?|unfamiliar|never|not(?!\s+(?:only|just)\b)|don['’]t|doesn['’]t|didn['’]t|haven['’]t|hasn['’]t|hadn['’]t|can['’]t|cannot)\b[\s\S]*$/i, "");
    }).join("\n");
}

/** A related concept earns half credit but is always shown as partial, never equivalent expertise. */
export function compareCV(keywords: Keyword[], cv: string): Comparison {
  const text = positiveCVText(cv);
  const result: Comparison = { score: 0, strong: [], partial: [], missing: [] };
  let earned = 0;
  let possible = 0;
  const weights = { critical: 3, important: 2, supporting: 1 };
  for (const keyword of keywords) {
    const weight = weights[keyword.priority];
    possible += weight;
    const matchedText = findDefinition(text, keyword);
    if (matchedText) {
      const exact = findTerm(text, keyword.term);
      result.strong.push({ ...keyword, matchedText, reason: exact ? `Found “${matchedText}” in your CV.` : `Found the accepted equivalent “${matchedText}”.` });
      earned += weight;
      continue;
    }
    const related = keyword.related.map((term) => findTerm(text, term)).find(Boolean);
    if (related) {
      result.partial.push({ ...keyword, matchedText: related, reason: `“${related}” is related, but does not establish ${keyword.term} experience. Use the exact skill only if accurate.` });
      earned += weight * 0.5;
    } else {
      result.missing.push({ ...keyword, reason: `No positive wording for ${keyword.term} or its accepted equivalents was found.` });
    }
  }
  result.score = possible ? Math.round(100 * earned / possible) : 0;
  return result;
}

export const SCORE_EXPLANATION = "Weighted keyword coverage: critical = 3, important = 2, supporting = 1. Strong matches earn full weight; related wording earns half; missing wording earns zero. This measures wording coverage, not qualifications or interview probability.";

/** Synthetic examples, deliberately not attributed to real employers or current vacancies. */
export const DEMO_JOBS: Job[] = [
  {
    id: "sample-bi-1", title: "BI Specialist", company: "Example analytics team", url: "", source: "Illustrative sample", location: "Remote · Europe",
    description: "Business Intelligence specialist\nRequirements\nSQL, Business Intelligence and Tableau experience are required.\nMust have experience with Data Analysis, Data Modeling and Stakeholder Management.\nStrong knowledge of Python and Data Warehousing.\nResponsibilities\nBuild dashboards and maintain data quality. Apply Continuous Improvement to reporting workflows.\nPreferred skills\nSnowflake and Statistics are nice to have.",
  },
  {
    id: "sample-bi-2", title: "Business Intelligence Analyst", company: "Example finance team", url: "", source: "Illustrative sample", location: "Remote",
    description: "Requirements\nMust have SQL and Business Intelligence experience.\nProficiency in Tableau, Data Analysis and Stakeholder Management.\nKnowledge of Data Modeling and Star Schema is required.\nResponsibilities\nUse Python to automate reporting. Collaborate on Quality Assurance and Continuous Improvement.\nPreferred skills\nPower BI, Snowflake and Statistics are preferred.",
  },
  {
    id: "sample-bi-3", title: "Senior BI Analyst", company: "Example operations team", url: "", source: "Illustrative sample", location: "Hybrid · Europe",
    description: "Requirements\nSQL and Business Intelligence are essential.\nMust have experience with Data Analysis and Data Visualization.\nTableau and Data Warehousing experience are required.\nResponsibilities\nImprove Data Quality and develop dashboards. Work with business stakeholders on KPI reporting and Continuous Improvement.\nPreferred skills\nPython, Star Schema and Snowflake are a plus.",
  },
];

export const DEMO_CV = "Business Intelligence analyst with five years of SQL and Python experience. Developed reporting solutions and dashboards for finance and operations. Experienced in Stakeholder Management, Quality Assurance, Star Schema design and Data Warehousing. Worked with cross-functional teams on analytics and process optimization. Delivered reliable KPI reporting and presented findings to business leaders.";
