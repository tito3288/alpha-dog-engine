import { NextResponse } from "next/server";
import { chatWithClaude } from "@/services/ai/claude";
import {
  chatWithGemini,
  getStructuredOutput,
  agentLoop,
  SchemaType,
} from "@/services/ai/gemini";

export const dynamic = 'force-dynamic';

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Claude
  try {
    const claudeResponse = await chatWithClaude(
      "What is 2+2? Answer in one word.",
      "You are a concise math tutor."
    );
    results.claude = { success: true, response: claudeResponse };
  } catch (error) {
    results.claude = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 2: Gemini chat
  try {
    const geminiResponse = await chatWithGemini(
      "What is 2+2? Answer in one word."
    );
    results.geminiChat = { success: true, response: geminiResponse };
  } catch (error) {
    results.geminiChat = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 3: Gemini structured output
  try {
    const structured = await getStructuredOutput("List 3 colors", {
      type: SchemaType.OBJECT,
      properties: {
        colors: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
        },
      },
      required: ["colors"],
    });
    results.geminiStructured = { success: true, response: structured };
  } catch (error) {
    results.geminiStructured = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Test 4: Gemini agent loop
  try {
    const agentResponse = await agentLoop(
      "What is the result of adding 10 and 25? Use the calculator tool.",
      [
        {
          name: "calculator",
          description: "Adds two numbers together",
          parameters: {
            type: SchemaType.OBJECT,
            properties: {
              a: { type: SchemaType.NUMBER, description: "First number" },
              b: { type: SchemaType.NUMBER, description: "Second number" },
            },
            required: ["a", "b"],
          },
          execute: async (args) => {
            const sum = (args.a as number) + (args.b as number);
            return { sum };
          },
        },
      ]
    );
    results.geminiAgent = { success: true, response: agentResponse };
  } catch (error) {
    results.geminiAgent = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
