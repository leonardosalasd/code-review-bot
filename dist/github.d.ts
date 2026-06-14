import * as github from '@actions/github';
import { FileDiff, PullRequestContext, ReviewComment } from './types';
type Octokit = ReturnType<typeof github.getOctokit>;
export declare function getPRContext(): PullRequestContext;
export declare function getChangedFiles(octokit: Octokit, ctx: PullRequestContext, excludePatterns: string[]): Promise<FileDiff[]>;
export declare function submitReview(octokit: Octokit, ctx: PullRequestContext, summary: string, comments: ReviewComment[], event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'): Promise<void>;
export {};
