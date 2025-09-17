import WordPractice from '../WordPractice';

export default function WordPracticeExample() {
  const handleStartPractice = (words: any[]) => {
    console.log('Starting practice with words:', words);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <WordPractice onStartPractice={handleStartPractice} />
    </div>
  );
}