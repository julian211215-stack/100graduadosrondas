'use server';
/**
 * @fileOverview This file implements a Genkit flow for an AI assistant that helps conductors generate or refine dynamic challenge details.
 *
 * - generateDynamicWithAI - A function that handles the generation or refinement of dynamic challenge details.
 * - GenerateDynamicWithAIInput - The input type for the generateDynamicWithAI function.
 * - GenerateDynamicWithAIOutput - The return type for the generateDynamicWithAI function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateDynamicWithAIInputSchema = z.object({
  theme: z.string().describe('A brief prompt or theme for the dynamic challenge.'),
  existingDynamic: z.object({
    name: z.string().optional(),
    instructions: z.string().optional(),
    durationSeconds: z.number().optional(),
    votingCriteria: z.string().optional(),
  }).optional().describe('Optional existing dynamic details to refine. If provided, the AI will refine these based on the theme.'),
});
export type GenerateDynamicWithAIInput = z.infer<typeof GenerateDynamicWithAIInputSchema>;

const GeneratedDynamicWithAIOutputSchema = z.object({
  name: z.string().describe('The name of the dynamic challenge.'),
  instructions: z.string().describe('Detailed instructions for the dynamic challenge.'),
  durationSeconds: z.number().optional().describe('Optional suggested duration for the dynamic in seconds.'),
  votingCriteria: z.string().optional().describe('Optional suggested criteria for voting on the dynamic.'),
});
export type GenerateDynamicWithAIOutput = z.infer<typeof GeneratedDynamicWithAIOutputSchema>;

export async function generateDynamicWithAI(input: GenerateDynamicWithAIInput): Promise<GenerateDynamicWithAIOutput> {
  return generateDynamicWithAIFlow(input);
}

const generateDynamicPrompt = ai.definePrompt({
  name: 'generateDynamicPrompt',
  input: { schema: GenerateDynamicWithAIInputSchema },
  output: { schema: GeneratedDynamicWithAIOutputSchema },
  prompt: `You are an AI assistant designed to help a conductor create and refine engaging dynamic challenges for a live event.
Your goal is to provide a creative name, clear instructions, an optional suggested duration in seconds, and optional suggested voting criteria for a dynamic challenge.

{{#if existingDynamic}}
  Refine the following dynamic challenge based on the theme: "{{{theme}}}".
  Existing Name: "{{{existingDynamic.name}}}"
  Existing Instructions: "{{{existingDynamic.instructions}}}"
  {{#if existingDynamic.durationSeconds}}Existing Duration (seconds): {{{existingDynamic.durationSeconds}}}{{/if}}
  Existing Voting Criteria: "{{{existingDynamic.votingCriteria}}}"
  Please refine these details, focusing on making them more engaging or fitting the new theme. Only include fields in the output that have values, do not include null or empty strings. If an existing field is not suitable for the new theme, you may remove it by not including it in the output.
{{else}}
  Generate a brand new dynamic challenge.
  The theme or brief idea for this dynamic is: "{{{theme}}}".
  Be creative and ensure the challenge is suitable for a fun, competitive event.
{{/if}}

Ensure your response is a JSON object matching the requested schema for 'name', 'instructions', 'durationSeconds', and 'votingCriteria'. If a field is optional and you don't have a value for it, simply omit it from the JSON output.`,
});

const generateDynamicWithAIFlow = ai.defineFlow(
  {
    name: 'generateDynamicWithAIFlow',
    inputSchema: GenerateDynamicWithAIInputSchema,
    outputSchema: GeneratedDynamicWithAIOutputSchema,
  },
  async (input) => {
    const { output } = await generateDynamicPrompt(input);
    return output!;
  }
);
