// Stagehand + Browserbase + Exa: review a job application without submitting it

import "dotenv/config";
import { browserbase, Stagehand } from "@browserbasehq/stagehand";
import { Exa } from "exa-js";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { z } from "zod/v4";

const applicant = {
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "+1-555-123-4567",
  linkedInUrl: "https://linkedin.com/in/johndoe",
  githubUrl: null,
  resumePath: resolve("Dummy_CV.pdf"),
  currentLocation: "San Francisco, CA",
  willingToRelocate: true,
  requiresSponsorship: false,
  visaStatus: "",
  portfolioUrl: "https://johndoe.dev",
  coverLetter: "I am excited to apply for this position.",
};

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

const config = {
  companyQuery: process.env.COMPANY_QUERY ?? "AI startups in SF currently hiring",
  numCompanies: positiveInteger("NUM_COMPANIES", 1),
  concurrent: process.env.CONCURRENT === "true",
  maxConcurrentBrowsers: positiveInteger("MAX_CONCURRENT_BROWSERS", 2),
};

interface CareersPage {
  company: string;
  careersUrl: string;
}

interface ApplicationResult {
  company: string;
  careersUrl: string;
  success: boolean;
  review?: {
    jobTitle: string;
    jobUrl: string;
    applicationUrl: string;
    requirements: string[];
    responsibilities: string[];
    observedFields: string[];
    fieldsAttempted: string[];
    resumeUploaded: boolean;
    outstandingFields: string[];
    summary: string;
  };
  error?: string;
}

const JobHeadlineSchema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
});

const JobDescriptionSchema = z.object({
  requirementsSummary: z.string(),
  responsibilitiesSummary: z.string(),
});

const RoleSummarySchema = z.object({
  roleSummary: z.string().min(1),
});

const FormReviewSchema = z.object({
  summary: z.string().min(1),
  visibleRequiredFields: z.array(z.string()),
});

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

function candidateScore(url: URL, title: string): number {
  const searchable = `${title} ${url.pathname} ${url.search}`;
  const ats = ["ashbyhq.com", "greenhouse.io", "lever.co", "smartrecruiters.com"].some((provider) =>
    url.hostname.includes(provider),
  );
  const directRole = isDirectRoleUrl(url.href);
  const careers = /\b(careers?|jobs?|open[- ]?roles?|positions?|join[- ]?us)\b/i.test(searchable);
  return Number(ats) * 4 + Number(directRole) * 3 + Number(careers) * 2;
}

function isDirectRoleUrl(value: string): boolean {
  const url = parseHttpUrl(value);
  if (!url) return false;
  if (
    /\/(jobs?|positions?)\/[^/]+|ashby_jid=|gh_jid=|lever-origin=/i.test(
      `${url.pathname}${url.search}`,
    )
  ) {
    return true;
  }
  const pathSegments = url.pathname.split("/").filter(Boolean);
  return (
    (url.hostname === "jobs.ashbyhq.com" || url.hostname === "jobs.lever.co") &&
    pathSegments.length >= 2
  );
}

