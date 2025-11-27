'use server';

/**
 * @fileOverview Recommends calculators based on user usage patterns and trending calculators.
 *
 * - suggestCalculatorsBasedOnUsage - A function that suggests calculators based on usage.
 * - SuggestCalculatorsBasedOnUsageInput - The input type for the suggestCalculatorsBasedOnUsage function.
 * - SuggestCalculatorsBasedOnUsageOutput - The return type for the suggestCalculatorsBasedOnUsage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCalculatorsBasedOnUsageInputSchema = z.object({
  pastUsage: z
    .string()
    .describe(
      'A comma separated list of calculator names the user has used in the past.'
    ),
  trendingCalculators: z
    .string()
    .describe('A comma separated list of calculator names that are currently trending.'),
});
export type SuggestCalculatorsBasedOnUsageInput = z.infer<
  typeof SuggestCalculatorsBasedOnUsageInputSchema
>;

const SuggestCalculatorsBasedOnUsageOutputSchema = z.object({
  suggestedCalculators: z
    .string()
    .describe('A comma separated list of calculator names to suggest to the user.'),
});
export type SuggestCalculatorsBasedOnUsageOutput = z.infer<
  typeof SuggestCalculatorsBasedOnUsageOutputSchema
>;

export async function suggestCalculatorsBasedOnUsage(
  input: SuggestCalculatorsBasedOnUsageInput
): Promise<SuggestCalculatorsBasedOnUsageOutput> {
  return suggestCalculatorsBasedOnUsageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCalculatorsBasedOnUsagePrompt',
  input: {schema: SuggestCalculatorsBasedOnUsageInputSchema},
  output: {schema: SuggestCalculatorsBasedOnUsageOutputSchema},
  prompt: `You are an expert calculator suggestion engine.

  Based on the user's past calculator usage, and current trending calculators, suggest relevant calculators to the user.

  The suggested calculators should be related to the user's past usage, or be popular calculators that the user might find interesting.

  Past Usage: {{{pastUsage}}}
  Trending Calculators: {{{trendingCalculators}}}

  Suggested Calculators:`,
});

const suggestCalculatorsBasedOnUsageFlow = ai.defineFlow(
  {
    name: 'suggestCalculatorsBasedOnUsageFlow',
    inputSchema: SuggestCalculatorsBasedOnUsageInputSchema,
    outputSchema: SuggestCalculatorsBasedOnUsageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
