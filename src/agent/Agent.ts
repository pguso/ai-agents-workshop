import { LLMProvider } from "../llm/LLMProvider";
import { createSystemPrompt } from "../utils/createSystemPrompt";
import { Tool } from "./Tool";

export class Agent {
    tools: Record<string, Tool>;
    private llmProvider: LLMProvider;

    constructor(llmProvider: LLMProvider) {
        this.tools = {};
        this.llmProvider = llmProvider;
    }

    addTool(tool: Tool): void {
        this.tools[tool.name] = tool;
    }

    getAvailableTools(): string[] {
        return Object.values(this.tools).map(
            (tool) => `${tool.name}: ${tool.description}`
        );
    }

    async useTool(toolName: string, args: Record<string, any>): Promise<string> {
        const tool = this.tools[toolName];
        if (!tool) {
            throw new Error(
                `Tool '${toolName}' not found. Available: ${Object.keys(this.tools)}`
            );
        }
        const orderedKeys = Object.keys(tool.parameters);
        const argValues = orderedKeys.map(key => args.hasOwnProperty(key) ? args[key] : undefined);

        return await tool.call(...argValues);
    }

    /**
     * Calls the LLM using the provided LLMProvider.
     *
     * It builds the input object (using a system prompt, user prompt, and other parameters)
     * and passes it to the LLMProvider.
     */
    async callLLM(userPrompt: string): Promise<any> {
        const toolsArray = Object.values(this.tools);
        const systemPrompt = JSON.stringify(createSystemPrompt(toolsArray), null, 2);

        const promptTemplate = "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        const input = {
            prompt: userPrompt,
            system_prompt: systemPrompt,
            max_new_tokens: 10000,
            max_tokens: 10000,
            prompt_template: promptTemplate,
        };

        return await this.llmProvider.callLLM(input);
    }
}
