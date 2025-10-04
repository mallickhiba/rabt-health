
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

    if (!accessToken || !businessPhoneNumberId || businessPhoneNumberId === 'YOUR_WHATSAPP_BUSINESS_PHONE_NUMBER_ID') {
      console.error('WhatsApp API credentials are not configured correctly in environment variables.');
      throw new Error('WhatsApp API credentials are not configured in environment variables.');
    }

    const apiVersion = 'v23.0';
    const baseUrl = `https://graph.facebook.com/${apiVersion}/${businessPhoneNumberId}`;
    
    // Sanitize the phone number
    const sanitizedTo = input.to.replace(/[\s+-]/g, '');
    
    console.log(`Starting WhatsApp flow for recipient: ${sanitizedTo}`);

    // 1. Upload the audio to get a media ID
    console.log('Uploading audio to WhatsApp...');
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
        console.error('WhatsApp Media Upload API error response:', errorBody);
        throw new Error(`WhatsApp Media Upload API error: ${uploadResponse.status} ${uploadResponse.statusText} - ${errorBody}`);
    }

    const uploadData = await uploadResponse.json();
    const mediaId = uploadData.id;

    if(!mediaId) {
        console.error('Failed to get media ID from WhatsApp upload response:', uploadData);
        throw new Error('Failed to get media ID from WhatsApp upload response.');
    }
    console.log(`Successfully uploaded audio. Media ID: ${mediaId}`);


    // 2. Send the text message
    console.log('Sending text message...');
    const sendTextResponse = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: sanitizedTo,
            type: 'text',
            text: {
                preview_url: false,
                body: input.text,
            },
        }),
    });
    
    const textResponseBody = await sendTextResponse.json();
    if (!sendTextResponse.ok) {
        console.error('WhatsApp Send Text API error response:', textResponseBody);
        throw new Error(`WhatsApp Send Text API error: ${sendTextResponse.status} ${sendTextResponse.statusText} - ${JSON.stringify(textResponseBody)}`);
    }
    console.log('Text message sent successfully. Response:', textResponseBody);


    // 3. Send the audio message
    console.log('Sending audio message...');
    const sendAudioResponse = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: sanitizedTo,
        type: 'audio',
        audio: {
          id: mediaId,
        },
      }),
    });

    const audioResponseBody = await sendAudioResponse.json();
    if (!sendAudioResponse.ok) {
        console.error('WhatsApp Send Audio API error response:', audioResponseBody);
        throw new Error(`WhatsApp Send Audio API error: ${sendAudioResponse.status} ${sendAudioResponse.statusText} - ${JSON.stringify(audioResponseBody)}`);
    }
    console.log('Audio message sent successfully. Response:', audioResponseBody);

    console.log(`All messages sent successfully to ${sanitizedTo}`);
  }
);

    
