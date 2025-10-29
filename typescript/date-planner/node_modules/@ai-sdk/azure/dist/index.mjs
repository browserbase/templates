// src/azure-openai-provider.ts
import {
  OpenAIChatLanguageModel,
  OpenAICompletionLanguageModel,
  OpenAIEmbeddingModel,
  OpenAIImageModel,
  OpenAIResponsesLanguageModel,
  OpenAITranscriptionModel
} from "@ai-sdk/openai/internal";
import { loadApiKey, loadSetting } from "@ai-sdk/provider-utils";
function createAzure(options = {}) {
  var _a;
  const getHeaders = () => ({
    "api-key": loadApiKey({
      apiKey: options.apiKey,
      environmentVariableName: "AZURE_API_KEY",
      description: "Azure OpenAI"
    }),
    ...options.headers
  });
  const getResourceName = () => loadSetting({
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
  const createChatModel = (deploymentName, settings = {}) => new OpenAIChatLanguageModel(deploymentName, settings, {
    provider: "azure-openai.chat",
    url,
    headers: getHeaders,
    compatibility: "strict",
    fetch: options.fetch
  });
  const createCompletionModel = (modelId, settings = {}) => new OpenAICompletionLanguageModel(modelId, settings, {
    provider: "azure-openai.completion",
    url,
    compatibility: "strict",
    headers: getHeaders,
    fetch: options.fetch
  });
  const createEmbeddingModel = (modelId, settings = {}) => new OpenAIEmbeddingModel(modelId, settings, {
    provider: "azure-openai.embeddings",
    headers: getHeaders,
    url,
    fetch: options.fetch
  });
  const createResponsesModel = (modelId) => new OpenAIResponsesLanguageModel(modelId, {
    provider: "azure-openai.responses",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createImageModel = (modelId, settings = {}) => new OpenAIImageModel(modelId, settings, {
    provider: "azure-openai.image",
    url,
    headers: getHeaders,
    fetch: options.fetch
  });
  const createTranscriptionModel = (modelId) => new OpenAITranscriptionModel(modelId, {
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
export {
  azure,
  createAzure
};
//# sourceMappingURL=index.mjs.map