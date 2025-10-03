'use server';
/**
 * @fileOverview A flow that generates a SOAP note from a conversation transcript.
 *
 * - generateSoapNote - A function that generates a SOAP note.
 * - GenerateSoapNoteInput - The input type for the generateSoapNote function.
 * - GenerateSoapNoteOutput - The return type for the generateSoapNote function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateSoapNoteInputSchema = z.object({
  conversation: z.string().describe('The conversation transcript between a doctor and a patient.'),
});
export type GenerateSoapNoteInput = z.infer<typeof GenerateSoapNoteInputSchema>;

const GenerateSoapNoteOutputSchema = z.object({
  subjective: z.string().describe('The subjective part of the SOAP note (patient\'s complaints).'),
  objective: z.string().describe('The objective part of the SOAP note (doctor\'s observations).'),
  assessment: z.string().describe('The assessment part of the SOAP note (diagnosis).'),
  plan: z.string().describe('The plan part of the SOAP note (treatment plan).'),
});
export type GenerateSoapNoteOutput = z.infer<typeof GenerateSoapNoteOutputSchema>;

export async function generateSoapNote(input: GenerateSoapNoteInput): Promise<GenerateSoapNoteOutput> {
  return generateSoapNoteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateSoapNotePrompt',
  input: { schema: GenerateSoapNoteInputSchema },
  output: { schema: GenerateSoapNoteOutputSchema },
  prompt: `You are a medical assistant responsible for creating structured clinical notes.
Analyze the following conversation between a doctor and a patient and generate a concise SOAP note.

Conversation:
{{{conversation}}}

Generate the SOAP note with the following structure:
- Subjective: The patient's subjective complaints and history of present illness.
- Objective: The doctor's objective findings from the conversation (observations, what the doctor says).
- Assessment: Your assessment of the patient's condition based on the conversation.
- Plan: The proposed plan for treatment, further tests, or follow-up.
`,
});

const generateSoapNoteFlow = ai.defineFlow(
  {
    name: 'generateSoapNoteFlow',
    inputSchema: GenerateSoapNoteInputSchema,
    outputSchema: GenerateSoapNoteOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
