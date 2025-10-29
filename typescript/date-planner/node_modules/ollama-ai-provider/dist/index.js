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
  createOllama: () => createOllama,
  ollama: () => ollama
});
module.exports = __toCommonJS(src_exports);

// src/ollama-provider.ts
var import_provider_utils7 = require("@ai-sdk/provider-utils");

// src/ollama-chat-language-model.ts
var import_provider_utils5 = require("@ai-sdk/provider-utils");
var import_zod2 = require("zod");

// src/convert-to-ollama-chat-messages.ts
var import_provider = require("@ai-sdk/provider");
var import_provider_utils = require("@ai-sdk/provider-utils");
function convertToOllamaChatMessages(prompt) {
  const messages = [];
  for (const { content, role } of prompt) {
    switch (role) {
      case "system": {
        messages.push({ content, role: "system" });
        break;
      }
      case "user": {
        messages.push({
          ...content.reduce(
            (previous, current) => {
              if (current.type === "text") {
                previous.content += current.text;
              } else if (current.type === "image" && current.image instanceof URL) {
                throw new import_provider.UnsupportedFunctionalityError({
                  functionality: "Image URLs in user messages"
                });
              } else if (current.type === "image" && current.image instanceof Uint8Array) {
                previous.images = previous.images || [];
                previous.images.push((0, import_provider_utils.convertUint8ArrayToBase64)(current.image));
              }
              return previous;
            },
            { content: "" }
          ),
          role: "user"
        });
        break;
      }
      case "assistant": {
        const text = [];
        const toolCalls = [];
        for (const part of content) {
          switch (part.type) {
            case "text": {
              text.push(part.text);
              break;
            }
            case "tool-call": {
              toolCalls.push({
                function: {
                  arguments: part.args,
                  name: part.toolName
                },
                id: part.toolCallId,
                type: "function"
              });
              break;
            }
            default: {
              const _exhaustiveCheck = part;
              throw new Error(`Unsupported part: ${_exhaustiveCheck}`);
            }
          }
        }
        messages.push({
          content: text.join(","),
          role: "assistant",
          tool_calls: toolCalls.length > 0 ? toolCalls : void 0
        });
        break;
      }
      case "tool": {
        messages.push(
          ...content.map((part) => ({
            // Non serialized contents are not accepted by ollama, triggering the following error:
            // "json: cannot unmarshal array into Go struct field ChatRequest.messages of type string"
            content: typeof part.result === "object" ? JSON.stringify(part.result) : `${part.result}`,
            role: "tool",
            tool_call_id: part.toolCallId
          }))
        );
        break;
      }
      default: {
        const _exhaustiveCheck = role;
        throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
      }
    }
  }
  return messages;
}

// src/generate-tool/infer-tool-calls-from-stream.ts
var import_provider_utils2 = require("@ai-sdk/provider-utils");
var import_partial_json = require("partial-json");
var InferToolCallsFromStream = class {
  constructor({
    tools,
    type
  }) {
    this._firstMessage = true;
    this._tools = tools;
    this._toolPartial = "";
    this._toolCalls = [];
    this._type = type;
    this._detectedToolCall = false;
  }
  get toolCalls() {
    return this._toolCalls;
  }
  get detectedToolCall() {
    return this._detectedToolCall;
  }
  parse({
    controller,
    delta
  }) {
    var _a;
    this.detectToolCall(delta);
    if (!this._detectedToolCall) {
      return false;
    }
    this._toolPartial += delta;
    let parsedFunctions = (0, import_partial_json.parse)(this._toolPartial);
    if (!Array.isArray(parsedFunctions)) {
      parsedFunctions = [parsedFunctions];
    }
    for (const [index, parsedFunction] of parsedFunctions.entries()) {
      const parsedArguments = (_a = JSON.stringify(parsedFunction == null ? void 0 : parsedFunction.parameters)) != null ? _a : "";
      if (parsedArguments === "") {
        continue;
      }
      if (!this._toolCalls[index]) {
        this._toolCalls[index] = {
          function: {
            arguments: "",
            name: parsedFunction.name
          },
          id: (0, import_provider_utils2.generateId)(),
          type: "function"
        };
      }
      const toolCall = this._toolCalls[index];
      toolCall.function.arguments = parsedArguments;
      controller.enqueue({
        argsTextDelta: delta,
        toolCallId: toolCall.id,
        toolCallType: "function",
        toolName: toolCall.function.name,
        type: "tool-call-delta"
      });
    }
    return true;
  }
  finish({
    controller
  }) {
    for (const toolCall of this.toolCalls) {
      controller.enqueue({
        args: toolCall.function.arguments,
        toolCallId: toolCall.id,
        toolCallType: "function",
        toolName: toolCall.function.name,
        type: "tool-call"
      });
    }
    return this.finishReason();
  }
  detectToolCall(delta) {
    if (!this._tools || this._tools.length === 0) {
      return;
    }
    if (this._firstMessage) {
      if (this._type === "object-tool") {
        this._detectedToolCall = true;
      } else if (this._type === "regular" && (delta.trim().startsWith("{") || delta.trim().startsWith("["))) {
        this._detectedToolCall = true;
      }
      this._firstMessage = false;
    }
  }
  finishReason() {
    if (!this.detectedToolCall) {
      return "stop";
    }
    return this._type === "object-tool" ? "stop" : "tool-calls";
  }
};

