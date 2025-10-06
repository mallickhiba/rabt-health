

export type Patient = {
    id: string;
    name: string;
    phoneNumber: string;
    language: string; // Should be one of the language codes from languages.ts
};

export type Transcript = {
    id: string;
    patientId: string;
    text: string;
    languageCode: string;
    audioFileUrl?: string;
    createdAt: string;
};

export type SoapNote = {
    id: string;
    userId: string;
    patientId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    createdAt: string;
};

export type Instruction = {
    id: string;
    userId: string;
    patientId: string;
    text: string;
    sentAt: string;
    method: 'SMS' | 'Email' | 'In-Person' | 'WhatsApp';
    language: string;
    audioDataUri?: string;
};
