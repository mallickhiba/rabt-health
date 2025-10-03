
import { config } from 'dotenv';
config();

import '@/ai/flows/real-time-translation.ts';
import '@/ai/flows/speech-to-text-transcription.ts';
import '@/ai/flows/context-aware-translation.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/generate-soap-note.ts';
import '@/ai/flows/clarify-instructions.ts';
