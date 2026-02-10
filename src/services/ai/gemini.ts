import {
  GoogleGenerativeAI,
  SchemaType,
  FunctionCallingMode,
  type FunctionDeclarationSchema,
  type ResponseSchema,
  type Part,
  type Content,
} from "@google/generative-ai";

const client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// --- chatWithGemini ---

export async function chatWithGemini(prompt: string): Promise<string> {
  console.log("[Gemini] Sending chat request...");

  try {
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("[Gemini] Response received");
    return text;
  } catch (error) {
    console.error("[Gemini] API error:", error);
    throw error;
  }
}

// --- getStructuredOutput ---

export async function getStructuredOutput<T>(
  prompt: string,
  schema: ResponseSchema
): Promise<T> {
  console.log("[Gemini] Sending structured output request...");

  try {
    const model = client.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    console.log("[Gemini] Structured response received");
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("[Gemini] Structured output error:", error);
    throw error;
  }
}

// --- agentLoop ---

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: FunctionDeclarationSchema;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export async function agentLoop(
  prompt: string,
  tools: ToolDefinition[]
): Promise<string> {
  console.log(`[Gemini Agent] Starting loop with ${tools.length} tool(s)`);

  const toolMap = new Map(tools.map((t) => [t.name, t]));

  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    tools: [
      {
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      },
    ],
    toolConfig: {
      functionCallingConfig: { mode: FunctionCallingMode.AUTO },
    },
  });

  const history: Content[] = [];
  let currentParts: Part[] = [{ text: prompt }];

  const MAX_ITERATIONS = 10;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    history.push({ role: "user", parts: currentParts });

    try {
      const result = await model.generateContent({ contents: history });
      const response = result.response;
      const candidate = response.candidates?.[0];

      if (!candidate?.content.parts) {
        throw new Error("No content in Gemini response");
      }

      history.push({ role: "model", parts: candidate.content.parts });

      const functionCalls = response.functionCalls();
      if (!functionCalls || functionCalls.length === 0) {
        const text = response.text();
        console.log(
          `[Gemini Agent] Completed after ${i + 1} iteration(s)`
        );
        return text;
      }

      // Execute each tool call and collect responses
      const responseParts: Part[] = [];
      for (const call of functionCalls) {
        const tool = toolMap.get(call.name);
        if (!tool) {
          throw new Error(`Unknown tool called: ${call.name}`);
        }

        console.log(`[Gemini Agent] Calling tool: ${call.name}`);
        const toolResult = await tool.execute(
          call.args as Record<string, unknown>
        );

        responseParts.push({
          functionResponse: {
            name: call.name,
            response: { result: toolResult },
          },
        });
      }

      currentParts = responseParts;
    } catch (error) {
      console.error(`[Gemini Agent] Error on iteration ${i + 1}:`, error);
      throw error;
    }
  }

  throw new Error(
    `[Gemini Agent] Exceeded maximum iterations (${MAX_ITERATIONS})`
  );
}

export { SchemaType };
