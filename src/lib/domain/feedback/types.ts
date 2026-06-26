export type FeedbackIssueType =
	| 'wrong-info'
	| 'missing-info'
	| 'too-slow'
	| 'language-problem'
	| 'other';

export type Feedback = {
	id: string;
	buyerSessionId?: string;
	outletId: string;
	helpful?: boolean;
	issueType?: FeedbackIssueType;
	comment?: string;
	createdAt: string;
};
