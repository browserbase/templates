// src/ollama-provider.ts
import { withoutTrailingSlash } from "@ai-sdk/provider-utils";

// src/ollama-chat-language-model.ts
import {
  combineHeaders,
  createJsonResponseHandler,
  generateId as generateId2,
  postJsonToApi
} from "@ai-sdk/provider-utils";
import { z as z2 } from "zod";

// src/convert-to-ollama-chat-messages.ts
import {
  UnsupportedFunctionalityError
} from "@ai-sdk/provider";
import { convertUint8ArrayToBase64 } from "@ai-sdk/provider-utils";
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
                throw new UnsupportedFunctionalityError({
                  functionality: "Image URLs in user messages"
                });
              } else if (current.type === "image" && current.image instanceof Uint8Array) {
                previous.images = previous.images || [];
                previous.images.push(convertUint8ArrayToBase64(current.image));
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
import { generateId } from "@ai-sdk/provider-utils";
import { parse } from "partial-json";
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
    let parsedFunctions = parse(this._toolPartial);
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
          id: generateId(),
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
import { createJsonErrorResponseHandler } from "@ai-sdk/provider-utils";
import { z } from "zod";
var ollamaErrorDataSchema = z.object({
  error: z.object({
    code: z.string().nullable(),
    message: z.string(),
    param: z.any().nullable(),
    type: z.string()
  })
});
var ollamaFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: ollamaErrorDataSchema,
  errorToMessage: (data) => data.error.message
});

// src/prepare-tools.ts
import {
  UnsupportedFunctionalityError as UnsupportedFunctionalityError2
} from "@ai-sdk/provider";
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
      throw new UnsupportedFunctionalityError2({
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
import { EmptyResponseBodyError } from "@ai-sdk/provider";
import {
  extractResponseHeaders,
  safeParseJSON
} from "@ai-sdk/provider-utils";

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
  const responseHeaders = extractResponseHeaders(response);
  if (response.body === null) {
    throw new EmptyResponseBodyError({});
  }
  return {
    responseHeaders,
    value: response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new TextLineStream()).pipeThrough(
      new TransformStream({
        transform(chunkText, controller) {
          controller.enqueue(
            safeParseJSON({
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
    const { responseHeaders, value: response } = await postJsonToApi({
      abortSignal: options.abortSignal,
      body,
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: combineHeaders(this.config.headers(), options.headers),
      successfulResponseHandler: createJsonResponseHandler(
        ollamaChatResponseSchema
      ),
      url: `${this.config.baseURL}/chat`
    });
    const { messages: rawPrompt, ...rawSettings } = body;
    const toolCalls = (_a = response.message.tool_calls) == null ? void 0 : _a.map((toolCall) => {
      var _a2;
      return {
        args: JSON.stringify(toolCall.function.arguments),
        toolCallId: (_a2 = toolCall.id) != null ? _a2 : generateId2(),
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
    const { responseHeaders, value: response } = await postJsonToApi({
      abortSignal: options.abortSignal,
      body,
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: combineHeaders(this.config.headers(), options.headers),
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
var ollamaChatResponseSchema = z2.object({
  created_at: z2.string(),
  done: z2.literal(true),
  done_reason: z2.string().optional().nullable(),
  eval_count: z2.number(),
  eval_duration: z2.number(),
  load_duration: z2.number().optional(),
  message: z2.object({
    content: z2.string(),
    role: z2.string(),
    tool_calls: z2.array(
      z2.object({
        function: z2.object({
          arguments: z2.record(z2.any()),
          name: z2.string()
        }),
        id: z2.string().optional()
      })
    ).optional().nullable()
  }),
  model: z2.string(),
  prompt_eval_count: z2.number().optional(),
  prompt_eval_duration: z2.number().optional(),
  total_duration: z2.number()
});
var ollamaChatStreamChunkSchema = z2.discriminatedUnion("done", [
  z2.object({
    created_at: z2.string(),
    done: z2.literal(false),
    message: z2.object({
      content: z2.string(),
      role: z2.string()
    }),
    model: z2.string()
  }),
  z2.object({
    created_at: z2.string(),
    done: z2.literal(true),
    eval_count: z2.number(),
    eval_duration: z2.number(),
    load_duration: z2.number().optional(),
    model: z2.string(),
    prompt_eval_count: z2.number().optional(),
    prompt_eval_duration: z2.number().optional(),
    total_duration: z2.number()
  })
]);

// src/ollama-embedding-model.ts
import {
  TooManyEmbeddingValuesForCallError
} from "@ai-sdk/provider";
import {
  createJsonResponseHandler as createJsonResponseHandler2,
  postJsonToApi as postJsonToApi2
} from "@ai-sdk/provider-utils";
import { z as z3 } from "zod";
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
      throw new TooManyEmbeddingValuesForCallError({
        maxEmbeddingsPerCall: this.maxEmbeddingsPerCall,
        modelId: this.modelId,
        provider: this.provider,
        values
      });
    }
    const { responseHeaders, value: response } = await postJsonToApi2({
      abortSignal,
      body: {
        input: values,
        model: this.modelId
      },
      failedResponseHandler: ollamaFailedResponseHandler,
      fetch: this.config.fetch,
      headers: this.config.headers(),
      successfulResponseHandler: createJsonResponseHandler2(
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
var ollamaTextEmbeddingResponseSchema = z3.object({
  embeddings: z3.array(z3.array(z3.number())),
  prompt_eval_count: z3.number().nullable()
});

// src/ollama-provider.ts
function createOllama(options = {}) {
  var _a;
  const baseURL = (_a = withoutTrailingSlash(options.baseURL)) != null ? _a : "http://127.0.0.1:11434/api";
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
export {
  createOllama,
  ollama
};
//# sourceMappingURL=index.mjs.map