
'use server';
/**
 * @fileOverview A flow that sends a message to a user via WhatsApp.
 *
 * - sendWhatsAppMessage - A function that handles sending the message.
 * - SendWhatsAppMessageInput - The input type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Buffer } from 'buffer';


const SendWhatsAppMessageInputSchema = z.object({
  to: z.string().describe("The recipient's phone number."),
  text: z.string().describe('The text message to send.'),
  audioDataUri: z.string().describe('The audio data URI to send as a voice note.'),
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

    if (!accessToken || !businessPhoneNumberId) {
      throw new Error('WhatsApp API credentials are not configured in environment variables.');
    }

    const apiVersion = 'v23.0';
    const baseUrl = `https://graph.facebook.com/${apiVersion}/${businessPhoneNumberId}`;

    // 1. Upload the audio to get a media ID
    const audioBlob = await fetch(input.audioDataUri).then(res => res.blob());
    
    const uploadFormData = new FormData();
    uploadFormData.append('messaging_product', 'whatsapp');
    uploadFormData.append('file', audioBlob, 'instructions.mp3');

    const uploadResponse = await fetch(`${baseUrl}/media`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: uploadFormData,
    });

    if (!uploadResponse.ok) {
        const errorBody = await uploadResponse.text();
        throw new Error(`WhatsApp Media Upload API error: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorBody}`);
    }

    const uploadData = await uploadResponse.json();
    const mediaId = uploadData.id;

    if(!mediaId) {
        throw new Error('Failed to get media ID from WhatsApp upload response.');
    }

    // 2. Send the text message
    await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: input.to,
            type: 'text',
            text: {
                preview_url: false,
                body: input.text,
            },
        }),
    });


    // 3. Send the audio message
    const sendAudioResponse = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.to,
        type: 'audio',
        audio: {
          id: mediaId,
        },
      }),
    });

     if (!sendAudioResponse.ok) {
        const errorBody = await sendAudioResponse.text();
        throw new Error(`WhatsApp Send Audio API error: ${sendAudioResponse.status} ${sendAudioResponse.statusText} - ${errorBody}`);
    }

    console.log(`Messages sent successfully to ${input.to}`);
  }
);
