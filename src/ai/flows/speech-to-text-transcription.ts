'use server';
/**
 * @fileOverview A flow that uses the ElevenLabs API to transcribe audio input.
 *
 * - speechToTextTranscription - A function that handles the transcription process.
 * - SpeechToTextTranscriptionInput - The input type for the speechToTextTranscription function.
 * - SpeechToTextTranscriptionOutput - The return type for the speechToTextTranscription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SpeechToTextTranscriptionInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "Audio data as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  modelId: z.string().optional().describe('The ID of the transcription model to use.'),
  languageCode: z.string().optional().describe('The language code of the audio.'),
  useMultiChannel: z.boolean().optional().describe('Whether to process audio with multiple channels separately.'),
  xiApiKey: z.string().describe('The ElevenLabs API key.'),
});
export type SpeechToTextTranscriptionInput = z.infer<typeof SpeechToTextTranscriptionInputSchema>;

const SpeechToTextTranscriptionOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text.'),
});
export type SpeechToTextTranscriptionOutput = z.infer<typeof SpeechToTextTranscriptionOutputSchema>;

export async function speechToTextTranscription(input: SpeechToTextTranscriptionInput): Promise<SpeechToTextTranscriptionOutput> {
  return speechToTextTranscriptionFlow(input);
}

const speechToTextPrompt = ai.definePrompt({
  name: 'speechToTextPrompt',
  input: {schema: SpeechToTextTranscriptionInputSchema},
  prompt: `Transcribe the following audio: {{media url=audioDataUri}}`,
});

const speechToTextTranscriptionFlow = ai.defineFlow(
  {
    name: 'speechToTextTranscriptionFlow',
    inputSchema: SpeechToTextTranscriptionInputSchema,
    outputSchema: SpeechToTextTranscriptionOutputSchema,
  },
  async input => {
    const apiKey = input.xiApiKey;
    const modelId = input.modelId;
    const languageCode = input.languageCode;
    const useMultiChannel = input.useMultiChannel;

    // Prepare the multipart form data
    const formData = new FormData();
    formData.append('model_id', modelId || 'string'); // Default model_id
    formData.append('file', await fetch(input.audioDataUri).then(res => res.blob()), 'audio.webm'); // Ensure a file name is provided
    formData.append('language_code', languageCode || '');
    formData.append('use_multi_channel', useMultiChannel ? 'true' : 'false');

    // Call the ElevenLabs API
    const response = await fetch(
      'https://api.elevenlabs.io/v1/speech-to-text',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    let transcription = '';
    if (useMultiChannel && responseData.transcripts) {
      transcription = responseData.transcripts.map((transcript: any) => transcript.text).join('\n');
    } else if (responseData.text) {
      transcription = responseData.text;
    } else {
      throw new Error('No transcription found in ElevenLabs API response.');
    }

    return {transcription};
  }
);
