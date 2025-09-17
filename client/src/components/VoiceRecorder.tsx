import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Square, Play, Pause } from "lucide-react";

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  className?: string;
}

export default function VoiceRecorder({ onRecordingComplete, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const startRecording = () => {
    console.log('Starting recording...');
    setIsRecording(true);
    setRecordingDuration(0);
    
    // Simulate recording duration
    const interval = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
    
    // Store interval for cleanup
    (window as any).recordingInterval = interval;
  };

  const stopRecording = () => {
    console.log('Stopping recording...');
    setIsRecording(false);
    setHasRecording(true);
    
    if ((window as any).recordingInterval) {
      clearInterval((window as any).recordingInterval);
    }
    
    // Simulate audio blob
    const mockBlob = new Blob(['mock-audio'], { type: 'audio/wav' });
    onRecordingComplete?.(mockBlob);
  };

  const playRecording = () => {
    console.log('Playing recording...');
    setIsPlaying(true);
    setTimeout(() => setIsPlaying(false), recordingDuration * 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Button
            size="icon"
            variant={isRecording ? "destructive" : "default"}
            className="h-16 w-16 rounded-full"
            onClick={isRecording ? stopRecording : startRecording}
            data-testid="button-record-voice"
          >
            {isRecording ? (
              <Square className="h-8 w-8" />
            ) : (
              <Mic className="h-8 w-8" />
            )}
          </Button>
          
          {isRecording && (
            <div className="absolute -inset-2 rounded-full border-2 border-destructive animate-pulse" />
          )}
        </div>
        
        <div className="text-center">
          <div className="text-sm font-medium" data-testid="text-recording-status">
            {isRecording ? 'Recording...' : hasRecording ? 'Recording ready' : 'Tap to record'}
          </div>
          {(isRecording || hasRecording) && (
            <div className="text-xs text-muted-foreground mt-1" data-testid="text-recording-duration">
              {formatDuration(recordingDuration)}
            </div>
          )}
        </div>
        
        {hasRecording && !isRecording && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={playRecording}
              disabled={isPlaying}
              data-testid="button-play-recording"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? 'Playing' : 'Play'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setHasRecording(false);
                setRecordingDuration(0);
                console.log('Recording cleared');
              }}
              data-testid="button-clear-recording"
            >
              <MicOff className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}