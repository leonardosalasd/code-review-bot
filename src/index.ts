import * as core from '@actions/core';
import * as github from '@actions/github';
import { getInputs } from './inputs';
import { getPRContext, getChangedFiles, submitReview } from './github';
import { reviewFiles } from './reviewer';

async function run(): Promise<void> {
  try {
    const inputs = getInputs();
    const ctx = getPRContext();

    core.info(`Reviewing PR #${ctx.number}: ${ctx.title}`);

    const octokit = github.getOctokit(inputs.githubToken);
    const files = await getChangedFiles(octokit, ctx, inputs.excludePatterns);

    if (files.length === 0) {
      core.info('No reviewable files found. Skipping.');
      return;
    }

    core.info(`Found ${files.length} file(s) to review.`);

    const result = await reviewFiles(
      inputs.geminiApiKey,
      inputs.model,
      ctx,
      files,
      inputs.language,
    );

    core.info(`Review complete. Posting ${result.comments.length} comment(s).`);

    await submitReview(
      octokit,
      ctx,
      result.summary,
      result.comments,
      result.approval,
    );

    core.setOutput('review-summary', result.summary);
    core.setOutput('comments-count', result.comments.length.toString());
    core.setOutput('approval-status', result.approval);
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unexpected error occurred.');
    }
  }
}

run();
