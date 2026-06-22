import type { FeedbackIssueType } from './types';

export const FEEDBACK_ISSUE_TYPES = [
	'wrong-info',
	'missing-info',
	'too-slow',
	'language-problem',
	'other'
] as const satisfies readonly FeedbackIssueType[];

export const MAX_COMMENT_LENGTH = 500;
