'use server';

/**
 * @fileOverview Generates a contextual next-step suggestion after a user uses a calculator.
 *
 * - suggestNextStep - A function that provides a helpful two-line tip.
 * - SuggestNextStepInput - The input type for the suggestNextStep function.
 * - SuggestNextStepOutput - The return type for the suggestNextStep function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestNextStepInputSchema = z.object({
  calculatorName: z
    .string()
    .describe('The name of the calculator the user has just used.'),
});
export type SuggestNextStepInput = z.infer<typeof SuggestNextStepInputSchema>;

const SuggestNextStepOutputSchema = z.object({
  suggestion: z
    .string()
    .describe(
      'A helpful, concise, two-line suggestion for the user. This could be a tip or a recommendation for another relevant calculator.'
    ),
});
export type SuggestNextStepOutput = z.infer<typeof SuggestNextStepOutputSchema>;

export async function suggestNextStep(
  input: SuggestNextStepInput
): Promise<SuggestNextStepOutput> {
  return suggestNextStepFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestNextStepPrompt',
  input: {schema: SuggestNextStepInputSchema},
  output: {schema: SuggestNextStepOutputSchema},
  prompt: `A user just finished using the "{{calculatorName}}".

  Provide a helpful and concise two-line suggestion for their next step. This could be a practical tip related to their result, or a recommendation for another relevant calculator in the app.

  Keep the tone encouraging and straightforward.`,
});

const suggestNextStepFlow = ai.defineFlow(
  {
    name: 'suggestNextStepFlow',
    inputSchema: SuggestNextStepInputSchema,
    outputSchema: SuggestNextStepOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
