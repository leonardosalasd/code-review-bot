export interface ActionInputs {
  githubToken: string;
  geminiApiKey: string;
  model: string;
  language: string;
  excludePatterns: string[];
}

export interface FileDiff {
  filename: string;
  status: string;
  patch: string;
  additions: number;
  deletions: number;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
  side: 'RIGHT';
}

export interface ReviewResult {
  summary: string;
  comments: ReviewComment[];
  approval: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
}

export interface PullRequestContext {
  owner: string;
  repo: string;
  number: number;
  title: string;
  description: string;
  baseSha: string;
  headSha: string;
}
