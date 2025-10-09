# Technical Environment Setup & Evaluation Guide

This guide provides all the necessary details for the evaluation committee to set up the environment, configure dependencies, and run the Rabt Health application for evaluation.

### 1. Environment Configuration (`package.json`)

This is a Node.js project built with Next.js. The environment dependencies are managed by `npm` (Node Package Manager) and are defined in the **`package.json`** file. This file serves the same purpose as a `requirements.txt` (for Python/pip).

**To install all required libraries and tools, navigate to the project's root directory in your terminal and run:**

```bash
npm install
```

This command will download and install all dependencies listed in `package.json`, including Next.js, React, Firebase, Genkit, and all UI component libraries.

### 2. Model Parameters & Dependencies (Environment Variables)

The AI models and external APIs in this project require specific API keys and identifiers. These must be stored in an environment file named `.env` in the root of the project.

**Action Required:**

1.  Create a new file named **`.env`** in the project's root directory.
2.  Copy the following content into the `.env` file.
3.  Replace the placeholder values (`YOUR_..._KEY`) with your actual credentials.

```env
# For Google AI Studio / Genkit (Gemini models)
# Get this from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# For ElevenLabs API (Speech-to-Text and Text-to-Speech)
# Get this from your ElevenLabs account: https://elevenlabs.io/
XI_API_KEY="YOUR_ELEVENLABS_API_KEY"

# For Meta / WhatsApp Business API (Sending Instructions)
# These are obtained from your Meta for Developers App dashboard.
WHATSAPP_ACCESS_TOKEN="YOUR_WHATSAPP_ACCESS_TOKEN"
WHATSAPP_BUSINESS_PHONE_NUMBER_ID="YOUR_WHATSAPP_BUSINESS_PHONE_NUMBER_ID"
```

### 3. How to Run the Model for Evaluation

The application consists of two main parts that need to be run concurrently in separate terminal windows:
1.  The Next.js frontend application.
2.  The Genkit AI flows server.

**Step 1: Run the Genkit AI Server**

Open a terminal window, navigate to the project root, and run:

```bash
npm run genkit:dev
```

This command starts the Genkit server, which makes all the AI flows (translation, SOAP note generation, TTS, etc.) available for the frontend application to call. You should see output indicating that the flows are running and listening for requests.

**Step 2: Run the Next.js Frontend Application**

Open a **second terminal window**, navigate to the project root, and run:

```bash
npm run dev
```

This command starts the Next.js development server. Once it's running, you can access the application in your web browser, typically at **`http://localhost:9002`**.

You can now use the application for evaluation.
