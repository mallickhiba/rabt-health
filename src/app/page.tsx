
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowRightLeft,
  LoaderCircle,
  Mic,
  MicOff,
  User,
  Play,
  Square,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { speechToTextTranscription } from "@/ai/flows/speech-to-text-transcription";
import { contextAwareTranslation } from "@/ai/flows/context-aware-translation";
import { textToSpeech } from "@/ai/flows/text-to-speech";
import { languages } from "@/lib/languages";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Speaker = "A" | "B";
type Message = {
  id: number;
  speaker: Speaker;
  originalText: string;
  translatedText: string;
};

export default function LinguaBridgePage() {
    const { toast } = useToast();
    const [langA, setLangA] = useState("eng");
    const [langB, setLangB] = useState("urd");
    const [conversation, setConversation] = useState<Message[]>([]);
    const [processingSpeaker, setProcessingSpeaker] = useState<Speaker | null>(null);
    const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
    const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
    const [audioLoadingMessageId, setAudioLoadingMessageId] = useState<number | null>(null);

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
        // Cleanup audio player on component unmount
        return () => {
            if (audioPlayer) {
                audioPlayer.pause();
                setAudioPlayer(null);
            }
        };
    }, [audioPlayer]);


    const handleAudioProcessing = useCallback(
    async (blob: Blob, speaker: Speaker) => {
        setProcessingSpeaker(speaker);

        try {
            const audioDataUri = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            const sourceLang = speaker === "A" ? langA : langB;
            const targetLang = speaker === "A" ? langB : langA;
            
            const transcriptionResult = await speechToTextTranscription({
              audioDataUri,
              modelId: 'scribe_v1',
              languageCode: sourceLang,
              useMultiChannel: false,
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

            const prevContext = conversation.slice(-3).map(m => `${m.speaker === 'A' ? 'Person A' : 'Person B'}: ${m.originalText}`).join('\n');
            
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
    [langA, langB, conversation, toast]
  );
  
    const recorderA = useAudioRecorder((blob) => handleAudioProcessing(blob, "A"));
    const recorderB = useAudioRecorder((blob) => handleAudioProcessing(blob, "B"));

    const swapLanguages = () => {
        setLangA(langB);
        setLangB(langA);
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


    const conversationStarted = conversation.length > 0;

    const renderConversation = (perspective: Speaker) => (
        <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-4">
                {conversation.map((msg) => {
                    const isPerspectiveSpeaker = msg.speaker === perspective;
                    const textToShow = isPerspectiveSpeaker ? msg.originalText : msg.translatedText;
                    const bubbleAlignment = isPerspectiveSpeaker ? "flex-row-reverse" : "flex-row";
                    const bubbleColor = isPerspectiveSpeaker ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground";
                    
                    const langCode = isPerspectiveSpeaker ? (perspective === 'A' ? langA : langB) : (perspective === 'A' ? langB : langA);

                    const isPlaying = playingMessageId === msg.id;
                    const isLoadingAudio = audioLoadingMessageId === msg.id;

                    return (
                        <div key={msg.id} className={`flex gap-3 ${bubbleAlignment} items-end`}>
                            <Avatar className="self-start">
                                <AvatarFallback>{msg.speaker}</AvatarFallback>
                            </Avatar>
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
        const otherIsRecording = speaker === 'A' ? recorderB.isRecording : recorderA.isRecording;
        const buttonDisabled = !!processingSpeaker || otherIsRecording;

        return (
            <Card className="flex flex-col h-full overflow-hidden">
                <CardHeader className="flex-row items-center justify-between border-b">
                    <CardTitle className="flex items-center gap-2 font-semibold">
                        <User className="w-5 h-5"/>
                        Speaker {speaker}
                    </CardTitle>
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
                <CardContent className="flex-grow p-0 min-h-0">
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
                                        {isProcessing ? "Processing..." : isRecording ? "Stop Recording" : "Start Recording"}
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
        <div className="flex flex-col h-screen p-4 md:p-6 lg:p-8 gap-4">
            <header className="text-center">
                <h1 className="text-4xl font-bold font-headline text-primary">LinguaBridge</h1>
                <p className="text-muted-foreground mt-1">Real-time Translation for Seamless Conversations</p>
            </header>

            <div className="flex-grow grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] md:items-center gap-4 min-h-0">
                {renderSpeakerPanel("A", langA, setLangA, recorderA)}
                
                <div className="hidden md:flex justify-center items-center">
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
                </div>

                {renderSpeakerPanel("B", langB, setLangB, recorderB)}
            </div>
        </div>
    );
}
