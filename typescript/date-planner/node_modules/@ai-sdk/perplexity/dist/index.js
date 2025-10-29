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
  createPerplexity: () => createPerplexity,
  perplexity: () => perplexity
});
module.exports = __toCommonJS(src_exports);

// src/perplexity-provider.ts
var import_provider3 = require("@ai-sdk/provider");
var import_provider_utils2 = require("@ai-sdk/provider-utils");

// src/perplexity-language-model.ts
var import_provider2 = require("@ai-sdk/provider");
var import_provider_utils = require("@ai-sdk/provider-utils");
var import_zod = require("zod");

// src/convert-to-perplexity-messages.ts
var import_provider = require("@ai-sdk/provider");
function convertToPerplexityMessages(prompt) {
  const messages = [];
  for (const { role, content } of prompt) {
    switch (role) {
      case "system": {
        messages.push({ role: "system", content });
        break;
      }
      case "user":
      case "assistant": {
        messages.push({
          role,
          content: content.filter(
            (part) => part.type !== "reasoning" && part.type !== "redacted-reasoning"
          ).map((part) => {
            switch (part.type) {
              case "text": {
                return part.text;
              }
              case "image": {
                throw new import_provider.UnsupportedFunctionalityError({
                  functionality: "Image content parts in user messages"
                });
              }
              case "file": {
                throw new import_provider.UnsupportedFunctionalityError({
                  functionality: "File content parts in user messages"
                });
              }
              case "tool-call": {
                throw new import_provider.UnsupportedFunctionalityError({
                  functionality: "Tool calls in assistant messages"
                });
              }
              default: {
                const _exhaustiveCheck = part;
                throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
              }
            }
          }).join("")
        });
        break;
      }
      case "tool": {
        throw new import_provider.UnsupportedFunctionalityError({
          functionality: "Tool messages"
        });
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return messages;
}

// src/map-perplexity-finish-reason.ts
function mapPerplexityFinishReason(finishReason) {
  switch (finishReason) {
    case "stop":
    case "length":
      return finishReason;
    default:
      return "unknown";
  }
}

// src/perplexity-language-model.ts
var PerplexityLanguageModel = class {
  constructor(modelId, config) {
    this.specificationVersion = "v1";
    this.defaultObjectGenerationMode = "json";
    this.supportsStructuredOutputs = true;
    this.supportsImageUrls = false;
    this.provider = "perplexity";
    this.modelId = modelId;
    this.config = config;
  }
  getArgs({
    mode,
    prompt,
    maxTokens,
    temperature,
    topP,
    topK,
    frequencyPenalty,
    presencePenalty,
    stopSequences,
    responseFormat,
    seed,
    providerMetadata
  }) {
    var _a;
    const type = mode.type;
    const warnings = [];
    if (topK != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "topK"
      });
    }
    if (stopSequences != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "stopSequences"
      });
    }
    if (seed != null) {
      warnings.push({
        type: "unsupported-setting",
        setting: "seed"
      });
    }
    const baseArgs = {
      // model id:
      model: this.modelId,
      // standardized settings:
      frequency_penalty: frequencyPenalty,
      max_tokens: maxTokens,
      presence_penalty: presencePenalty,
      temperature,
      top_k: topK,
      top_p: topP,
      // response format:
      response_format: (responseFormat == null ? void 0 : responseFormat.type) === "json" ? {
        type: "json_schema",
        json_schema: { schema: responseFormat.schema }
      } : void 0,
      // provider extensions
      ...(_a = providerMetadata == null ? void 0 : providerMetadata.perplexity) != null ? _a : {},
      // messages:
      messages: convertToPerplexityMessages(prompt)
    };
    switch (type) {
      case "regular": {
        return { args: baseArgs, warnings };
      }
      case "object-json": {
        return {
          args: {
            ...baseArgs,
            response_format: {
              type: "json_schema",
              json_schema: { schema: mode.schema }
            }
          },
          warnings
        };
      }
      case "object-tool": {
        throw new import_provider2.UnsupportedFunctionalityError({
          functionality: "tool-mode object generation"
        });
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async doGenerate(options) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
    const { args, warnings } = this.getArgs(options);
    const {
      responseHeaders,
      value: response,
      rawValue: rawResponse
    } = await (0, import_provider_utils.postJsonToApi)({
      url: `${this.config.baseURL}/chat/completions`,
      headers: (0, import_provider_utils.combineHeaders)(this.config.headers(), options.headers),
      body: args,
      failedResponseHandler: (0, import_provider_utils.createJsonErrorResponseHandler)({
        errorSchema: perplexityErrorSchema,
        errorToMessage
      }),
      successfulResponseHandler: (0, import_provider_utils.createJsonResponseHandler)(
        perplexityResponseSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { messages: rawPrompt, ...rawSettings } = args;
    const choice = response.choices[0];
    const text = choice.message.content;
    return {
      text,
      toolCalls: [],
      finishReason: mapPerplexityFinishReason(choice.finish_reason),
      usage: {
        promptTokens: (_b = (_a = response.usage) == null ? void 0 : _a.prompt_tokens) != null ? _b : Number.NaN,
        completionTokens: (_d = (_c = response.usage) == null ? void 0 : _c.completion_tokens) != null ? _d : Number.NaN
      },
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders, body: rawResponse },
      request: { body: JSON.stringify(args) },
      response: getResponseMetadata(response),
      warnings,
      sources: (_e = response.citations) == null ? void 0 : _e.map((url) => ({
        sourceType: "url",
        id: this.config.generateId(),
        url
      })),
      providerMetadata: {
        perplexity: {
          images: (_g = (_f = response.images) == null ? void 0 : _f.map((image) => ({
            imageUrl: image.image_url,
            originUrl: image.origin_url,
            height: image.height,
            width: image.width
          }))) != null ? _g : null,
          usage: {
            citationTokens: (_i = (_h = response.usage) == null ? void 0 : _h.citation_tokens) != null ? _i : null,
            numSearchQueries: (_k = (_j = response.usage) == null ? void 0 : _j.num_search_queries) != null ? _k : null
          }
        }
      }
    };
  }
  async doStream(options) {
    const { args, warnings } = this.getArgs(options);
    const body = { ...args, stream: true };
    const { responseHeaders, value: response } = await (0, import_provider_utils.postJsonToApi)({
      url: `${this.config.baseURL}/chat/completions`,
      headers: (0, import_provider_utils.combineHeaders)(this.config.headers(), options.headers),
      body,
      failedResponseHandler: (0, import_provider_utils.createJsonErrorResponseHandler)({
        errorSchema: perplexityErrorSchema,
        errorToMessage
      }),
      successfulResponseHandler: (0, import_provider_utils.createEventSourceResponseHandler)(
        perplexityChunkSchema
      ),
      abortSignal: options.abortSignal,
      fetch: this.config.fetch
    });
    const { messages: rawPrompt, ...rawSettings } = args;
    let finishReason = "unknown";
    let usage = {
      promptTokens: Number.NaN,
      completionTokens: Number.NaN
    };
    const providerMetadata = {
      perplexity: {
        usage: {
          citationTokens: null,
          numSearchQueries: null
        },
        images: null
      }
    };
    let isFirstChunk = true;
    const self = this;
    return {
      stream: response.pipeThrough(
        new TransformStream({
          transform(chunk, controller) {
            var _a, _b, _c;
            if (!chunk.success) {
              controller.enqueue({ type: "error", error: chunk.error });
              return;
            }
            const value = chunk.value;
            if (isFirstChunk) {
              controller.enqueue({
                type: "response-metadata",
                ...getResponseMetadata(value)
              });
              (_a = value.citations) == null ? void 0 : _a.forEach((url) => {
                controller.enqueue({
                  type: "source",
                  source: {
                    sourceType: "url",
                    id: self.config.generateId(),
                    url
                  }
                });
              });
              isFirstChunk = false;
            }
            if (value.usage != null) {
              usage = {
                promptTokens: value.usage.prompt_tokens,
                completionTokens: value.usage.completion_tokens
              };
              providerMetadata.perplexity.usage = {
                citationTokens: (_b = value.usage.citation_tokens) != null ? _b : null,
                numSearchQueries: (_c = value.usage.num_search_queries) != null ? _c : null
              };
            }
            if (value.images != null) {
              providerMetadata.perplexity.images = value.images.map((image) => ({
                imageUrl: image.image_url,
                originUrl: image.origin_url,
                height: image.height,
                width: image.width
              }));
            }
            const choice = value.choices[0];
            if ((choice == null ? void 0 : choice.finish_reason) != null) {
              finishReason = mapPerplexityFinishReason(choice.finish_reason);
            }
            if ((choice == null ? void 0 : choice.delta) == null) {
              return;
            }
            const delta = choice.delta;
            const textContent = delta.content;
            if (textContent != null) {
              controller.enqueue({
                type: "text-delta",
                textDelta: textContent
              });
            }
          },
          flush(controller) {
            controller.enqueue({
              type: "finish",
              finishReason,
              usage,
              providerMetadata
            });
          }
        })
      ),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(body) },
      warnings
    };
  }
};
function getResponseMetadata({
  id,
  model,
  created
}) {
  return {
    id,
    modelId: model,
    timestamp: new Date(created * 1e3)
  };
}
var perplexityUsageSchema = import_zod.z.object({
  prompt_tokens: import_zod.z.number(),
  completion_tokens: import_zod.z.number(),
  citation_tokens: import_zod.z.number().nullish(),
  num_search_queries: import_zod.z.number().nullish()
});
var perplexityImageSchema = import_zod.z.object({
  image_url: import_zod.z.string(),
  origin_url: import_zod.z.string(),
  height: import_zod.z.number(),
  width: import_zod.z.number()
});
var perplexityResponseSchema = import_zod.z.object({
  id: import_zod.z.string(),
  created: import_zod.z.number(),
  model: import_zod.z.string(),
  choices: import_zod.z.array(
    import_zod.z.object({
      message: import_zod.z.object({
        role: import_zod.z.literal("assistant"),
        content: import_zod.z.string()
      }),
      finish_reason: import_zod.z.string().nullish()
    })
  ),
  citations: import_zod.z.array(import_zod.z.string()).nullish(),
  images: import_zod.z.array(perplexityImageSchema).nullish(),
  usage: perplexityUsageSchema.nullish()
});
var perplexityChunkSchema = import_zod.z.object({
  id: import_zod.z.string(),
  created: import_zod.z.number(),
  model: import_zod.z.string(),
  choices: import_zod.z.array(
    import_zod.z.object({
      delta: import_zod.z.object({
        role: import_zod.z.literal("assistant"),
        content: import_zod.z.string()
      }),
      finish_reason: import_zod.z.string().nullish()
    })
  ),
  citations: import_zod.z.array(import_zod.z.string()).nullish(),
  images: import_zod.z.array(perplexityImageSchema).nullish(),
  usage: perplexityUsageSchema.nullish()
});
var perplexityErrorSchema = import_zod.z.object({
  error: import_zod.z.object({
    code: import_zod.z.number(),
    message: import_zod.z.string().nullish(),
    type: import_zod.z.string().nullish()
  })
});
var errorToMessage = (data) => {
  var _a, _b;
  return (_b = (_a = data.error.message) != null ? _a : data.error.type) != null ? _b : "unknown error";
};

// src/perplexity-provider.ts
function createPerplexity(options = {}) {
  const getHeaders = () => ({
    Authorization: `Bearer ${(0, import_provider_utils2.loadApiKey)({
      apiKey: options.apiKey,
      environmentVariableName: "PERPLEXITY_API_KEY",
      description: "Perplexity"
    })}`,
    ...options.headers
  });
  const createLanguageModel = (modelId) => {
    var _a;
    return new PerplexityLanguageModel(modelId, {
      baseURL: (0, import_provider_utils2.withoutTrailingSlash)(
        (_a = options.baseURL) != null ? _a : "https://api.perplexity.ai"
      ),
      headers: getHeaders,
      generateId: import_provider_utils2.generateId,
      fetch: options.fetch
    });
  };
  const provider = (modelId) => createLanguageModel(modelId);
  provider.languageModel = createLanguageModel;
  provider.textEmbeddingModel = (modelId) => {
    throw new import_provider3.NoSuchModelError({ modelId, modelType: "textEmbeddingModel" });
  };
  return provider;
}
var perplexity = createPerplexity();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createPerplexity,
  perplexity
});
//# sourceMappingURL=index.js.map