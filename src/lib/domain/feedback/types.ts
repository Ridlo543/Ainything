export type FeedbackIssueType =
	| 'wrong-info'
	| 'missing-info'
	| 'too-slow'
	| 'language-problem'
	| 'other';

export type Feedback = {
	id: string;
	sessionId?: string;
	restaurantId: string;
	helpful?: boolean;
	issueType?: FeedbackIssueType;
	comment?: string;
	createdAt: string;
};
