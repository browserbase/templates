"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  createDeepSeek: () => createDeepSeek,
  deepseek: () => deepseek
});
module.exports = __toCommonJS(src_exports);

// src/deepseek-provider.ts
var import_openai_compatible = require("@ai-sdk/openai-compatible");
var import_provider = require("@ai-sdk/provider");
var import_provider_utils2 = require("@ai-sdk/provider-utils");

// src/deepseek-metadata-extractor.ts
var import_provider_utils = require("@ai-sdk/provider-utils");
var import_zod = require("zod");
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
    const parsed = (0, import_provider_utils.safeValidateTypes)({
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
        const parsed = (0, import_provider_utils.safeValidateTypes)({
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
var deepSeekUsageSchema = import_zod.z.object({
  prompt_cache_hit_tokens: import_zod.z.number().nullish(),
  prompt_cache_miss_tokens: import_zod.z.number().nullish()
});
var deepSeekResponseSchema = import_zod.z.object({
  usage: deepSeekUsageSchema.nullish()
});
var deepSeekStreamChunkSchema = import_zod.z.object({
  choices: import_zod.z.array(
    import_zod.z.object({
      finish_reason: import_zod.z.string().nullish()
    })
  ).nullish(),
  usage: deepSeekUsageSchema.nullish()
});

// src/deepseek-provider.ts
function createDeepSeek(options = {}) {
  var _a;
  const baseURL = (0, import_provider_utils2.withoutTrailingSlash)(
    (_a = options.baseURL) != null ? _a : "https://api.deepseek.com/v1"
  );
  const getHeaders = () => ({
    Authorization: `Bearer ${(0, import_provider_utils2.loadApiKey)({
      apiKey: options.apiKey,
      environmentVariableName: "DEEPSEEK_API_KEY",
      description: "DeepSeek API key"
    })}`,
    ...options.headers
  });
  const createLanguageModel = (modelId, settings = {}) => {
    return new import_openai_compatible.OpenAICompatibleChatLanguageModel(modelId, settings, {
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
    throw new import_provider.NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
  };
  return provider;
}
var deepseek = createDeepSeek();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createDeepSeek,
  deepseek
});
//# sourceMappingURL=index.js.map