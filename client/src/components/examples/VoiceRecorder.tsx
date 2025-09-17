import VoiceRecorder from '../VoiceRecorder';

export default function VoiceRecorderExample() {
  const handleRecordingComplete = (audioBlob: Blob) => {
    console.log('Recording completed:', audioBlob);
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <VoiceRecorder onRecordingComplete={handleRecordingComplete} />
    </div>
  );
}