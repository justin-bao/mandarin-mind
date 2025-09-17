import { useState } from 'react';
import TopicSelector from '../TopicSelector';

export default function TopicSelectorExample() {
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <TopicSelector 
        onTopicSelect={setSelectedTopic}
        selectedTopic={selectedTopic}
      />
    </div>
  );
}