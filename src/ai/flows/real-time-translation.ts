'use server';

/**
 * @fileOverview A real-time translation AI agent.
 *
 * - realTimeTranslation - A function that handles the real-time translation process.
 * - RealTimeTranslationInput - The input type for the realTimeTranslation function.
 * - RealTimeTranslationOutput - The return type for the realTimeTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RealTimeTranslationInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  sourceLanguage: z.string().describe('The language of the text to translate.'),
  targetLanguage: z.string().describe('The language to translate the text into.'),
});
export type RealTimeTranslationInput = z.infer<typeof RealTimeTranslationInputSchema>;

const RealTimeTranslationOutputSchema = z.object({
  translatedText: z.string().describe('The translated text.'),
});
export type RealTimeTranslationOutput = z.infer<typeof RealTimeTranslationOutputSchema>;

export async function realTimeTranslation(input: RealTimeTranslationInput): Promise<RealTimeTranslationOutput> {
  return realTimeTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'realTimeTranslationPrompt',
  input: {schema: RealTimeTranslationInputSchema},
  output: {schema: RealTimeTranslationOutputSchema},
  prompt: `Translate the following text from {{sourceLanguage}} to {{targetLanguage}}:\n\n{{text}}`,
});

const realTimeTranslationFlow = ai.defineFlow(
  {
    name: 'realTimeTranslationFlow',
    inputSchema: RealTimeTranslationInputSchema,
    outputSchema: RealTimeTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
