import { FileDiff, ReviewResult, PullRequestContext } from './types';
export declare function reviewFiles(apiKey: string, model: string, ctx: PullRequestContext, files: FileDiff[], language: string): Promise<ReviewResult>;
