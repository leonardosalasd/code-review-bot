import * as github from '@actions/github';
import * as core from '@actions/core';
import { FileDiff, PullRequestContext, ReviewComment } from './types';
import { minimatch } from './utils';

type Octokit = ReturnType<typeof github.getOctokit>;

export function getPRContext(): PullRequestContext {
  const { context } = github;
  const pr = context.payload.pull_request;

  if (!pr) {
    throw new Error('This action can only run on pull_request events.');
  }

  return {
    owner: context.repo.owner,
    repo: context.repo.repo,
    number: pr.number,
    title: pr.title ?? '',
    description: pr.body ?? '',
    baseSha: pr.base.sha,
    headSha: pr.head.sha,
  };
}

export async function getChangedFiles(
  octokit: Octokit,
  ctx: PullRequestContext,
  excludePatterns: string[],
): Promise<FileDiff[]> {
  const files: FileDiff[] = [];
  let page = 1;

  // Paginate through all changed files
  while (true) {
    const { data } = await octokit.rest.pulls.listFiles({
      owner: ctx.owner,
      repo: ctx.repo,
      pull_number: ctx.number,
      per_page: 100,
      page,
    });

    if (data.length === 0) break;

    for (const file of data) {
      if (!file.patch) continue;
      if (file.status === 'removed') continue;
      if (shouldExclude(file.filename, excludePatterns)) continue;

      files.push({
        filename: file.filename,
        status: file.status,
        patch: file.patch,
        additions: file.additions,
        deletions: file.deletions,
      });
    }

    if (data.length < 100) break;
    page++;
  }

  return files;
}

export async function submitReview(
  octokit: Octokit,
  ctx: PullRequestContext,
  summary: string,
  comments: ReviewComment[],
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
): Promise<void> {
  try {
    await octokit.rest.pulls.createReview({
      owner: ctx.owner,
      repo: ctx.repo,
      pull_number: ctx.number,
      commit_id: ctx.headSha,
      body: summary,
      event,
      comments: comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
        side: c.side,
      })),
    });
  } catch (error) {
    // If inline comments fail (e.g. line out of range), fall back to a
    // regular comment with everything in the body.
    core.warning(
      `Failed to post inline review, falling back to PR comment: ${error}`,
    );
    const body = formatFallbackComment(summary, comments);
    await octokit.rest.issues.createComment({
      owner: ctx.owner,
      repo: ctx.repo,
      issue_number: ctx.number,
      body,
    });
  }
}

function formatFallbackComment(
  summary: string,
  comments: ReviewComment[],
): string {
  let body = `## Code Review\n\n${summary}\n`;

  if (comments.length > 0) {
    body += '\n### File Comments\n\n';
    for (const c of comments) {
      body += `**\`${c.path}\`** (line ${c.line}):\n${c.body}\n\n`;
    }
  }

  return body;
}

function shouldExclude(filename: string, patterns: string[]): boolean {
  return patterns.some((pattern) => minimatch(filename, pattern));
}
