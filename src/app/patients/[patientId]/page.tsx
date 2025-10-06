
'use client';

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowRightLeft,
  LoaderCircle,
  Mic,
  MicOff,
  Play,
  Square,
  FileText,
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
import { useUser, useDoc, useMemoFirebase, useFirestore } from "@/firebase";
import { doc, collection } from 'firebase/firestore';
import type { Patient } from '@/lib/types';
import { Skeleton } from "@/components/ui/skeleton";
import { setDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

type Speaker = "Patient" | "Doctor";
type Message = {
  id: number;
  speaker: Speaker;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
};

const doctorData = {
    name: "Dr. Ahmed",
    avatar: "https://picsum.photos/seed/doc/200/200",
    initials: "DA",
    language: "English",
    languageCode: "eng"
}

export default function PatientEncounterPage({ params: { patientId } }: { params: { patientId: string } }) {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const patientRef = useMemoFirebase(() => {
        if (!user || !firestore || !patientId) return null;
        return doc(firestore, `users/${user.uid}/patients/${patientId}`);
    }, [user, firestore, patientId]);
    
    const {data: patient, isLoading: isPatientLoading } = useDoc<Patient>(patientRef);

    const [patientLang, setPatientLang] = useState(patient?.language ?? "pus");
    const [doctorLang, setDoctorLang] = useState(doctorData.languageCode);
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
    const [whatsAppNumber, setWhatsAppNumber] = useState(patient?.phoneNumber ?? "");
    const [instructionLanguage, setInstructionLanguage] = useState(patient?.language ?? "pus");

    const conversationEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (patient) {
            setPatientLang(patient.language);
            setInstructionLanguage(patient.language);
            setWhatsAppNumber(patient.phoneNumber);
        }
    }, [patient]);

    const scrollToBottom = () => {
      conversationEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
      scrollToBottom();
    }, [conversation]);
    
    useEffect(() => {
        return () => {
            if (audioPlayer) audioPlayer.pause();
            if (instructionAudioPlayer) instructionAudioPlayer.pause();
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
                  sourceLang,
                  targetLang,
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

    const handlePlayAudio = async (text: string, messageId: number) => {
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
        if (!soapNote || !user || !firestore || !patient) return;
        const soapNotesCollection = collection(firestore, `users/${user.uid}/patients/${patient.id}/soap_notes`);
        
        addDocumentNonBlocking(soapNotesCollection, {
            ...soapNote,
            patientId: patient.id,
            userId: user.uid, // Add this line
            createdAt: new Date().toISOString(),
        });

        toast({
            title: "Note Saved",
            description: "The SOAP note has been saved successfully.",
        });
        console.log("Saving SOAP Note:", soapNote);
    };

    const handleSendInstructions = async () => {
        if (!generatedInstructions || !user || !firestore || !patient) {
            toast({ title: "No instructions to send", description: "Please generate instructions first." });
            return;
        }
        setIsSendingInstructions(true);
        try {
            await sendWhatsAppMessage({
                to: whatsAppNumber,
                text: generatedInstructions.clarifiedText,
                audioDataUri: generatedInstructions.audioDataUri,
                patientLanguage: instructionLanguage
            });

            const instructionsCollection = collection(firestore, `users/${user.uid}/patients/${patient.id}/instructions`);
            addDocumentNonBlocking(instructionsCollection, {
                patientId: patient.id,
                userId: user.uid, // Add this line
                text: generatedInstructions.clarifiedText,
                sentAt: new Date().toISOString(),
                method: 'WhatsApp',
            });


            toast({
                title: "Instructions Sent & Saved",
                description: `Message sent to ${whatsAppNumber}. Audio may take a moment.`,
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
    
    if (isPatientLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
            </div>
        )
    }

    if (!patient) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Card>
                    <CardHeader>
                        <CardTitle>Patient Not Found</CardTitle>
                        <CardDescription>
                            Could not find a patient with ID: {patientId}
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }
    
    const renderMessage = (msg: Message) => {
      const isPatient = msg.speaker === 'Patient';
      const bubbleAlignment = isPatient ? "items-start" : "items-end";
      const bubbleColor = isPatient ? "bg-muted" : "bg-primary text-primary-foreground";
      const corner = isPatient ? "rounded-bl-none" : "rounded-br-none";
      const avatarSrc = isPatient ? `https://picsum.photos/seed/${patient.id}/200/200` : doctorData.avatar;
      const avatarFallback = isPatient ? patient.name.charAt(0) : doctorData.initials;
      const speakerName = isPatient ? patient.name : doctorData.name;

      const isPlaying = playingMessageId === msg.id;
      const isLoadingAudio = audioLoadingMessageId === msg.id;

      return (
        <div key={msg.id} className={`flex gap-3 w-full ${isPatient ? 'flex-row' : 'flex-row-reverse'}`}>
          <Avatar className="h-10 w-10">
              <AvatarImage src={avatarSrc} alt={speakerName} />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
          </Avatar>
          <div className={`flex flex-col gap-1 w-full max-w-[80%] ${bubbleAlignment}`}>
            <div className="font-bold text-sm">
                {speakerName}
            </div>
            <div className={`p-3 rounded-lg shadow-md ${bubbleColor} ${corner}`}>
                <p className="font-semibold">{msg.translatedText}</p>
                <p className="text-sm opacity-80 mt-2 pt-2 border-t border-black/10">{msg.originalText}</p>
            </div>
            <div className="flex items-center gap-1">
              <TooltipProvider>
                  <Tooltip>
                      <TooltipTrigger asChild>
                          <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handlePlayAudio(msg.translatedText, msg.id)}
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
                          <p>{isPlaying ? "Stop" : "Play Translation"}</p>
                      </TooltipContent>
                  </Tooltip>
              </TooltipProvider>
              <span className="text-xs text-muted-foreground">
                  {languages.find(l => l.code === msg.targetLang)?.name}
              </span>
            </div>
          </div>
        </div>
      );
    }

    const renderSpeakerPanel = (
        speaker: Speaker,
        lang: string,
        setLang: (lang: string) => void,
        recorder: { isRecording: boolean; toggleRecording: () => void; },
        speakerData: {name: string; avatar: string; initials: string; languageCode: string}
    ) => {
        const isRecording = recorder.isRecording;
        const isProcessing = processingSpeaker === speaker;
        const otherRecorder = speaker === 'Patient' ? recorderDoctor : recorderPatient;
        const buttonDisabled = !!processingSpeaker || otherRecorder.isRecording;

        return (
            <div className="flex flex-col items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={speakerData.avatar} alt={speakerData.name}/>
                    <AvatarFallback>{speakerData.initials}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h3 className="font-bold text-lg">{speakerData.name}</h3>
                     <Select value={lang} onValueChange={setLang} disabled={conversationStarted}>
                        <SelectTrigger className="w-[180px] mt-2 bg-card">
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
                </div>
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                size="lg"
                                className={`w-24 h-24 rounded-full transition-all duration-300 ease-in-out shadow-lg flex flex-col items-center justify-center gap-1 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'} text-white`}
                                onClick={recorder.toggleRecording}
                                disabled={buttonDisabled}
                            >
                                {isProcessing ? (
                                    <LoaderCircle className="w-8 h-8 animate-spin" />
                                ) : isRecording ? (
                                    <MicOff className="w-8 h-8" />
                                ) : (
                                    <Mic className="w-8 h-8" />
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                           <p>{buttonDisabled ? "Wait for other speaker or processing to finish" : isRecording ? "Click to stop recording" : "Click to start recording"}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                 {isProcessing && <p className="text-sm text-muted-foreground animate-pulse">Translating...</p>}
            </div>
        );
    };
    
    const patientSpeakerData = {
        name: patient.name,
        avatar: `https://picsum.photos/seed/${patient.id}/200/200`,
        initials: patient.name.charAt(0),
        languageCode: patient.language,
    };

    const patientLanguageName = languages.find(l => l.code === patientLang)?.name ?? patientLang;

    return (
        <div className="flex flex-col gap-4 w-full">
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={`https://picsum.photos/seed/${patient.id}/200/200`} data-ai-hint="person" alt={patient.name} />
                        <AvatarFallback>{patient.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-2xl font-bold">{patient.name}</h2>
                        <p className="text-muted-foreground">New Encounter Session</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{patientLanguageName}</Badge>
                            <span className="text-sm text-muted-foreground">{patient.phoneNumber}</span>
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
                     <Card className="flex flex-col h-[600px]">
                        <CardHeader>
                            <CardTitle>Real-Time Translation</CardTitle>
                            <CardDescription>Record audio from the patient and doctor to see a real-time translated conversation.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow p-4 bg-muted/40 overflow-hidden">
                            <ScrollArea className="h-full">
                              <div className="p-4 space-y-6">
                                  {conversation.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                      <Languages className="w-12 h-12 mb-4" />
                                      <p className="font-semibold">Conversation is empty</p>
                                      <p className="text-sm">Use the microphone buttons below to start the translated conversation.</p>
                                    </div>
                                  )}
                                  {conversation.map(renderMessage)}
                                  <div ref={conversationEndRef} />
                              </div>
                            </ScrollArea>
                        </CardContent>
                        <CardFooter className="p-4 border-t bg-card flex justify-around items-start">
                            {renderSpeakerPanel("Patient", patientLang, setPatientLang, recorderPatient, patientSpeakerData)}
                            
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="mt-20" onClick={swapLanguages} disabled={conversationStarted}>
                                            <ArrowRightLeft className="w-5 h-5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Swap Languages</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            {renderSpeakerPanel("Doctor", doctorLang, setDoctorLang, recorderDoctor, doctorData)}
                        </CardFooter>
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
                                <span className="ml-2">{isGeneratingSoapNote ? 'Generating...' : 'Generate SOAP Note'}</span>
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
                                Type or record a custom message for the patient. The message will be clarified, translated, and sent via WhatsApp as text.
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
                                        disabled={isProcessingInstructions || isSendingInstructions || isRecordingCustomInstruction}
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

    

    

    
