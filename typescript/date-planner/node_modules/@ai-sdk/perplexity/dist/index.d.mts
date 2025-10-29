import { ProviderV1, LanguageModelV1 } from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';

type PerplexityLanguageModelId = 'sonar-deep-research' | 'sonar-reasoning-pro' | 'sonar-reasoning' | 'sonar-pro' | 'sonar' | (string & {});

interface PerplexityProvider extends ProviderV1 {
    /**
  Creates an Perplexity chat model for text generation.
     */
    (modelId: PerplexityLanguageModelId): LanguageModelV1;
    /**
  Creates an Perplexity language model for text generation.
     */
    languageModel(modelId: PerplexityLanguageModelId): LanguageModelV1;
}
interface PerplexityProviderSettings {
    /**
  Base URL for the perplexity API calls.
       */
    baseURL?: string;
    /**
  API key for authenticating requests.
     */
    apiKey?: string;
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
declare function createPerplexity(options?: PerplexityProviderSettings): PerplexityProvider;
declare const perplexity: PerplexityProvider;

export { type PerplexityProvider, type PerplexityProviderSettings, createPerplexity, perplexity };
