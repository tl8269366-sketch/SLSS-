
import { GoogleGenAI } from "@google/genai";
import { AIConfig } from "../types";

// Retrieve configuration from storage or env
const getAIConfig = (): AIConfig => {
  try {
    const stored = localStorage.getItem('slss_ai_config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to parse AI config", e);
  }
  return {
    provider: 'google',
    apiKey: process.env.API_KEY || '',
    model: 'gemini-2.5-flash',
    baseUrl: ''
  };
};

export interface AnalysisResult {
  summary: string;
  possibleCauses: string[];
  recommendation: string;
}

/**
 * Helper to determine the effective endpoint and use standard fetch for OpenAI-compatible providers.
 */
const getOpenAICompatibleResponse = async (config: AIConfig, prompt: string, systemPrompt: string) => {
  let endpoint = config.baseUrl;
  
  // Auto-fill defaults if URL is empty (based on AdminPanel presets logic, duplicated here for safety)
  if (!endpoint || endpoint.trim() === '') {
     if (config.provider === 'openai') endpoint = 'https://api.openai.com/v1';
     else if (config.provider === 'deepseek') endpoint = 'https://api.deepseek.com';
     else if (config.provider === 'zhipu') endpoint = 'https://open.bigmodel.cn/api/paas/v4';
     else if (config.provider === 'modelscope') endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
     else if (config.provider !== 'google') throw new Error(`Base URL is required for provider: ${config.provider}`);
  }
  
  // Normalize endpoint: ensure it ends with /chat/completions
  // Many users might just paste the domain.
  if (endpoint && !endpoint.includes('/chat/completions')) {
    // Remove trailing slash
    endpoint = endpoint.replace(/\/+$/, '');
    endpoint = `${endpoint}/chat/completions`;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.5
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Provider Error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  if (!content) throw new Error("Empty response content from AI Provider");
  
  return content;
};

/**
 * Test the AI Connection with a simple ping
 */
export const testAIConnection = async (config: AIConfig): Promise<string> => {
  try {
    const prompt = "Reply with 'OK' only.";
    const isGoogleNative = config.provider === 'google' && (!config.baseUrl || config.baseUrl.trim() === '');

    if (isGoogleNative) {
      const ai = new GoogleGenAI({ apiKey: config.apiKey });
      const response = await ai.models.generateContent({
        model: config.model,
        contents: prompt
      });
      return response.text ? "Connection Successful" : "Empty Response";
    } else {
      await getOpenAICompatibleResponse(config, prompt, "You are a test bot.");
      return "Connection Successful";
    }
  } catch (e: any) {
    console.error("Test Connection Failed:", e);
    throw new Error(e.message || "Unknown Connection Error");
  }
};

export const analyzeFault = async (
  faultDescription: string,
  machineConfig: string,
  logs?: string
): Promise<AnalysisResult> => {
  try {
    const config = getAIConfig();
    const apiKey = config.apiKey || process.env.API_KEY;
    const modelName = config.model || 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error("Missing API Key. Please configure it in System Settings.");
    }

    const systemInstruction = "You are a server hardware expert. Output valid JSON only.";
    const prompt = `
      机器配置:
      ${machineConfig}

      故障描述:
      ${faultDescription}

      ${logs ? `系统日志:\n${logs}` : ''}

      请分析这个问题并提供以下信息（请务必使用中文回复）：
      1. 简要总结问题 (summary)。
      2. 列出前3个可能的根本原因 (possibleCauses)。
      3. 给技术员的逐步维修建议 (recommendation)。
      
      请返回有效的 JSON 格式，包含以下键值: "summary", "possibleCauses" (字符串数组), "recommendation"。
      **不要**包含 Markdown 格式标记（如 \`\`\`json），只返回纯 JSON 字符串。
    `;

    let rawText = "";

    // BRANCH 1: Google Native (Official SDK)
    // Only used if provider is google AND no custom Base URL (Proxy) is set.
    const isGoogleNative = config.provider === 'google' && (!config.baseUrl || config.baseUrl.trim() === '');
    
    if (isGoogleNative) {
      const ai = new GoogleGenAI({ apiKey: apiKey });
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      if (!response.text) throw new Error("Empty response from Google AI");
      rawText = response.text;
    } 
    // BRANCH 2: OpenAI Compatible (All other providers + Google Proxy)
    else {
      rawText = await getOpenAICompatibleResponse(config, prompt, systemInstruction);
    }

    // Clean up potential markdown code blocks if the model includes them despite instructions
    const cleanJson = rawText
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    return JSON.parse(cleanJson) as AnalysisResult;

  } catch (error: any) {
    console.error("AI Analysis Error:", error);
    
    // Detailed Error Handling for UI
    const errorMsg = error.message || JSON.stringify(error);
    const isNetworkError = errorMsg.includes("Rpc failed") || errorMsg.includes("xhr error") || errorMsg.includes("Failed to fetch");

    return {
      summary: "AI 分析请求失败",
      possibleCauses: [
        `错误详情: ${errorMsg}`,
        isNetworkError ? "网络连接被拒绝 (Connection Refused)" : "API 配置或密钥无效",
        "如果您在中国大陆使用 Google 模型，请配置 Base URL (Proxy) 或切换至 DeepSeek/Aliyun 等国内模型。",
        "请检查【系统管理 -> AI 智能网关】中的配置。"
      ],
      recommendation: "请进入系统管理页面，点击'测试连接'以验证 API 配置。"
    };
  }
};
