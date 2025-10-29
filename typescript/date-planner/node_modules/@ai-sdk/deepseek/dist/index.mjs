// src/deepseek-provider.ts
import { OpenAICompatibleChatLanguageModel } from "@ai-sdk/openai-compatible";
import {
  NoSuchModelError
} from "@ai-sdk/provider";
import {
  loadApiKey,
  withoutTrailingSlash
} from "@ai-sdk/provider-utils";

// src/deepseek-metadata-extractor.ts
import { safeValidateTypes } from "@ai-sdk/provider-utils";
import { z } from "zod";
var buildDeepseekMetadata = (usage) => {
  var _a, _b;
  return usage == null ? void 0 : {
    deepseek: {
      promptCacheHitTokens: (_a = usage.prompt_cache_hit_tokens) != null ? _a : NaN,
      promptCacheMissTokens: (_b = usage.prompt_cache_miss_tokens) != null ? _b : NaN
    }
  };
};
var deepSeekMetadataExtractor = {
  extractMetadata: ({ parsedBody }) => {
    const parsed = safeValidateTypes({
      value: parsedBody,
      schema: deepSeekResponseSchema
    });
    return !parsed.success || parsed.value.usage == null ? void 0 : buildDeepseekMetadata(parsed.value.usage);
  },
  createStreamExtractor: () => {
    let usage;
    return {
      processChunk: (chunk) => {
        var _a, _b;
        const parsed = safeValidateTypes({
          value: chunk,
          schema: deepSeekStreamChunkSchema
        });
        if (parsed.success && ((_b = (_a = parsed.value.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.finish_reason) === "stop" && parsed.value.usage) {
          usage = parsed.value.usage;
        }
      },
      buildMetadata: () => buildDeepseekMetadata(usage)
    };
  }
};
var deepSeekUsageSchema = z.object({
  prompt_cache_hit_tokens: z.number().nullish(),
  prompt_cache_miss_tokens: z.number().nullish()
});
var deepSeekResponseSchema = z.object({
  usage: deepSeekUsageSchema.nullish()
});
var deepSeekStreamChunkSchema = z.object({
  choices: z.array(
    z.object({
      finish_reason: z.string().nullish()
    })
  ).nullish(),
  usage: deepSeekUsageSchema.nullish()
});

// src/deepseek-provider.ts
function createDeepSeek(options = {}) {
  var _a;
  const baseURL = withoutTrailingSlash(
    (_a = options.baseURL) != null ? _a : "https://api.deepseek.com/v1"
  );
  const getHeaders = () => ({
    Authorization: `Bearer ${loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "DEEPSEEK_API_KEY",
      description: "DeepSeek API key"
    })}`,
    ...options.headers
  });
  const createLanguageModel = (modelId, settings = {}) => {
    return new OpenAICompatibleChatLanguageModel(modelId, settings, {
      provider: `deepseek.chat`,
      url: ({ path }) => `${baseURL}${path}`,
      headers: getHeaders,
      fetch: options.fetch,
      defaultObjectGenerationMode: "json",
      metadataExtractor: deepSeekMetadataExtractor
    });
  };
  const provider = (modelId, settings) => createLanguageModel(modelId, settings);
  provider.languageModel = createLanguageModel;
  provider.chat = createLanguageModel;
  provider.textEmbeddingModel = (modelId) => {
    throw new NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
  };
  return provider;
}
var deepseek = createDeepSeek();
export {
  createDeepSeek,
  deepseek
};
//# sourceMappingURL=index.mjs.map