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

async function uploadAudioToWhatsApp(accessToken: string, businessPhoneNumberId: string, audioDataUri: string, apiVersion: string): Promise<string> {
    const baseUrl = `https://graph.facebook.com/${apiVersion}/${businessPhoneNumberId}`;
    
    const base64Data = audioDataUri.split(',')[1];
    const audioBuffer = Buffer.from(base64Data, 'base64');
    const uint8 = new Uint8Array(audioBuffer);

    const formData = new FormData();
    formData.append('file', new Blob([uint8], { type: 'audio/ogg' }), 'voice_note.ogg');
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', 'audio');

    const uploadResponse = await fetch(`${baseUrl}/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: formData,
    });

    if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.text();
        throw new Error(`WhatsApp Media Upload API error: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorBody}`);
    }

    const uploadData = await uploadResponse.json();
    if (!uploadData.id) {
        throw new Error('Media ID not found in WhatsApp upload response.');
    }
    
    console.log('Audio uploaded successfully, media ID:', uploadData.id);
    return uploadData.id;
}


async function sendWhatsAppApiMessage(accessToken: string, businessPhoneNumberId: string, apiVersion: string, payload: object) {
    const baseUrl = `https://graph.facebook.com/${apiVersion}/${businessPhoneNumberId}`;
    const url = `${baseUrl}/messages`;

    console.log('Sending WhatsApp message with payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const responseBody = await response.json();
    if (!response.ok) {
        console.error('WhatsApp API error response:', responseBody);
        throw new Error(`WhatsApp API error: ${response.status} ${response.statusText} - ${JSON.stringify(responseBody)}`);
    }

    console.log('WhatsApp message sent successfully:', responseBody);
    return responseBody;
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
      const errorMsg = 'WhatsApp API credentials are not configured correctly in environment variables.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    let sanitizedTo = input.to.replace(/[\s+-]/g, '');
    if (sanitizedTo.startsWith('0')) {
        sanitizedTo = sanitizedTo.substring(1);
    }
    if (!sanitizedTo.startsWith('92')) {
        sanitizedTo = '92' + sanitizedTo;
    }

    const apiVersion = 'v20.0';
    
    try {
      // 1. Send the text message first.
      const textPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: sanitizedTo,
        type: 'text',
        text: {
          preview_url: false,
          body: input.text,
        },
      };
      await sendWhatsAppApiMessage(accessToken, businessPhoneNumberId, apiVersion, textPayload);
      console.log(`Text message sent successfully to ${sanitizedTo}.`);
  
      // 2. If there's audio, upload and send it.
      if (input.audioDataUri) {
        const mediaId = await uploadAudioToWhatsApp(accessToken, businessPhoneNumberId, input.audioDataUri, apiVersion);
        
        const audioPayload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: sanitizedTo,
          type: 'audio',
          audio: {
            id: mediaId,
          },
        };
        await sendWhatsAppApiMessage(accessToken, businessPhoneNumberId, apiVersion, audioPayload);
        console.log(`Audio message sent successfully to ${sanitizedTo}.`);
      }
    } catch (error) {
        console.error(`Failed to send WhatsApp message to ${sanitizedTo}.`, error);
        // Re-throw the error so the calling function can handle it and show a proper error message.
        throw error;
    }
  }
);
