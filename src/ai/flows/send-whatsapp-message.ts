'use server';
/**
 * @fileOverview A flow that sends a message to a user via WhatsApp.
 *
 * - sendWhatsAppMessage - A function that handles sending the message.
 * - SendWhatsAppMessageInput - The input type for the function.
 */
import { config } from 'dotenv';
config();

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Buffer } from 'buffer';
import { contextAwareTranslation } from './context-aware-translation';
import { textToSpeech } from './text-to-speech';


const SendWhatsAppMessageInputSchema = z.object({
  to: z.string().describe("The recipient's phone number."),
  text: z.string().describe('The text message to send.'),
  patientLanguage: z.string().optional().describe('The patient\'s preferred language code (e.g., "urd" for Urdu, "pan" for Punjabi).'),
  audioDataUri: z.string().optional().describe('The audio data URI to send as a voice note.'),
});
export type SendWhatsAppMessageInput = z.infer<typeof SendWhatsAppMessageInputSchema>;

export async function sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<void> {
  await sendWhatsAppMessageFlow(input);
}

const sendWhatsAppMessageFlow = ai.defineFlow(
  {
    name: 'sendWhatsAppMessageFlow',
    inputSchema: SendWhatsAppMessageInputSchema,
    outputSchema: z.void(),
  },
  async (input) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const businessPhoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID;

    if (!accessToken || !businessPhoneNumberId || businessPhoneNumberId === 'YOUR_WHATSAPP_BUSINESS_PHONE_NUMBER_ID') {
      console.error('WhatsApp API credentials are not configured correctly in environment variables.');
      console.error('Access Token:', accessToken ? 'Present' : 'Missing');
      console.error('Business Phone Number ID:', businessPhoneNumberId ? 'Present' : 'Missing');
      throw new Error('WhatsApp API credentials are not configured in environment variables.');
    }
    
    console.log('WhatsApp API Configuration:');
    console.log('- Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'Missing');
    console.log('- Business Phone Number ID:', businessPhoneNumberId);

    const apiVersion = 'v22.0';
    const baseUrl = `https://graph.facebook.com/${apiVersion}/${businessPhoneNumberId}`;
    
    // Sanitize the phone number - ensure it starts with country code
    let sanitizedTo = input.to.replace(/[\s+-]/g, '');
    
    // Ensure phone number starts with country code (remove leading zeros)
    if (sanitizedTo.startsWith('0')) {
      sanitizedTo = sanitizedTo.substring(1);
    }
    
    // Add country code if missing (assuming Pakistan +92)
    if (!sanitizedTo.startsWith('92') && !sanitizedTo.startsWith('+92')) {
      sanitizedTo = '92' + sanitizedTo;
    }
    
    console.log(`Starting WhatsApp flow for recipient: ${sanitizedTo}`);

    // 1. Translate the message if patient language is specified
    let messageText = input.text;
    if (input.patientLanguage && input.patientLanguage !== 'eng') {
      console.log(`Translating message to ${input.patientLanguage}...`);
      try {
        // Map ISO-like short codes to human-readable names expected by the translator
        const codeToName: Record<string, string> = {
          eng: 'English',
          urd: 'Urdu',
          pan: 'Punjabi',
          pus: 'Pashto',
          snd: 'Sindhi',
        };
        const targetName = codeToName[input.patientLanguage] || input.patientLanguage;
        const translation = await contextAwareTranslation({
          text: input.text,
          sourceLanguage: 'English',
          targetLanguage: targetName,
          context: 'medical advice for patient'
        });
        messageText = translation.translation;
        console.log('Translated message:', messageText);
      } catch (error) {
        console.error('Translation failed, using original text:', error);
        // Keep original text if translation fails
        messageText = input.text;
      }
    } else {
      console.log('No translation needed, using original text');
    }

    // 2. Convert to speech if we have audio data URI or need to generate it
    let audioDataUri = input.audioDataUri;
    if (!audioDataUri && messageText) {
      console.log(`Converting text to speech in ${input.patientLanguage || 'default language'}...`);
      console.log('Text to convert:', messageText);
      try {
        const ttsResult = await textToSpeech({
          text: messageText, // This is already translated at this point
          voiceId: 'JBFqnCBsd6RMkjVDRZzb', // Default voice (works for multilingual)
          modelId: 'eleven_multilingual_v2' // Supports Urdu, Punjabi, etc.
        });
        audioDataUri = ttsResult.audioDataUri;
        console.log('Text-to-speech conversion completed successfully');
      } catch (error) {
        console.error('Text-to-speech failed, falling back to text message:', error);
        console.log('Note: Make sure XI_API_KEY is set in your .env file for ElevenLabs TTS');
      }
    } else if (audioDataUri) {
      console.log('Using pre-generated audio data URI');
    }

    // 3. Send as voice note if we have audio, otherwise send as text
    let messagePayload;
    let sendAsAudio = false;
    
    if (audioDataUri) {
      console.log('Uploading audio to WhatsApp...');
      try {
        // Convert data URI to buffer
        const base64Data = audioDataUri.split(',')[1];
        const audioBuffer = Buffer.from(base64Data, 'base64');
        const uint8 = new Uint8Array(audioBuffer);
        
        // Upload media to WhatsApp as Opus (served as OGG)
        const formData = new FormData();
        formData.append('file', new Blob([uint8], { type: 'audio/ogg' }), 'voice_note.ogg');
        formData.append('messaging_product', 'whatsapp');
        formData.append('type', 'audio');
        
        const uploadResponse = await fetch(`${baseUrl}/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          const errorBody = await uploadResponse.text();
          throw new Error(`Media upload failed: ${uploadResponse.status} - ${errorBody}`);
        }
        
        const uploadResult = await uploadResponse.json();
        const mediaId = uploadResult.id;
        console.log('Audio uploaded successfully, media ID:', mediaId);
        
        // Use voice true so it shows as a voice note (PTT style) in clients
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizedTo,
          type: 'audio',
          audio: {
            id: mediaId,
          },
        };
        sendAsAudio = true;
      } catch (error) {
        console.error('Audio upload failed, falling back to text message:', error);
        messagePayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizedTo,
          type: 'text',
          text: {
            preview_url: false,
            body: messageText,
          },
        };
      }
    } else {
      console.log('Sending text message...');
      messagePayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: sanitizedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: messageText,
        },
      };
    }
    
    console.log('Request URL:', `${baseUrl}/messages`);
    console.log('Request Body:', JSON.stringify(messagePayload, null, 2));
    
    // FIXED: Send the correct payload (audio or text)
    const sendResponse = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
    });
    
    const responseBody = await sendResponse.json();
    if (!sendResponse.ok) {
        console.error('WhatsApp API error response:', responseBody);
        throw new Error(`WhatsApp API error: ${sendResponse.status} ${sendResponse.statusText} - ${JSON.stringify(responseBody)}`);
    }
    
    console.log(`${sendAsAudio ? 'Voice note' : 'Text message'} sent successfully to ${sanitizedTo}`);
    console.log('Message ID:', responseBody.messages?.[0]?.id);
    console.log('Contact WA ID:', responseBody.contacts?.[0]?.wa_id);
    
    // Check if the contact exists on WhatsApp
    if (responseBody.contacts?.[0]?.wa_id) {
      console.log('✅ Contact is registered on WhatsApp');
    } else {
      console.log('❌ Contact is NOT registered on WhatsApp');
    }
  }
);