import { ProviderV1, LanguageModelV1 } from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';
import { OpenAICompatibleChatSettings } from '@ai-sdk/openai-compatible';
export { OpenAICompatibleErrorData as DeepSeekErrorData } from '@ai-sdk/openai-compatible';

type DeepSeekChatModelId = 'deepseek-chat' | 'deepseek-reasoner' | (string & {});
interface DeepSeekChatSettings extends OpenAICompatibleChatSettings {
}

interface DeepSeekProviderSettings {
    /**
  DeepSeek API key.
  */
    apiKey?: string;
    /**
  Base URL for the API calls.
  */
    baseURL?: string;
    /**
  Custom headers to include in the requests.
  */
    headers?: Record<string, string>;
    /**
  Custom fetch implementation. You can use it as a middleware to intercept requests,
  or to provide a custom fetch implementation for e.g. testing.
  */
    fetch?: FetchFunction;
}
interface DeepSeekProvider extends ProviderV1 {
    /**
  Creates a DeepSeek model for text generation.
  */
    (modelId: DeepSeekChatModelId, settings?: DeepSeekChatSettings): LanguageModelV1;
    /**
  Creates a DeepSeek model for text generation.
  */
    languageModel(modelId: DeepSeekChatModelId, settings?: DeepSeekChatSettings): LanguageModelV1;
    /**
  Creates a DeepSeek chat model for text generation.
  */
    chat(modelId: DeepSeekChatModelId, settings?: DeepSeekChatSettings): LanguageModelV1;
}
declare function createDeepSeek(options?: DeepSeekProviderSettings): DeepSeekProvider;
declare const deepseek: DeepSeekProvider;

export { type DeepSeekProvider, type DeepSeekProviderSettings, createDeepSeek, deepseek };
