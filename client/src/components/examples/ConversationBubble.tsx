import ConversationBubble from '../ConversationBubble';

export default function ConversationBubbleExample() {
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <ConversationBubble
        text="你好，今天天气怎么样？"
        pinyin="Nǐ hǎo, jīntiān tiānqì zěnme yàng?"
        translation="Hello, how's the weather today?"
        isUser={false}
        timestamp="10:30 AM"
      />
      <ConversationBubble
        text="今天天气很好！"
        pinyin="Jīntiān tiānqì hěn hǎo!"
        translation="The weather is great today!"
        isUser={true}
        timestamp="10:31 AM"
      />
    </div>
  );
}