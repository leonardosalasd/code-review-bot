import { GoogleGenAI } from '@google/genai';
import * as core from '@actions/core';
import { FileDiff, ReviewComment, ReviewResult, PullRequestContext } from './types';
import { chunkArray } from './utils';

const MAX_FILES_PER_REQUEST = 5;

const SYSTEM_PROMPT = `You are a senior software engineer doing a code review on a pull request.
Your job is to find real issues: bugs, security problems, performance concerns, and
significant readability problems. Skip nitpicks and style preferences.

Be direct and specific. Reference line numbers from the diff when pointing out issues.
If the code looks good, say so briefly.

Respond ONLY with valid JSON matching this schema:
{
  "summary": "Brief overall assessment of the PR changes",
  "comments": [
    {
      "path": "path/to/file",
      "line": 42,
      "body": "Description of the issue and how to fix it"
    }
  ],
  "approval": "APPROVE | REQUEST_CHANGES | COMMENT"
}

Rules:
- "line" must be a valid line number from the diff (the + side).
- Use "APPROVE" only when there are zero issues.
- Use "REQUEST_CHANGES" for bugs or security issues.
- Use "COMMENT" for suggestions and minor improvements.
- Keep comments actionable. Don't repeat the code back.`;

export async function reviewFiles(
  apiKey: string,
  model: string,
  ctx: PullRequestContext,
  files: FileDiff[],
  language: string,
): Promise<ReviewResult> {
  const client = new GoogleGenAI({ apiKey });
  const chunks = chunkArray(files, MAX_FILES_PER_REQUEST);

  const allComments: ReviewComment[] = [];
  const summaries: string[] = [];

  for (const chunk of chunks) {
    const result = await reviewChunk(client, model, ctx, chunk, language);
    if (result) {
      summaries.push(result.summary);
      allComments.push(...result.comments);
    }
  }

  // Determine the overall approval status — REQUEST_CHANGES wins over COMMENT,
  // COMMENT wins over APPROVE.
  let approval: ReviewResult['approval'] = 'APPROVE';
  if (allComments.length > 0) {
    const hasBlocker = allComments.some(
      (c) =>
        c.body.toLowerCase().includes('bug') ||
        c.body.toLowerCase().includes('security'),
    );
    approval = hasBlocker ? 'REQUEST_CHANGES' : 'COMMENT';
  }

  return {
    summary: summaries.join('\n\n'),
    comments: allComments,
    approval,
  };
}

async function reviewChunk(
  client: GoogleGenAI,
  model: string,
  ctx: PullRequestContext,
  files: FileDiff[],
  language: string,
): Promise<ReviewResult | null> {
  const diffContent = files
    .map((f) => `### ${f.filename} (${f.status})\n\`\`\`diff\n${f.patch}\n\`\`\``)
    .join('\n\n');

  const languageNote =
    language !== 'en' ? `\nWrite your review in: ${language}` : '';

  const prompt = `Review this pull request.

**Title:** ${ctx.title}
**Description:** ${ctx.description || 'No description provided.'}
${languageNote}

## Changed Files

${diffContent}`;

  try {
    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    const text = response.text ?? '';
    return parseReviewResponse(text, files);
  } catch (error) {
    core.warning(`Gemini API call failed: ${error}`);
    return null;
  }
}

function parseReviewResponse(
  raw: string,
  files: FileDiff[],
): ReviewResult | null {
  // Strip markdown fences if the model wraps its response
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    const validFiles = new Set(files.map((f) => f.filename));

    const comments: ReviewComment[] = (parsed.comments ?? [])
      .filter(
        (c: { path?: string; line?: number; body?: string }) =>
          c.path && c.line && c.body && validFiles.has(c.path),
      )
      .map((c: { path: string; line: number; body: string }) => ({
        path: c.path,
        line: c.line,
        body: c.body,
        side: 'RIGHT' as const,
      }));

    return {
      summary: parsed.summary ?? 'Review complete.',
      comments,
      approval: validateApproval(parsed.approval),
    };
  } catch (error) {
    core.warning(`Failed to parse Gemini response: ${error}`);
    core.debug(`Raw response: ${raw}`);

    // Return the raw text as a summary if parsing fails
    return {
      summary: raw,
      comments: [],
      approval: 'COMMENT',
    };
  }
}

function validateApproval(
  value: string,
): 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' {
  const valid = ['APPROVE', 'REQUEST_CHANGES', 'COMMENT'];
  return valid.includes(value) ? (value as ReviewResult['approval']) : 'COMMENT';
}
