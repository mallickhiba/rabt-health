"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowRightLeft,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  Square,
  FileText,
  Link as LinkIcon,
  Languages,
  Save,
  Sparkles,
  Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { speechToTextTranscription } from "@/ai/flows/speech-to-text-transcription";
import { contextAwareTranslation } from "@/ai/flows/context-aware-translation";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { generateSoapNote, GenerateSoapNoteOutput } from "@/ai/flows/generate-soap-note";
import { clarifyAndGenerateInstructions, ClarifyAndGenerateInstructionsOutput } from "@/ai/flows/clarify-instructions";
import { sendWhatsAppMessage } from "@/ai/flows/send-whatsapp-message";
import { languages } from "@/lib/languages";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Speaker = "Patient" | "Doctor";
type Message = {
  id: number;
  speaker: Speaker;
  originalText: string;
  translatedText: string;
};

const patientData = {
    name: "Aisha Khan",
    avatar: "https://picsum.photos/seed/1/200/200",
    initials: "AK",
    language: "Pashto",
    languageCode: "pus",
    phone: "923328785640"
}

export default function PatientDashboardPage() {
    const { toast } = useToast();
    const [patientLang, setPatientLang] = useState(patientData.languageCode);
    const [doctorLang, setDoctorLang] = useState("eng");
    const [conversation, setConversation] = useState<Message[]>([]);
    const [processingSpeaker, setProcessingSpeaker] = useState<Speaker | null>(null);
    const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
    const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
    const [audioLoadingMessageId, setAudioLoadingMessageId] = useState<number | null>(null);
    const [isGeneratingSoapNote, setIsGeneratingSoapNote] = useState(false);
    const [soapNote, setSoapNote] = useState<GenerateSoapNoteOutput | null>(null);

    const [isProcessingInstructions, setIsProcessingInstructions] = useState(false);
    const [isRecordingCustomInstruction, setIsRecordingCustomInstruction] = useState(false);
    const [isSendingInstructions, setIsSendingInstructions] = useState(false);
    const [generatedInstructions, setGeneratedInstructions] = useState<ClarifyAndGenerateInstructionsOutput | null>(null);
    const [instructionAudioPlayer, setInstructionAudioPlayer] = useState<HTMLAudioElement | null>(null);
    const [isPlayingInstructions, setIsPlayingInstructions] = useState(false);
    const [customInstructionText, setCustomInstructionText] = useState<string>("");
    const [whatsAppNumber, setWhatsAppNumber] = useState(patientData.phone);
    const [instructionLanguage, setInstructionLanguage] = useState(patientData.languageCode);


    const conversationEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (conversation.length) {
            scrollToBottom();
        }
    }, [conversation]);
    
    useEffect(() => {
        return () => {
            if (audioPlayer) {
                audioPlayer.pause();
                setAudioPlayer(null);
            }
            if (instructionAudioPlayer) {
                instructionAudioPlayer.pause();
                setInstructionAudioPlayer(null);
            }
        };
    }, [audioPlayer, instructionAudioPlayer]);

    const handleAudioProcessing = useCallback(
      async (blob: Blob, speaker: Speaker) => {
          setProcessingSpeaker(speaker);

          try {
              const audioDataUri = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
              });

              const sourceLang = speaker === "Patient" ? patientLang : doctorLang;
              const targetLang = speaker === "Patient" ? doctorLang : patientLang;
              
              const transcriptionResult = await speechToTextTranscription({
                audioDataUri,
                modelId: 'scribe_v1',
                languageCode: sourceLang,
              });

              const originalText = transcriptionResult.transcription;

              if (!originalText || originalText.trim().length === 0) {
                  toast({
                      title: "Transcription Notice",
                      description: "No speech detected or transcription was empty. Please try again.",
                  });
                  setProcessingSpeaker(null);
                  return;
              }
              
              const prevContext = conversation.slice(-3).map(m => `${m.speaker}: ${m.originalText}`).join('\n');
              
              const translationResult = await contextAwareTranslation({
                text: originalText,
                sourceLanguage: sourceLang,
                targetLanguage: targetLang,
                context: prevContext,
              });

              const translatedText = translationResult.translation;

              setConversation((prev) => [
                ...prev,
                {
                  id: Date.now(),
                  speaker,
                  originalText,
                  translatedText,
                },
              ]);

          } catch (error) {
              console.error(error);
              toast({
                variant: "destructive",
                title: "An Error Occurred",
                description: "Failed to process audio. Check your console for details. You may need to set your API key.",
              });
          } finally {
              setProcessingSpeaker(null);
          }
      },
      [patientLang, doctorLang, conversation, toast]
    );
  
    const recorderPatient = useAudioRecorder((blob) => handleAudioProcessing(blob, "Patient"));
    const recorderDoctor = useAudioRecorder((blob) => handleAudioProcessing(blob, "Doctor"));
    const recorderInstructions = useAudioRecorder(async (blob) => {
        setIsRecordingCustomInstruction(true);
        try {
            const audioDataUri = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            });
            const transcriptionResult = await speechToTextTranscription({
                audioDataUri,
                modelId: 'scribe_v1',
                languageCode: doctorLang, // Assuming doctor records instructions in their language
            });
            
            const customInstruction = transcriptionResult.transcription;
             setCustomInstructionText(prev => `${prev}\n${customInstruction}`.trim());
            toast({ title: "Custom Instruction Recorded", description: "Your voice note has been transcribed and added." });

        } catch (error) {
            console.error("Instruction Recording Error:", error);
            toast({ variant: "destructive", title: "Instruction Recording Error" });
        } finally {
            setIsRecordingCustomInstruction(false);
        }
    });

    const swapLanguages = () => {
        setPatientLang(doctorLang);
        setDoctorLang(patientLang);
    };

    const handlePlayAudio = async (text: string, messageId: number, langCode: string) => {
        if (playingMessageId === messageId && audioPlayer) {
            audioPlayer.pause();
            setPlayingMessageId(null);
            return;
        }

        if (audioPlayer) {
            audioPlayer.pause();
        }

        setAudioLoadingMessageId(messageId);
        try {
            const result = await textToSpeech({ text, modelId: 'eleven_multilingual_v2'});
            const newAudio = new Audio(result.audioDataUri);
            setAudioPlayer(newAudio);
            setPlayingMessageId(messageId);
            newAudio.play();
            newAudio.onended = () => {
                setPlayingMessageId(null);
            };
        } catch (error) {
            console.error("TTS Error:", error);
            toast({
                variant: "destructive",
                title: "Text-to-Speech Error",
                description: "Could not play audio. Please check your API key and console.",
            });
        } finally {
            setAudioLoadingMessageId(null);
        }
    };

    const handlePlayInstructions = () => {
        if (!generatedInstructions) return;

        if (isPlayingInstructions && instructionAudioPlayer) {
            instructionAudioPlayer.pause();
            setIsPlayingInstructions(false);
            return;
        }

        if (instructionAudioPlayer) {
            instructionAudioPlayer.pause();
        }
        
        const newAudio = new Audio(generatedInstructions.audioDataUri);
        setInstructionAudioPlayer(newAudio);
        setIsPlayingInstructions(true);
        newAudio.play();
        newAudio.onended = () => {
            setIsPlayingInstructions(false);
        };
    };

    const handleGenerateSoapNote = async () => {
        if (conversation.length === 0) {
            toast({
                title: "Cannot Generate SOAP Note",
                description: "There is no conversation to generate a note from.",
            });
            return;
        }
        setIsGeneratingSoapNote(true);
        try {
            const conversationText = conversation.map(m => `${m.speaker}: ${m.originalText}`).join('\n');
            const result = await generateSoapNote({ conversation: conversationText });
            setSoapNote(result);
        } catch (error) {
            console.error("SOAP Note Generation Error:", error);
            toast({
                variant: "destructive",
                title: "SOAP Note Generation Error",
                description: "Could not generate SOAP note. Please check the console.",
            });
        } finally {
            setIsGeneratingSoapNote(false);
        }
    };
    
    const handleClarifyAndGenerateInstructions = async () => {
        if (!customInstructionText.trim()) {
            toast({ title: "No instructions provided", description: "Please type or record an instruction to send." });
            return;
        }
        setIsProcessingInstructions(true);
        setGeneratedInstructions(null);
        try {
            const result = await clarifyAndGenerateInstructions({
                customInstruction: customInstructionText,
                patientLanguage: instructionLanguage,
            });
            setGeneratedInstructions(result);
            toast({ title: "Instructions Processed", description: "Instructions have been clarified and audio has been generated." });
        } catch (error) {
             console.error("Instruction Processing Error:", error);
            toast({ variant: "destructive", title: "Instruction Processing Error" });
        } finally {
            setIsProcessingInstructions(false);
        }
    };

    const handleSoapNoteChange = (field: keyof GenerateSoapNoteOutput, value: string) => {
        if (soapNote) {
            setSoapNote({ ...soapNote, [field]: value });
        }
    };

    const handleSaveSoapNote = () => {
        // Placeholder for saving functionality
        toast({
            title: "Note Saved",
            description: "The SOAP note has been saved successfully.",
        });
        console.log("Saving SOAP Note:", soapNote);
    };

    const handleSendInstructions = async () => {
        if (!generatedInstructions) {
            toast({ title: "No instructions to send", description: "Please generate instructions first." });
            return;
        }
        setIsSendingInstructions(true);
        try {
            await sendWhatsAppMessage({
                to: whatsAppNumber,
                text: generatedInstructions.clarifiedText,
                audioDataUri: generatedInstructions.audioDataUri,
            });
            toast({
                title: "Instructions Sent",
                description: `Text and audio sent to ${whatsAppNumber}.`,
            });
        } catch (error) {
            console.error("WhatsApp Sending Error:", error);
            toast({
                variant: "destructive",
                title: "WhatsApp Sending Error",
                description: "Could not send instructions. Check console and API keys.",
            });
        } finally {
            setIsSendingInstructions(false);
        }
    };


    const conversationStarted = conversation.length > 0;

    const renderConversation = (perspective: Speaker) => (
        <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4">
                {conversation.map((msg) => {
                    const isPerspectiveSpeaker = msg.speaker === perspective;
                    const textToShow = isPerspectiveSpeaker ? msg.originalText : msg.translatedText;
                    const bubbleAlignment = isPerspectiveSpeaker ? "items-end" : "items-start";
                    const bubbleColor = isPerspectiveSpeaker ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
                    const langCode = isPerspectiveSpeaker ? (perspective === 'Patient' ? patientLang : doctorLang) : (perspective === 'Patient' ? doctorLang : patientLang);
                    
                    const isPlaying = playingMessageId === msg.id;
                    const isLoadingAudio = audioLoadingMessageId === msg.id;

                    return (
                        <div key={msg.id} className={`flex flex-col gap-1 ${bubbleAlignment}`}>
                            <div className="font-semibold text-sm">
                                {msg.speaker}
                            </div>
                            <div className={`flex gap-2 items-end ${isPerspectiveSpeaker ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`p-3 rounded-lg shadow-md max-w-[80%] ${bubbleColor}`}>
                                    <p>{textToShow}</p>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handlePlayAudio(textToShow, msg.id, langCode)}
                                                disabled={isLoadingAudio}
                                            >
                                                {isLoadingAudio ? (
                                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                                ) : isPlaying ? (
                                                    <Square className="w-4 h-4" />
                                                ) : (
                                                    <Play className="w-4 h-4" />
                                                )}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{isPlaying ? "Stop" : "Play"}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                        </div>
                    );
                })}
                <div ref={conversationEndRef} />
            </div>
        </ScrollArea>
    );

    const renderSpeakerPanel = (
        speaker: Speaker,
        lang: string,
        setLang: (lang: string) => void,
        recorder: { isRecording: boolean; toggleRecording: () => void; }
    ) => {
        const isRecording = recorder.isRecording;
        const isProcessing = processingSpeaker === speaker;
        const otherRecorder = speaker === 'Patient' ? recorderDoctor : recorderPatient;
        const buttonDisabled = !!processingSpeaker || otherRecorder.isRecording;

        return (
            <Card className="flex flex-col h-full overflow-hidden w-full">
                <CardHeader className="flex-row items-center justify-between border-b">
                    <h3 className="font-semibold">
                        {speaker}
                    </h3>
                    <Select value={lang} onValueChange={setLang} disabled={conversationStarted}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            {languages.map((l) => (
                                <SelectItem key={l.code} value={l.code}>
                                    {l.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardHeader>
                <CardContent className="flex-grow p-0 min-h-[300px] bg-muted/20">
                    {renderConversation(speaker)}
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <TooltipProvider delayDuration={100}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    size="lg"
                                    className="w-full transition-all"
                                    onClick={recorder.toggleRecording}
                                    disabled={buttonDisabled}
                                    variant={isRecording ? "destructive" : "default"}
                                >
                                    {isProcessing ? (
                                        <LoaderCircle className="w-6 h-6 animate-spin" />
                                    ) : isRecording ? (
                                        <MicOff className="w-6 h-6" />
                                    ) : (
                                        <Mic className="w-6 h-6" />
                                    )}
                                    <span className="ml-2 font-medium">
                                        {isProcessing ? "Processing..." : isRecording ? `Stop (${speaker})` : `Record (${speaker})`}
                                    </span>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{buttonDisabled ? "Wait for other speaker or processing to finish" : isRecording ? "Click to stop recording" : "Click to start recording"}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardFooter>
            </Card>
        );
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={patientData.avatar} data-ai-hint="woman" alt={patientData.name} />
                        <AvatarFallback>{patientData.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold">{patientData.name}</h2>
                        <p className="text-muted-foreground">New Encounter Session</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{languages.find(l => l.code === patientLang)?.name}</Badge>
                            <span className="text-sm text-muted-foreground">{patientData.phone}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="translation">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="translation"><Languages className="mr-2 h-4 w-4" /> Translation</TabsTrigger>
                    <TabsTrigger value="soap"><FileText className="mr-2 h-4 w-4" /> SOAP Notes</TabsTrigger>
                    <TabsTrigger value="instructions"><Send className="mr-2 h-4 w-4" /> Instructions</TabsTrigger>
                </TabsList>
                <TabsContent value="translation">
                    <Card>
                        <CardHeader>
                            <h3 className="text-lg font-semibold">Real-Time Voice Translation</h3>
                            <p className="text-sm text-muted-foreground">Translate patient's language to doctor's language in real-time.</p>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row items-center gap-4">
                            {renderSpeakerPanel("Patient", patientLang, setPatientLang, recorderPatient)}
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" onClick={swapLanguages} disabled={conversationStarted}>
                                            <ArrowRightLeft className="w-5 h-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Swap Languages</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {renderSpeakerPanel("Doctor", doctorLang, setDoctorLang, recorderDoctor)}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="soap">
                    <Card>
                        <CardHeader>
                            <CardTitle>SOAP Notes</CardTitle>
                            <CardDescription>Generate a SOAP note from the conversation and edit it before saving.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button onClick={handleGenerateSoapNote} disabled={isGeneratingSoapNote || conversation.length === 0}>
                                {isGeneratingSoapNote ? (
                                    <LoaderCircle className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Sparkles className="w-4 h-4" />
                                )}
                                <span>{isGeneratingSoapNote ? 'Generating...' : 'Generate SOAP Note'}</span>
                            </Button>

                            {isGeneratingSoapNote && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Subjective</Label>
                                        <div className="w-full h-24 bg-muted rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Objective</Label>
                                        <div className="w-full h-24 bg-muted rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Assessment</Label>
                                        <div className="w-full h-24 bg-muted rounded-md animate-pulse"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Plan</Label>
                                        <div className="w-full h-24 bg-muted rounded-md animate-pulse"></div>
                                    </div>
                                </div>
                            )}
                            
                            {soapNote && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="soap-subjective">Subjective</Label>
                                        <Textarea id="soap-subjective" value={soapNote.subjective} onChange={(e) => handleSoapNoteChange('subjective', e.target.value)} rows={4} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="soap-objective">Objective</Label>
                                        <Textarea id="soap-objective" value={soapNote.objective} onChange={(e) => handleSoapNoteChange('objective', e.target.value)} rows={4} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="soap-assessment">Assessment</Label>
                                        <Textarea id="soap-assessment" value={soapNote.assessment} onChange={(e) => handleSoapNoteChange('assessment', e.target.value)} rows={4} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="soap-plan">Plan</Label>
                                        <Textarea id="soap-plan" value={soapNote.plan} onChange={(e) => handleSoapNoteChange('plan', e.target.value)} rows={4} />
                                    </div>
                                </div>
                            )}
                        </CardContent>
                         {soapNote && (
                            <CardFooter>
                                <Button onClick={handleSaveSoapNote}>
                                    <Save className="mr-2 h-4 w-4" /> Save Note
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>
                <TabsContent value="instructions">
                <Card>
                        <CardHeader>
                            <CardTitle>Send Patient Instructions</CardTitle>
                            <CardDescription>
                                Type or record a custom message for the patient. The message will be clarified, translated, and sent via WhatsApp as both text and a voice note.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Label className="font-semibold">1. Create Your Message</Label>
                                    <Textarea
                                        placeholder="Type custom instructions here..."
                                        value={customInstructionText}
                                        onChange={(e) => setCustomInstructionText(e.target.value)}
                                        rows={4}
                                        disabled={isProcessingInstructions || isSendingInstructions || recorderInstructions.isRecording}
                                    />
                                    <Button
                                        onClick={recorderInstructions.toggleRecording}
                                        variant={recorderInstructions.isRecording ? "destructive" : "outline"}
                                        disabled={isProcessingInstructions || isSendingInstructions}
                                    >
                                        {isRecordingCustomInstruction ? (
                                            <LoaderCircle className="w-4 h-4 animate-spin" />
                                        ) : recorderInstructions.isRecording ? (
                                            <MicOff className="w-4 h-4" />
                                        ) : (
                                            <Mic className="w-4 h-4" />
                                        )}
                                        <span className="ml-2">
                                            {recorderInstructions.isRecording
                                                ? "Stop Recording"
                                                : "Record Instruction"}
                                        </span>
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                     <Label className="font-semibold">2. Select Language &amp; Generate</Label>
                                    <p className="text-sm text-muted-foreground">
                                       Choose the patient's language, then generate a clear, translated voice note.
                                    </p>
                                    <Select value={instructionLanguage} onValueChange={setInstructionLanguage} disabled={isProcessingInstructions || isSendingInstructions}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select patient's language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {languages.map((l) => (
                                                <SelectItem key={l.code} value={l.code}>
                                                    {l.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                     <Button onClick={handleClarifyAndGenerateInstructions} disabled={isProcessingInstructions || !customInstructionText.trim() || isSendingInstructions}>
                                        {isProcessingInstructions ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                        <span className="ml-2">{isProcessingInstructions ? 'Generating...' : 'Clarify &amp; Generate'}</span>
                                    </Button>
                                </div>
                             </div>


                            {(isProcessingInstructions || isSendingInstructions) && !generatedInstructions && (
                                <div className="space-y-2 pt-4">
                                     <Label>Generated Instructions</Label>
                                    <div className="w-full h-24 bg-muted rounded-md animate-pulse"></div>
                                </div>
                            )}

                            {generatedInstructions && (
                                <div className="space-y-4 rounded-md border p-4">
                                    <Label className="font-semibold">Generated Instructions (Language: {languages.find(l => l.code === instructionLanguage)?.name})</Label>
                                    <p className="text-sm">{generatedInstructions.clarifiedText}</p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            onClick={handlePlayInstructions}
                                            disabled={!generatedInstructions.audioDataUri || isSendingInstructions}
                                        >
                                            {isPlayingInstructions ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                        </Button>
                                        <span className="text-sm text-muted-foreground">Play voice note</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        {generatedInstructions && (
                            <CardFooter className="flex-col items-start gap-4">
                                <div className="w-full space-y-2">
                                    <Label htmlFor="whatsapp-number">3. Send to Patient</Label>
                                    <Input id="whatsapp-number" value={whatsAppNumber} onChange={(e) => setWhatsAppNumber(e.target.value)} disabled={isSendingInstructions} />
                                </div>
                                <Button onClick={handleSendInstructions} size="lg" disabled={isSendingInstructions}>
                                    {isSendingInstructions ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    <span className="ml-2">{isSendingInstructions ? 'Sending...' : 'Send to WhatsApp'}</span>
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

    