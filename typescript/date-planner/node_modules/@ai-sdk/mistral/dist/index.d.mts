import { ProviderV1, LanguageModelV1, EmbeddingModelV1 } from '@ai-sdk/provider';
import { FetchFunction } from '@ai-sdk/provider-utils';

type MistralChatModelId = 'ministral-3b-latest' | 'ministral-8b-latest' | 'mistral-large-latest' | 'mistral-small-latest' | 'pixtral-large-latest' | 'pixtral-12b-2409' | 'open-mistral-7b' | 'open-mixtral-8x7b' | 'open-mixtral-8x22b' | (string & {});
interface MistralChatSettings {
    /**
  Whether to inject a safety prompt before all conversations.
  
  Defaults to `false`.
     */
    safePrompt?: boolean;
}

type MistralEmbeddingModelId = 'mistral-embed' | (string & {});
interface MistralEmbeddingSettings {
    /**
  Override the maximum number of embeddings per call.
     */
    maxEmbeddingsPerCall?: number;
    /**
  Override the parallelism of embedding calls.
      */
    supportsParallelCalls?: boolean;
}

interface MistralProvider extends ProviderV1 {
    (modelId: MistralChatModelId, settings?: MistralChatSettings): LanguageModelV1;
    /**
  Creates a model for text generation.
  */
    languageModel(modelId: MistralChatModelId, settings?: MistralChatSettings): LanguageModelV1;
    /**
  Creates a model for text generation.
  */
    chat(modelId: MistralChatModelId, settings?: MistralChatSettings): LanguageModelV1;
    /**
  @deprecated Use `textEmbeddingModel()` instead.
     */
    embedding(modelId: MistralEmbeddingModelId, settings?: MistralEmbeddingSettings): EmbeddingModelV1<string>;
    /**
  @deprecated Use `textEmbeddingModel()` instead.
     */
    textEmbedding(modelId: MistralEmbeddingModelId, settings?: MistralEmbeddingSettings): EmbeddingModelV1<string>;
    textEmbeddingModel: (modelId: MistralEmbeddingModelId, settings?: MistralEmbeddingSettings) => EmbeddingModelV1<string>;
}
interface MistralProviderSettings {
    /**
  Use a different URL prefix for API calls, e.g. to use proxy servers.
  The default prefix is `https://api.mistral.ai/v1`.
     */
    baseURL?: string;
    /**
  API key that is being send using the `Authorization` header.
  It defaults to the `MISTRAL_API_KEY` environment variable.
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
/**
Create a Mistral AI provider instance.
 */
declare function createMistral(options?: MistralProviderSettings): MistralProvider;
/**
Default Mistral provider instance.
 */
declare const mistral: MistralProvider;

export { type MistralProvider, type MistralProviderSettings, createMistral, mistral };
