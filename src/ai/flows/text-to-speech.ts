'use server';
/**
 * @fileOverview A flow that uses the ElevenLabs API to convert text to speech.
 *
 * - textToSpeech - A function that handles the text-to-speech conversion.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to convert to speech.'),
  voiceId: z.string().optional().describe('The ID of the voice to use.'),
  modelId: z.string().optional().describe('The ID of the TTS model to use.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The synthesized audio as a data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;

export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async input => {
    const apiKey = process.env.XI_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not provided. Please set the XI_API_KEY environment variable.');
    }

    const voiceId = input.voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice
    const modelId = input.modelId || 'eleven_multilingual_v2';
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: input.text,
        model_id: modelId,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`ElevenLabs TTS API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const audioBlob = await response.blob();
    const audioBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const dataUri = `data:${audioBlob.type};base64,${audioBase64}`;

    return { audioDataUri: dataUri };
  }
);
