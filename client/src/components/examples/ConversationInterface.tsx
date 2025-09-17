import ConversationInterface from '../ConversationInterface';

export default function ConversationInterfaceExample() {
  const mockTopic = {
    id: 'dining',
    name: 'Dining',
    nameZh: '用餐',
    difficulty: 'Beginner'
  };

  return (
    <div className="h-screen">
      <ConversationInterface 
        topic={mockTopic}
        onBack={() => console.log('Back pressed')}
      />
    </div>
  );
}