// src/map-ollama-finish-reason.ts
function mapOllamaFinishReason({
  finishReason,
  hasToolCalls
}) {
  switch (finishReason) {
    case "stop": {
      return hasToolCalls ? "tool-calls" : "stop";
    }
    default: {
      return "other";
    }
  }
}

// src/ollama-error.ts
var import_provider_utils3 = require("@ai-sdk/provider-utils");
var import_zod = require("zod");
var ollamaErrorDataSchema = import_zod.z.object({
  error: import_zod.z.object({
    code: import_zod.z.string().nullable(),
    message: import_zod.z.string(),
    param: import_zod.z.any().nullable(),
    type: import_zod.z.string()
  })
});
var ollamaFailedResponseHandler = (0, import_provider_utils3.createJsonErrorResponseHandler)({
  errorSchema: ollamaErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/prepare-tools.ts
var import_provider2 = require("@ai-sdk/provider");
function prepareTools({
  mode
}) {
  var _a;
  const tools = ((_a = mode.tools) == null ? void 0 : _a.length) ? mode.tools : void 0;
  const toolWarnings = [];
  const toolChoice = mode.toolChoice;
  if (tools === void 0) {
    return {
      tools: void 0,
      toolWarnings
    };
  }
  const ollamaTools = [];
  for (const tool of tools) {
    if (tool.type === "provider-defined") {
      toolWarnings.push({ tool, type: "unsupported-tool" });
    } else {
      ollamaTools.push({
        function: {
          description: tool.description,
          name: tool.name,
          parameters: tool.parameters
        },
        type: "function"
      });
    }
  }
  if (toolChoice === void 0) {
    return {
      tools: ollamaTools,
      toolWarnings
    };
  }
  const type = toolChoice.type;
  switch (type) {
    case "auto": {
      return {
        tools: ollamaTools,
        toolWarnings
      };
    }
    case "none": {
      return {
        tools: void 0,
        toolWarnings
      };
    }
    default: {
      const _exhaustiveCheck = type;
      throw new import_provider2.UnsupportedFunctionalityError({
        functionality: `Unsupported tool choice type: ${_exhaustiveCheck}`
      });
    }
  }
}

// src/utils/remove-undefined.ts
function removeUndefined(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, v]) => v !== void 0)
  );
}

// src/utils/response-handler.ts
var import_provider3 = require("@ai-sdk/provider");
var import_provider_utils4 = require("@ai-sdk/provider-utils");

// src/utils/text-line-stream.ts
var TextLineStream = class extends TransformStream {
  constructor() {
    super({
      flush: (controller) => {
        if (this.buffer.length === 0) return;
        controller.enqueue(this.buffer);
      },
      transform: (chunkText, controller) => {
        chunkText = this.buffer + chunkText;
        while (true) {
          const EOL = chunkText.indexOf("\n");
          if (EOL === -1) break;
          controller.enqueue(chunkText.slice(0, EOL));
          chunkText = chunkText.slice(EOL + 1);
        }
        this.buffer = chunkText;
      }
    });
    this.buffer = "";
  }
};

// src/utils/response-handler.ts
var createJsonStreamResponseHandler = (chunkSchema) => async ({ response }) => {
  const responseHeaders = (0, import_provider_utils4.extractResponseHeaders)(response);
  if (response.body === null) {
    throw new import_provider3.EmptyResponseBodyError({});
  }
  return {
    responseHeaders,
    value: response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new TextLineStream()).pipeThrough(
      new TransformStream({
        transform(chunkText, controller) {
          controller.enqueue(
            (0, import_provider_utils4.safeParseJSON)({
              schema: chunkSchema,
              text: chunkText
            })
          );
        }
      })
    )
  };
};

