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
  azure: () => azure,
  createAzure: () => createAzure
});
module.exports = __toCommonJS(src_exports);

// src/azure-openai-provider.ts
var import_internal = require("@ai-sdk/openai/internal");
var import_provider_utils = require("@ai-sdk/provider-utils");
function createAzure(options = {}) {
  var _a;
  const getHeaders = () => ({
    "api-key": (0, import_provider_utils.loadApiKey)({
      apiKey: options.apiKey,
      environmentVariableName: "AZURE_API_KEY",
      description: "Azure OpenAI"
    }),
    ...options.headers
  });
  const getResourceName = () => (0, import_provider_utils.loadSetting)({
    settingValue: options.resourceName,
    settingName: "resourceName",
    environmentVariableName: "AZURE_RESOURCE_NAME",
    description: "Azure OpenAI resource name"
  });
  const apiVersion = (_a = options.apiVersion) != null ? _a : "2025-03-01-preview";
  const url = ({ path, modelId }) => {
    if (path === "/responses") {
      return options.baseURL ? `${options.baseURL}${path}?api-version=${apiVersion}` : `https://${getResourceName()}.openai.azure.com/openai/responses?api-version=${apiVersion}`;
    }
    return options.baseURL ? `${options.baseURL}/${modelId}${path}?api-version=${apiVersion}` : `https://${getResourceName()}.openai.azure.com/openai/deployments/${modelId}${path}?api-version=${apiVersion}`;
  };
  const createChatModel = (deploymentName, settings = {}) => new import_internal.OpenAIChatLanguageModel(deploymentName, settings, {
    provider: "azure-openai.chat",
    url,
    headers: getHeaders,
    compatibility: "strict",
    fetch: options.fetch
  });
  const createCompletionModel = (modelId, settings = {}) => new import_internal.OpenAICompletionLanguageModel(modelId, settings, {
    provider: "azure-openai.completion",
    url,
    compatibility: "strict",
    headers: getHeaders,
    fetch: options.fetch
  });
  const createEmbeddingModel = (modelId, settings = {}) => new import_internal.OpenAIEmbeddingModel(modelId, settings, {
    provider: "azure-openai.embeddings",
    headers: getHeaders,
    url,
    fetch: options.fetch
  });
  const createResponsesModel = (modelId) => new import_internal.OpenAIResponsesLanguageModel(modelId, {
    provider: "azure-openai.responses",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createImageModel = (modelId, settings = {}) => new import_internal.OpenAIImageModel(modelId, settings, {
    provider: "azure-openai.image",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createTranscriptionModel = (modelId) => new import_internal.OpenAITranscriptionModel(modelId, {
    provider: "azure-openai.transcription",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const provider = function(deploymentId, settings) {
    if (new.target) {
      throw new Error(
        "The Azure OpenAI model function cannot be called with the new keyword."
      );
    }
    return createChatModel(deploymentId, settings);
  };
  provider.languageModel = createChatModel;
  provider.chat = createChatModel;
  provider.completion = createCompletionModel;
  provider.embedding = createEmbeddingModel;
  provider.image = createImageModel;
  provider.imageModel = createImageModel;
  provider.textEmbedding = createEmbeddingModel;
  provider.textEmbeddingModel = createEmbeddingModel;
  provider.responses = createResponsesModel;
  provider.transcription = createTranscriptionModel;
  return provider;
}
var azure = createAzure();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  azure,
  createAzure
});
//# sourceMappingURL=index.js.map