async function discoverCareersPages(exa: Exa): Promise<CareersPage[]> {
  const search = await exa.searchAndContents(
    `${config.companyQuery} official careers jobs open roles`,
    {
      context: true,
      excludeDomains: ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"],
      livecrawl: "fallback",
      numResults: Math.max(config.numCompanies * 6, 10),
      text: true,
      type: "deep",
    },
  );

  const seen = new Set<string>();
  const candidateLimit = Math.max(config.numCompanies * 3, config.numCompanies);
  const pages = search.results
    .flatMap((result) => {
      const url = parseHttpUrl(result.url);
      if (!url) return [];
      const score = candidateScore(url, result.title ?? "");
      const identity = `${url.hostname.replace(/^www\./, "")}${url.pathname}`;
      if (score < 2 || seen.has(identity)) return [];
      seen.add(identity);
      return [
        {
          score,
          company: (result.title || url.hostname).split(/\s+[|–—]\s+/)[0],
          careersUrl: url.href,
        },
      ];
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, candidateLimit)
    .map(({ company, careersUrl }) => ({ company, careersUrl }));

  if (pages.length === 0) throw new Error("Exa returned no direct careers or ATS pages");
  return pages;
}

function includes(description: string, pattern: RegExp): boolean {
  return pattern.test(description.toLowerCase());
}

async function reviewApplication(
  careersPage: CareersPage,
  _index: number,
): Promise<ApplicationResult> {
  const browser = await browserbase.launch({ apiKey: process.env.BROWSERBASE_API_KEY! });
  const stagehand = await Stagehand.create({
    browser,
    model: { modelName: "google/gemini-2.5-flash" },
    logging: { level: "info" },
  });

  try {
    let page = (await browser.context.pages())[0] ?? (await browser.context.newPage());
    await page.goto(careersPage.careersUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    // The Exa result is often already a role page. A failed action is therefore non-fatal.
    if (!isDirectRoleUrl(careersPage.careersUrl)) {
      await stagehand
        .act("Open the first currently open software, engineering, design, or product role.")
        .catch(() => undefined);
    }
    page = (await browser.context.activePage()) ?? page;
    const jobUrl = await page.url();

    const description = await stagehand
      .extract(
        "Summarize the visible requirements and responsibilities for this role as two plain-text strings. Use an empty string for a section that is not shown.",
        JobDescriptionSchema,
      )
      .then((result) => result.data)
      .catch(() => null);
    const hasDescription = Boolean(
      description &&
      [description.requirementsSummary, description.responsibilitiesSummary].some(
        (value) => value.trim() && value.trim().toLowerCase() !== "null",
      ),
    );
    const fallbackSummary = hasDescription
      ? null
      : await stagehand
          .extract(
            "Return one concise plain-text summary of the visible requirements and responsibilities for this role.",
            RoleSummarySchema,
          )
          .then((result) => result.data.roleSummary)
          .catch(() => null);

    await stagehand
      .act(
        "Open the application form for this job. Click Apply or Apply for this job, but never submit an application.",
      )
      .catch(() => undefined);
    page = (await browser.context.activePage()) ?? page;
    await page.waitForTimeout(1_500);

    const headline = (
      await stagehand.extract(
        "Extract the exact role title and company shown above this application form.",
        JobHeadlineSchema,
      )
    ).data;

    const observed = await stagehand.observe(
      "Find every visible application input, textarea, select, radio option, checkbox, and resume or CV file upload. Exclude the final submit button.",
    );
    if (observed.data.length === 0) throw new Error("No usable application form was observed");

    const fieldsAttempted: string[] = [];
    const descriptions = observed.data.map((action) => action.description);

    const run = async (label: string, pattern: RegExp, value: string | boolean | null) => {
      if (value === null || value === "") return;
      let candidates = observed.data.filter((action) => includes(action.description, pattern));
      if (label === "phone") {
        candidates = candidates.filter((action) => !includes(action.description, /country/));
      }
      if (label === "cover letter") {
        candidates = candidates.filter(
          (action) => !includes(action.description, /file (upload|input)|attach.*cover/),
        );
      }
      const rendered = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
      const action =
        typeof value === "boolean"
          ? candidates.find((candidate) =>
              candidate.description.toLowerCase().includes(rendered.toLowerCase()),
            )
          : candidates[0];
      if (!action) return;
      try {
        const result = await stagehand.act({
          ...action,
          arguments: action.method === "click" ? [] : [rendered],
        });
        if (result.data.success) fieldsAttempted.push(label);
      } catch {
        // Optional or custom controls remain for the human reviewer.
      }
    };

    const firstName = observed.data.find((action) => includes(action.description, /first name/));
    const lastName = observed.data.find((action) => includes(action.description, /last name/));
    if (firstName && lastName) {
      const [first, ...rest] = applicant.name.split(/\s+/);
      const firstResult = await stagehand
        .act({ ...firstName, arguments: [first] })
        .catch(() => undefined);
      const lastResult = await stagehand
        .act({ ...lastName, arguments: [rest.join(" ")] })
        .catch(() => undefined);
      if (firstResult?.data.success && lastResult?.data.success) fieldsAttempted.push("name");
    } else {
      await run("name", /\b(full )?name\b/, applicant.name);
    }

    await run("email", /email/, applicant.email);
    await run("phone", /phone|telephone/, applicant.phone);
    await run("LinkedIn", /linkedin/, applicant.linkedInUrl);
    await run("GitHub", /github/, applicant.githubUrl);
    await run("portfolio", /portfolio|personal website|\bwebsite\b/, applicant.portfolioUrl);
    await run(
      "current location",
      /current.*location|currently based|where.*based/,
      applicant.currentLocation,
    );
    await run("relocation", /relocat/, applicant.willingToRelocate);
    await run("sponsorship", /sponsor|work authorization/, applicant.requiresSponsorship);
    await run("visa status", /visa.*status|status.*visa/, applicant.visaStatus);
    await run(
      "cover letter",
      /cover letter|why.*apply|why.*interested|why.*want.*work|additional information/,
      `${applicant.coverLetter} I am especially interested in the ${headline.jobTitle} role at ${headline.company}.`,
    );

    let resumeUploaded = false;
    const resumeAction = observed.data.find(
      (action) =>
        action.selector &&
        includes(action.description, /resume|curriculum|\bcv\b|upload.*file/) &&
        !includes(action.description, /autofill/),
    );
    if (resumeAction) {
      try {
        const resume = await readFile(applicant.resumePath);
        const input = page.locator(resumeAction.selector);
        await input.setInputFiles({
          name: basename(applicant.resumePath),
          mimeType: "application/pdf",
          buffer: resume,
        });
        resumeUploaded = true;
      } catch {
        // File upload is exact browser mechanics; a failed upload is reported, not hidden.
      }
    }

    const formReview = (
      await stagehand.extract(
        "Summarize this application for human review and list visible required fields that still need attention.",
        FormReviewSchema,
      )
    ).data;
    const applicationUrl = await page.url();
    const resolvedJobUrl = isDirectRoleUrl(jobUrl)
      ? jobUrl
      : applicationUrl.replace(/\/application\/?$/, "");

    return {
      company: headline.company,
      careersUrl: careersPage.careersUrl,
      success: true,
      review: {
        jobTitle: headline.jobTitle,
        jobUrl: resolvedJobUrl,
        applicationUrl,
        requirements:
          description?.requirementsSummary.trim() &&
          description.requirementsSummary.trim().toLowerCase() !== "null"
            ? [description.requirementsSummary.trim()]
            : fallbackSummary
              ? [fallbackSummary]
              : [],
        responsibilities:
          description?.responsibilitiesSummary.trim() &&
          description.responsibilitiesSummary.trim().toLowerCase() !== "null"
            ? [description.responsibilitiesSummary.trim()]
            : [],
        observedFields: descriptions,
        fieldsAttempted,
        resumeUploaded,
        outstandingFields: formReview.visibleRequiredFields.filter(
          (field) => !(resumeUploaded && /resume|\bcv\b/i.test(field)),
        ),
        summary: formReview.summary,
      },
    };
  } catch (error) {
    return {
      company: careersPage.company,
      careersUrl: careersPage.careersUrl,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await stagehand.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

async function main() {
  if (!process.env.BROWSERBASE_API_KEY || !process.env.EXA_API_KEY) {
    throw new Error("BROWSERBASE_API_KEY and EXA_API_KEY are required");
  }

  const pages = await discoverCareersPages(new Exa(process.env.EXA_API_KEY));
  console.log(`Found ${pages.length} direct job or careers page(s)`);

  const results: ApplicationResult[] = [];
  const batchSize = config.concurrent ? config.maxConcurrentBrowsers : 1;
  for (let index = 0; index < pages.length; index += batchSize) {
    const batch = pages.slice(index, index + batchSize);
    results.push(
      ...(await Promise.all(batch.map((page, offset) => reviewApplication(page, index + offset)))),
    );
    if (results.filter((result) => result.success).length >= config.numCompanies) break;
  }

  console.log(JSON.stringify(results, null, 2));
  if (!results.some((result) => result.success)) {
    throw new Error("No application review reached a usable form");
  }
}

main().catch((error) => {
  console.error("Exa + Browserbase workflow failed:", error);
  process.exit(1);
});
