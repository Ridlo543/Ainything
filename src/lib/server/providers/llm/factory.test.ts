import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Intercept appEnv so each test can control which provider / keys are active.
const appEnvMock = {
	llmProvider: 'mock' as string,
	llmModel: undefined as string | undefined,
	tokenrouterApiKey: undefined as string | undefined,
	tokenrouterBaseUrl: 'https://api.tokenrouter.com/v1',
	openaiApiKey: undefined as string | undefined,
	anthropicApiKey: undefined as string | undefined
};

vi.mock('$lib/server/config/env', () => ({ appEnv: appEnvMock }));

// Lightweight stand-ins — we only need to verify which class gets instantiated.
const MockLlmProviderCtor = vi.fn();
const OpenAICompatibleProviderCtor = vi.fn();
const AnthropicProviderCtor = vi.fn();

vi.mock('./mock-provider', () => ({
	MockLlmProvider: MockLlmProviderCtor
}));
vi.mock('./openai-compatible-provider', () => ({
	OpenAICompatibleProvider: OpenAICompatibleProviderCtor
}));
vi.mock('./anthropic-provider', () => ({
	AnthropicProvider: AnthropicProviderCtor
}));

const { getLlmProvider } = await import('./factory');

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetMocks() {
	MockLlmProviderCtor.mockReset();
	OpenAICompatibleProviderCtor.mockReset();
	AnthropicProviderCtor.mockReset();

	// Reset env state.
	appEnvMock.llmProvider = 'mock';
	appEnvMock.llmModel = undefined;
	appEnvMock.tokenrouterApiKey = undefined;
	appEnvMock.openaiApiKey = undefined;
	appEnvMock.anthropicApiKey = undefined;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getLlmProvider — mock provider', () => {
	beforeEach(resetMocks);

	it("returns MockLlmProvider when LLM_PROVIDER='mock'", () => {
		appEnvMock.llmProvider = 'mock';
		getLlmProvider();
		expect(MockLlmProviderCtor).toHaveBeenCalledOnce();
		expect(OpenAICompatibleProviderCtor).not.toHaveBeenCalled();
		expect(AnthropicProviderCtor).not.toHaveBeenCalled();
	});

	it('falls back to MockLlmProvider for unknown provider names', () => {
		appEnvMock.llmProvider = 'totally-unknown';
		getLlmProvider();
		expect(MockLlmProviderCtor).toHaveBeenCalledOnce();
	});
});

describe('getLlmProvider — tokenrouter', () => {
	beforeEach(resetMocks);

	it('returns OpenAICompatibleProvider when key is set', () => {
		appEnvMock.llmProvider = 'tokenrouter';
		appEnvMock.tokenrouterApiKey = 'tr-key-abc';
		getLlmProvider();
		expect(OpenAICompatibleProviderCtor).toHaveBeenCalledOnce();
		expect(OpenAICompatibleProviderCtor).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'TokenRouter',
				apiKey: 'tr-key-abc'
			})
		);
	});

	it('falls back to mock when TOKENROUTER_API_KEY is missing', () => {
		appEnvMock.llmProvider = 'tokenrouter';
		appEnvMock.tokenrouterApiKey = undefined;
		getLlmProvider();
		expect(MockLlmProviderCtor).toHaveBeenCalledOnce();
		expect(OpenAICompatibleProviderCtor).not.toHaveBeenCalled();
	});

	it('uses LLM_MODEL override when provided', () => {
		appEnvMock.llmProvider = 'tokenrouter';
		appEnvMock.tokenrouterApiKey = 'tr-key';
		appEnvMock.llmModel = 'gpt-4o';
		getLlmProvider();
		expect(OpenAICompatibleProviderCtor).toHaveBeenCalledWith(
			expect.objectContaining({ model: 'gpt-4o' })
		);
	});

	it('uses MiniMax-M3 default when LLM_MODEL is not set', () => {
		appEnvMock.llmProvider = 'tokenrouter';
		appEnvMock.tokenrouterApiKey = 'tr-key';
		appEnvMock.llmModel = undefined;
		getLlmProvider();
		expect(OpenAICompatibleProviderCtor).toHaveBeenCalledWith(
			expect.objectContaining({ model: 'MiniMax-M3' })
		);
	});
});

describe('getLlmProvider — openai', () => {
	beforeEach(resetMocks);

	it('returns OpenAICompatibleProvider with OpenAI base URL when key is set', () => {
		appEnvMock.llmProvider = 'openai';
		appEnvMock.openaiApiKey = 'sk-test';
		getLlmProvider();
		expect(OpenAICompatibleProviderCtor).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'OpenAI',
				apiKey: 'sk-test',
				baseURL: 'https://api.openai.com/v1'
			})
		);
	});

	it('falls back to mock when OPENAI_API_KEY is missing', () => {
		appEnvMock.llmProvider = 'openai';
		getLlmProvider();
		expect(MockLlmProviderCtor).toHaveBeenCalledOnce();
	});
});

describe('getLlmProvider — anthropic', () => {
	beforeEach(resetMocks);

	it('returns AnthropicProvider when key is set', () => {
		appEnvMock.llmProvider = 'anthropic';
		appEnvMock.anthropicApiKey = 'sk-ant-key';
		getLlmProvider();
		expect(AnthropicProviderCtor).toHaveBeenCalledOnce();
	});

	it('passes claude-haiku-4-5 as default model', () => {
		appEnvMock.llmProvider = 'anthropic';
		appEnvMock.anthropicApiKey = 'sk-ant-key';
		appEnvMock.llmModel = undefined;
		getLlmProvider();
		expect(AnthropicProviderCtor).toHaveBeenCalledWith('claude-haiku-4-5');
	});

	it('uses LLM_MODEL override', () => {
		appEnvMock.llmProvider = 'anthropic';
		appEnvMock.anthropicApiKey = 'sk-ant-key';
		appEnvMock.llmModel = 'claude-sonnet-4-5';
		getLlmProvider();
		expect(AnthropicProviderCtor).toHaveBeenCalledWith('claude-sonnet-4-5');
	});

	it('falls back to mock when ANTHROPIC_API_KEY is missing', () => {
		appEnvMock.llmProvider = 'anthropic';
		getLlmProvider();
		expect(MockLlmProviderCtor).toHaveBeenCalledOnce();
		expect(AnthropicProviderCtor).not.toHaveBeenCalled();
	});
});