// src/ollama-chat-language-model.ts
var OllamaChatLanguageModel = class {
  constructor(modelId, settings, config) {
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
    this.specificationVersion = "v1";
    this.defaultObjectGenerationMode = "json";
    this.supportsImageUrls = false;
  }
  get supportsStructuredOutputs() {
    var _a;
    return (_a = this.settings.structuredOutputs) != null ? _a : false;
  }
  get provider() {
    return this.config.provider;
  }
  getArguments({
    frequencyPenalty,
    maxTokens,
    mode,
    presencePenalty,
    prompt,
    responseFormat,
    seed,
    stopSequences,
    temperature,
    topK,
    topP
  }) {
    const type = mode.type;
    const warnings = [];
    if (responseFormat !== void 0 && responseFormat.type === "json" && responseFormat.schema !== void 0 && !this.supportsStructuredOutputs) {
      warnings.push({
        details: "JSON response format schema is only supported with structuredOutputs",
        setting: "responseFormat",
        type: "unsupported-setting"
      });
    }
    const baseArguments = {
      format: responseFormat == null ? void 0 : responseFormat.type,
      model: this.modelId,
      options: removeUndefined({
        f16_kv: this.settings.f16Kv,
        frequency_penalty: frequencyPenalty,
        low_vram: this.settings.lowVram,
        main_gpu: this.settings.mainGpu,
        min_p: this.settings.minP,
        mirostat: this.settings.mirostat,
        mirostat_eta: this.settings.mirostatEta,
        mirostat_tau: this.settings.mirostatTau,
        num_batch: this.settings.numBatch,
        num_ctx: this.settings.numCtx,
        num_gpu: this.settings.numGpu,
        num_keep: this.settings.numKeep,
        num_predict: maxTokens,
        num_thread: this.settings.numThread,
        numa: this.settings.numa,
        penalize_newline: this.settings.penalizeNewline,
        presence_penalty: presencePenalty,
        repeat_last_n: this.settings.repeatLastN,
        repeat_penalty: this.settings.repeatPenalty,
        seed,
        stop: stopSequences,
        temperature,
        tfs_z: this.settings.tfsZ,
        top_k: topK,
        top_p: topP,
        typical_p: this.settings.typicalP,
        use_mlock: this.settings.useMlock,
        use_mmap: this.settings.useMmap,
        vocab_only: this.settings.vocabOnly
      })
    };
    switch (type) {
      case "regular": {
        const { tools, toolWarnings } = prepareTools({
          mode
        });
        return {
          args: {
            ...baseArguments,
            messages: convertToOllamaChatMessages(prompt),
            tools
          },
          type,
          warnings: [...warnings, ...toolWarnings]
        };
      }
      case "object-json": {
        return {
          args: {
            ...baseArguments,
            format: this.supportsStructuredOutputs && mode.schema !== void 0 ? mode.schema : "json",
            messages: convertToOllamaChatMessages(prompt)
          },
          type,
          warnings
        };
      }
      case "object-tool": {
        return {
          args: {
            ...baseArguments,
            messages: convertToOllamaChatMessages(prompt),
            tool_choice: {
              function: { name: mode.tool.name },
              type: "function"
            },
            tools: [
              {
                function: {
                  description: mode.tool.description,
                  name: mode.tool.name,
                  parameters: mode.tool.parameters
                },
                type: "function"
              }
            ]
          },
          type,
          warnings
        };
      }
      default: {
        const _exhaustiveCheck = type;
        throw new Error(`Unsupported type: ${_exhaustiveCheck}`);
      }
    }
  }
  async doGenerate(options) {
    var _a, _b;
    const { args, warnings } = this.getArguments(options);
    const body = {
      ...args,
      stream: false
    };
    const { responseHeaders, value: response } = await (0, import_provider_utils5.postJsonToApi)({
      abortSignal: options.abortSignal,
      body,
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: (0, import_provider_utils5.combineHeaders)(this.config.headers(), options.headers),
      successfulResponseHandler: (0, import_provider_utils5.createJsonResponseHandler)(
        ollamaChatResponseSchema
      ),
      url: `${this.config.baseURL}/chat`
    });
    const { messages: rawPrompt, ...rawSettings } = body;
    const toolCalls = (_a = response.message.tool_calls) == null ? void 0 : _a.map((toolCall) => {
      var _a2;
      return {
        args: JSON.stringify(toolCall.function.arguments),
        toolCallId: (_a2 = toolCall.id) != null ? _a2 : (0, import_provider_utils5.generateId)(),
        toolCallType: "function",
        toolName: toolCall.function.name
      };
    });
    return {
      finishReason: mapOllamaFinishReason({
        finishReason: response.done_reason,
        hasToolCalls: toolCalls !== void 0 && toolCalls.length > 0
      }),
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(body) },
      text: (_b = response.message.content) != null ? _b : void 0,
      toolCalls,
      usage: {
        completionTokens: response.eval_count || 0,
        promptTokens: response.prompt_eval_count || 0
      },
      warnings
    };
  }
  async doStream(options) {
    if (this.settings.simulateStreaming) {
      const result = await this.doGenerate(options);
      const simulatedStream = new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "response-metadata", ...result.response });
          if (result.text) {
            controller.enqueue({
              textDelta: result.text,
              type: "text-delta"
            });
          }
          if (result.toolCalls) {
            for (const toolCall of result.toolCalls) {
              controller.enqueue({
                argsTextDelta: toolCall.args,
                toolCallId: toolCall.toolCallId,
                toolCallType: "function",
                toolName: toolCall.toolName,
                type: "tool-call-delta"
              });
              controller.enqueue({
                type: "tool-call",
                ...toolCall
              });
            }
          }
          controller.enqueue({
            finishReason: result.finishReason,
            logprobs: result.logprobs,
            providerMetadata: result.providerMetadata,
            type: "finish",
            usage: result.usage
          });
          controller.close();
        }
      });
      return {
        rawCall: result.rawCall,
        rawResponse: result.rawResponse,
        stream: simulatedStream,
        warnings: result.warnings
      };
    }
    const { args: body, type, warnings } = this.getArguments(options);
    const { responseHeaders, value: response } = await (0, import_provider_utils5.postJsonToApi)({
      abortSignal: options.abortSignal,
      body,
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: (0, import_provider_utils5.combineHeaders)(this.config.headers(), options.headers),
      successfulResponseHandler: createJsonStreamResponseHandler(
        ollamaChatStreamChunkSchema
      ),
      url: `${this.config.baseURL}/chat`
    });
    const { messages: rawPrompt, ...rawSettings } = body;
    const tools = options.mode.type === "regular" ? options.mode.tools : options.mode.type === "object-tool" ? [options.mode.tool] : void 0;
    const inferToolCallsFromStream = new InferToolCallsFromStream({
      tools,
      type
    });
    let finishReason = "other";
    let usage = {
      completionTokens: Number.NaN,
      promptTokens: Number.NaN
    };
    const { experimentalStreamTools = true } = this.settings;
    return {
      rawCall: { rawPrompt, rawSettings },
      rawResponse: { headers: responseHeaders },
      request: { body: JSON.stringify(body) },
      stream: response.pipeThrough(
        new TransformStream({
          async flush(controller) {
            controller.enqueue({
              finishReason,
              type: "finish",
              usage
            });
          },
          async transform(chunk, controller) {
            if (!chunk.success) {
              controller.enqueue({ error: chunk.error, type: "error" });
              return;
            }
            const value = chunk.value;
            if (value.done) {
              finishReason = inferToolCallsFromStream.finish({ controller });
              usage = {
                completionTokens: value.eval_count,
                promptTokens: value.prompt_eval_count || 0
              };
              return;
            }
            if (experimentalStreamTools) {
              const isToolCallStream = inferToolCallsFromStream.parse({
                controller,
                delta: value.message.content
              });
              if (isToolCallStream) {
                return;
              }
            }
            if (value.message.content !== null) {
              controller.enqueue({
                textDelta: value.message.content,
                type: "text-delta"
              });
            }
          }
        })
      ),
      warnings
    };
  }
};
var ollamaChatResponseSchema = import_zod2.z.object({
  created_at: import_zod2.z.string(),
  done: import_zod2.z.literal(true),
  done_reason: import_zod2.z.string().optional().nullable(),
  eval_count: import_zod2.z.number(),
  eval_duration: import_zod2.z.number(),
  load_duration: import_zod2.z.number().optional(),
  message: import_zod2.z.object({
    content: import_zod2.z.string(),
    role: import_zod2.z.string(),
    tool_calls: import_zod2.z.array(
      import_zod2.z.object({
        function: import_zod2.z.object({
          arguments: import_zod2.z.record(import_zod2.z.any()),
          name: import_zod2.z.string()
        }),
        id: import_zod2.z.string().optional()
      })
    ).optional().nullable()
  }),
  model: import_zod2.z.string(),
  prompt_eval_count: import_zod2.z.number().optional(),
  prompt_eval_duration: import_zod2.z.number().optional(),
  total_duration: import_zod2.z.number()
});
var ollamaChatStreamChunkSchema = import_zod2.z.discriminatedUnion("done", [
  import_zod2.z.object({
    created_at: import_zod2.z.string(),
    done: import_zod2.z.literal(false),
    message: import_zod2.z.object({
      content: import_zod2.z.string(),
      role: import_zod2.z.string()
    }),
    model: import_zod2.z.string()
  }),
  import_zod2.z.object({
    created_at: import_zod2.z.string(),
    done: import_zod2.z.literal(true),
    eval_count: import_zod2.z.number(),
    eval_duration: import_zod2.z.number(),
    load_duration: import_zod2.z.number().optional(),
    model: import_zod2.z.string(),
    prompt_eval_count: import_zod2.z.number().optional(),
    prompt_eval_duration: import_zod2.z.number().optional(),
    total_duration: import_zod2.z.number()
  })
]);

