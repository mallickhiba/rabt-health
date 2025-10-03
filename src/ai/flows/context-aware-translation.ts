'use server';

/**
 * @fileOverview This flow translates text from one language to another, taking context into account.
 *
 * - contextAwareTranslation - A function that translates text with context consideration.
 * - ContextAwareTranslationInput - The input type for the contextAwareTranslation function.
 * - ContextAwareTranslationOutput - The return type for the contextAwareTranslation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContextAwareTranslationInputSchema = z.object({
  text: z.string().describe('The text to translate.'),
  sourceLanguage: z.string().describe('The language of the text to translate.'),
  targetLanguage: z.string().describe('The language to translate the text into.'),
  context: z.string().optional().describe('Additional context for the translation.'),
});
export type ContextAwareTranslationInput = z.infer<typeof ContextAwareTranslationInputSchema>;

const ContextAwareTranslationOutputSchema = z.object({
  translation: z.string().describe('The translated text.'),
});
export type ContextAwareTranslationOutput = z.infer<typeof ContextAwareTranslationOutputSchema>;

export async function contextAwareTranslation(
  input: ContextAwareTranslationInput
): Promise<ContextAwareTranslationOutput> {
  return contextAwareTranslationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contextAwareTranslationPrompt',
  input: {schema: ContextAwareTranslationInputSchema},
  output: {schema: ContextAwareTranslationOutputSchema},
  prompt: `You are a professional translator who specializes in translating text while maintaining context.

Translate the following text from {{sourceLanguage}} to {{targetLanguage}}:

Text: {{{text}}}

{% if context %}
Consider the following context when translating:

Context: {{{context}}}
{% endif %}

Translation:`,
});

const contextAwareTranslationFlow = ai.defineFlow(
  {
    name: 'contextAwareTranslationFlow',
    inputSchema: ContextAwareTranslationInputSchema,
    outputSchema: ContextAwareTranslationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
