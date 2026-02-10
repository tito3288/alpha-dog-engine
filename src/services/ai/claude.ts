import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function chatWithClaude(
  prompt: string,
  systemInstruction?: string
): Promise<string> {
  console.log("[Claude] Sending request...");

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      ...(systemInstruction && { system: systemInstruction }),
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text content in Claude response");
    }

    console.log(
      `[Claude] Response received (${message.usage.input_tokens} in, ${message.usage.output_tokens} out)`
    );
    return textBlock.text;
  } catch (error) {
    console.error("[Claude] API error:", error);
    throw error;
  }
}
