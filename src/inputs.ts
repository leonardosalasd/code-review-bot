import * as core from '@actions/core';
import { ActionInputs } from './types';

const DEFAULT_EXCLUDE = [
  '*.lock',
  '*.lockb',
  'pnpm-lock.yaml',
  'package-lock.json',
  'yarn.lock',
  '*.png',
  '*.jpg',
  '*.jpeg',
  '*.gif',
  '*.svg',
  '*.ico',
  '*.woff',
  '*.woff2',
  '*.ttf',
  '*.eot',
  '*.mp4',
  '*.webm',
  '*.pdf',
];

export function getInputs(): ActionInputs {
  const githubToken = core.getInput('github-token', { required: true });
  const geminiApiKey = core.getInput('gemini-api-key', { required: true });
  const model = core.getInput('model') || 'gemini-2.0-flash';
  const language = core.getInput('language') || 'en';

  const rawExclude = core.getInput('exclude-patterns');
  const userPatterns = rawExclude
    ? rawExclude.split(',').map((p) => p.trim())
    : [];
  const excludePatterns = [...DEFAULT_EXCLUDE, ...userPatterns];

  return { githubToken, geminiApiKey, model, language, excludePatterns };
}
