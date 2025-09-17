import ConversationHistory from '../ConversationHistory';

export default function ConversationHistoryExample() {
  const handleConversationSelect = (conversation: any) => {
    console.log('Selected conversation:', conversation);
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <ConversationHistory onConversationSelect={handleConversationSelect} />
    </div>
  );
}