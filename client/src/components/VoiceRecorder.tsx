import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Square, Play, Pause } from "lucide-react";
import { startAudioRecording, stopAudioRecording, playAudio } from "@/lib/api";

interface VoiceRecorderProps {
  onRecordingComplete?: (audioBlob: Blob) => void;
  className?: string;
}

export default function VoiceRecorder({ onRecordingComplete, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingBlobRef = useRef<Blob | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      console.log('Starting recording...');
      console.log('About to call startAudioRecording()');
      const mediaRecorder = await startAudioRecording();
      console.log('Got mediaRecorder:', mediaRecorder);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      // Set up data collection
      mediaRecorder.ondataavailable = (e) => {
        console.log('Data available:', e.data.size);
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      console.log('Setting isRecording to true');
      setIsRecording(true);
      setRecordingDuration(0);
      
      // Start duration counter
      intervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
      
      console.log('Starting mediaRecorder');
      mediaRecorder.start();
      console.log('MediaRecorder started successfully');
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to start recording. Please check your microphone permissions.');
    }
  };

  const stopRecording = async () => {
    console.log('stopRecording called, mediaRecorderRef.current:', mediaRecorderRef.current);
    if (!mediaRecorderRef.current) {
      console.log('No media recorder to stop');
      return;
    }
    
    try {
      console.log('Stopping recording...');
      const audioBlob = await stopAudioRecording(mediaRecorderRef.current, chunksRef.current);
      
      setIsRecording(false);
      setHasRecording(true);
      recordingBlobRef.current = audioBlob;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      onRecordingComplete?.(audioBlob);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setIsRecording(false);
    }
  };

  const playRecording = async () => {
    if (!recordingBlobRef.current) return;
    
    try {
      console.log('Playing recording...');
      setIsPlaying(true);
      const audioUrl = URL.createObjectURL(recordingBlobRef.current);
      await playAudio(audioUrl);
      URL.revokeObjectURL(audioUrl);
      setIsPlaying(false);
    } catch (error) {
      console.error('Failed to play recording:', error);
      setIsPlaying(false);
    }
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
            onClick={() => {
              console.log('Voice button pressed, isRecording:', isRecording);
              if (isRecording) {
                console.log('Calling stopRecording');
                stopRecording();
              } else {
                console.log('Calling startRecording');
                startRecording();
              }
            }}
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
                recordingBlobRef.current = null;
                chunksRef.current = [];
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