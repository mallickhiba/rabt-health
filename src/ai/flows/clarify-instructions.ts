'use server';
/**
 * @fileOverview A flow that clarifies medical instructions and generates a voice note.
 *
 * - clarifyAndGenerateInstructions - A function that processes instructions.
 * - ClarifyAndGenerateInstructionsInput - The input type for the function.
 * - ClarifyAndGenerateInstructionsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { textToSpeech } from './text-to-speech';

const ClarifyAndGenerateInstructionsInputSchema = z.object({
  customInstruction: z.string().describe('A transcript of a custom voice instruction from the doctor.'),
  patientLanguage: z.string().describe('The language code for the patient (e.g., "urd").'),
});
export type ClarifyAndGenerateInstructionsInput = z.infer<typeof ClarifyAndGenerateInstructionsInputSchema>;

const ClarifyAndGenerateInstructionsOutputSchema = z.object({
  clarifiedText: z.string().describe('The clarified instructions in the patient\'s language.'),
  audioDataUri: z.string().describe('The data URI of the generated audio file.'),
});
export type ClarifyAndGenerateInstructionsOutput = z.infer<typeof ClarifyAndGenerateInstructionsOutputSchema>;

export async function clarifyAndGenerateInstructions(
  input: ClarifyAndGenerateInstructionsInput
): Promise<ClarifyAndGenerateInstructionsOutput> {
  return clarifyAndGenerateInstructionsFlow(input);
}

const clarificationPrompt = ai.definePrompt({
    name: 'clarifyInstructionsPrompt',
    input: { schema: z.object({
        instructions: z.string(),
        patientLanguage: z.string(),
    }) },
    output: { schema: z.object({
        clarifiedInstructions: z.string(),
    })},
    prompt: `You are a helpful medical assistant. Your task is to clarify and simplify a medical instruction for a patient.
Rephrase the instruction in a clear, simple, and encouraging tone.
Translate the final, clarified instruction into the patient's language: {{patientLanguage}}.

Instruction to process:
{{{instructions}}}

Respond with only the clarified and translated instruction.`,
});


const clarifyAndGenerateInstructionsFlow = ai.defineFlow(
  {
    name: 'clarifyAndGenerateInstructionsFlow',
    inputSchema: ClarifyAndGenerateInstructionsInputSchema,
    outputSchema: ClarifyAndGenerateInstructionsOutputSchema,
  },
  async (input) => {
    
    // 1. Use an LLM to clarify, and translate the text.
    const { output } = await clarificationPrompt({
        instructions: input.customInstruction,
        patientLanguage: input.patientLanguage,
    });
    const clarifiedText = output!.clarifiedInstructions;

    // 2. Convert the clarified text to speech.
    const ttsResult = await textToSpeech({
        text: clarifiedText,
        modelId: 'eleven_multilingual_v2', // Use a multilingual model
    });

    // 3. Return the clarified text and the audio data.
    return {
      clarifiedText,
      audioDataUri: ttsResult.audioDataUri,
    };
  }
);