// src/ollama-embedding-model.ts
var import_provider4 = require("@ai-sdk/provider");
var import_provider_utils6 = require("@ai-sdk/provider-utils");
var import_zod3 = require("zod");
var OllamaEmbeddingModel = class {
  constructor(modelId, settings, config) {
    this.specificationVersion = "v1";
    this.modelId = modelId;
    this.settings = settings;
    this.config = config;
  }
  get provider() {
    return this.config.provider;
  }
  get maxEmbeddingsPerCall() {
    var _a;
    return (_a = this.settings.maxEmbeddingsPerCall) != null ? _a : 2048;
  }
  get supportsParallelCalls() {
    return false;
  }
  async doEmbed({
    abortSignal,
    values
  }) {
    if (values.length > this.maxEmbeddingsPerCall) {
      throw new import_provider4.TooManyEmbeddingValuesForCallError({
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        modelId: this.modelId,
        provider: this.provider,
        values
      });
    }
    const { responseHeaders, value: response } = await (0, import_provider_utils6.postJsonToApi)({
      abortSignal,
      body: {
        input: values,
        model: this.modelId
      },
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: this.config.headers(),
      successfulResponseHandler: (0, import_provider_utils6.createJsonResponseHandler)(
        ollamaTextEmbeddingResponseSchema
      ),
      url: `${this.config.baseURL}/embed`
    });
    return {
      embeddings: response.embeddings,
      rawResponse: { headers: responseHeaders },
      usage: response.prompt_eval_count ? { tokens: response.prompt_eval_count } : void 0
    };
  }
};
var ollamaTextEmbeddingResponseSchema = import_zod3.z.object({
  embeddings: import_zod3.z.array(import_zod3.z.array(import_zod3.z.number())),
  prompt_eval_count: import_zod3.z.number().nullable()
});

// src/ollama-provider.ts
function createOllama(options = {}) {
  var _a;
  const baseURL = (_a = (0, import_provider_utils7.withoutTrailingSlash)(options.baseURL)) != null ? _a : "http://127.0.0.1:11434/api";
  const getHeaders = () => ({
    ...options.headers
  });
  const createChatModel = (modelId, settings = {}) => new OllamaChatLanguageModel(modelId, settings, {
    baseURL,
    fetch: options.fetch,
    headers: getHeaders,
    provider: "ollama.chat"
  });
  const createEmbeddingModel = (modelId, settings = {}) => new OllamaEmbeddingModel(modelId, settings, {
    baseURL,
    fetch: options.fetch,
    headers: getHeaders,
    provider: "ollama.embedding"
  });
  const provider = function(modelId, settings) {
    if (new.target) {
      throw new Error(
        "The Ollama model function cannot be called with the new keyword."
      );
    }
    return createChatModel(modelId, settings);
  };
  provider.chat = createChatModel;
  provider.embedding = createEmbeddingModel;
  provider.languageModel = createChatModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  return provider;
}
var ollama = createOllama();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createOllama,
  ollama
});
//# sourceMappingURL=index.js.map