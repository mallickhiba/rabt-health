# **App Name**: LinguaBridge

## Core Features:

- Real-time Audio Recording: Record audio input from both speakers simultaneously.
- Language Selection: Allow users to select the input and output languages for each speaker.
- Speech-to-Text Transcription: Use ElevenLabs API to transcribe the audio input from both speakers in real-time. POST https://api.elevenlabs.io/v1/speech-to-text
- Real-time Translation: Translate the transcribed text from each speaker into the other speaker's language using a translation tool, reasoning if context is needed.
- Translated Text Display: Display the translated text for each speaker in a clear and readable format.

## Style Guidelines:

- Primary color: Light blue (#ADD8E6) to create a calm and trustworthy atmosphere, aiding communication.
- Background color: Very light blue (#F0F8FF), almost white, keeping the interface clean and unobtrusive.
- Accent color: Soft green (#90EE90) for translated text and interactive elements, symbolizing understanding and connection.
- Font pairing: 'Inter' (sans-serif) for both headlines and body text. It provides clarity and readability.
- Use simple, clear icons to represent languages and actions.
- A split-screen layout with each side representing a speaker, making it easy to follow the conversation flow.
- Subtle animations to indicate speech being transcribed and translations being processed.