
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
});
export type SpeechToTextTranscriptionInput = z.infer<typeof SpeechToTextTranscriptionInputSchema>;

const SpeechToTextTranscriptionOutputSchema = z.object({
  transcription: z.string().describe('The transcribed text.'),
});
export type SpeechToTextTranscriptionOutput = z.infer<typeof SpeechToTextTranscriptionOutputSchema>;

export async function speechToTextTranscription(input: SpeechToTextTranscriptionInput): Promise<SpeechToTextTranscriptionOutput> {
  return speechToTextTranscriptionFlow(input);
}

const speechToTextTranscriptionFlow = ai.defineFlow(
  {
    name: 'speechToTextTranscriptionFlow',
    inputSchema: SpeechToTextTranscriptionInputSchema,
    outputSchema: SpeechToTextTranscriptionOutputSchema,
  },
  async input => {
    const apiKey = process.env.XI_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not provided. Please set the XI_API_KEY environment variable.');
    }
    const modelId = input.modelId || 'scribe_v1';
    const languageCode = input.languageCode;
    const useMultiChannel = input.useMultiChannel;

    // Prepare the multipart form data
    const formData = new FormData();
    formData.append('model_id', modelId);
    
    const audioBlob = await fetch(input.audioDataUri).then(res => res.blob());
    formData.append('file', audioBlob, 'audio.webm'); // Ensure a file name is provided
    
    if(languageCode) formData.append('language_code', languageCode);
    if(useMultiChannel) formData.append('use_multi_channel', 'true');

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
        const errorBody = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const responseData = await response.json();

    let transcription = '';
    if (useMultiChannel && responseData.transcripts) {
      transcription = responseData.transcripts.map((transcript: any) => transcript.text).join('\n');
    } else if (responseData.text) {
      transcription = responseData.text;
    } else {
      // It's possible to get a 200 OK with no transcription if the audio is empty.
      // We will not throw an error, but return an empty transcription.
      transcription = '';
    }

    return {transcription};
  }
);
