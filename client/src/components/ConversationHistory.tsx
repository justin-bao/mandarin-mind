import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Calendar,
  MessageCircle,
  Clock,
  ChevronRight,
  Filter
} from "lucide-react";

interface Conversation {
  id: string;
  topic: string;
  topicZh: string;
  date: string;
  duration: string;
  messageCount: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  preview: string;
  previewZh: string;
}

interface ConversationHistoryProps {
  onConversationSelect?: (conversation: Conversation) => void;
}

// Todo: Remove mock data
const mockConversations: Conversation[] = [
  {
    id: '1',
    topic: 'Dining Experience',
    topicZh: '用餐体验',
    date: '2024-01-15',
    duration: '12:30',
    messageCount: 24,
    difficulty: 'Beginner',
    preview: 'Discussing favorite restaurants and ordering food',
    previewZh: '讨论最喜欢的餐厅和点菜'
  },
  {
    id: '2', 
    topic: 'Travel Planning',
    topicZh: '旅行计划',
    date: '2024-01-14',
    duration: '08:45',
    messageCount: 18,
    difficulty: 'Intermediate',
    preview: 'Planning a trip to Beijing, discussing transportation',
    previewZh: '计划去北京的旅行，讨论交通'
  },
  {
    id: '3',
    topic: 'Business Meeting',
    topicZh: '商务会议',
    date: '2024-01-12',
    duration: '15:20',
    messageCount: 32,
    difficulty: 'Advanced',
    preview: 'Negotiating contract terms and project timelines',
    previewZh: '协商合同条款和项目时间表'
  },
  {
    id: '4',
    topic: 'Family Life',
    topicZh: '家庭生活',
    date: '2024-01-10',
    duration: '06:15',
    messageCount: 15,
    difficulty: 'Beginner',
    preview: 'Talking about family members and weekend activities',
    previewZh: '谈论家庭成员和周末活动'
  }
];

export default function ConversationHistory({ onConversationSelect }: ConversationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'Beginner' | 'Intermediate' | 'Advanced'>('all');

  const filteredConversations = mockConversations.filter(conv => {
    const matchesSearch = conv.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.topicZh.includes(searchTerm) ||
                         conv.preview.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = selectedFilter === 'all' || conv.difficulty === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-chart-2 text-white';
      case 'Intermediate': return 'bg-chart-3 text-white';  
      case 'Advanced': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Conversation History</h2>
          <p className="text-muted-foreground">Review and continue past conversations</p>
        </div>
        
        {/* Search and Filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-conversations"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              const filters = ['all', 'Beginner', 'Intermediate', 'Advanced'];
              const currentIndex = filters.indexOf(selectedFilter);
              const nextFilter = filters[(currentIndex + 1) % filters.length];
              setSelectedFilter(nextFilter as any);
              console.log('Filter changed to:', nextFilter);
            }}
            data-testid="button-filter-conversations"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        
        {selectedFilter !== 'all' && (
          <div className="flex justify-center">
            <Badge className={getDifficultyColor(selectedFilter)}>
              Showing: {selectedFilter}
            </Badge>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="space-y-3">
        {filteredConversations.length === 0 ? (
          <Card className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">No conversations found</h3>
            <p className="text-muted-foreground">Try adjusting your search or start a new conversation</p>
          </Card>
        ) : (
          filteredConversations.map((conversation) => (
            <Card
              key={conversation.id}
              className="p-4 cursor-pointer hover-elevate"
              onClick={() => {
                onConversationSelect?.(conversation);
                console.log('Conversation selected:', conversation.topic);
              }}
              data-testid={`card-conversation-${conversation.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium">{conversation.topic}</h3>
                    <span className="font-chinese text-sm text-muted-foreground">
                      {conversation.topicZh}
                    </span>
                    <Badge 
                      className={`text-xs ${getDifficultyColor(conversation.difficulty)}`}
                      data-testid={`badge-difficulty-${conversation.id}`}
                    >
                      {conversation.difficulty}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {conversation.preview}
                  </p>
                  <p className="font-chinese text-sm text-muted-foreground mb-3">
                    {conversation.previewZh}
                  </p>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(conversation.date)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {conversation.duration}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" />
                      {conversation.messageCount} messages
                    </div>
                  </div>
                </div>
                
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}