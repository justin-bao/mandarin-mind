import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Utensils, 
  Plane, 
  Briefcase, 
  GraduationCap, 
  Heart, 
  ShoppingBag,
  Coffee,
  Car,
  Home,
  Gamepad2
} from "lucide-react";

interface Topic {
  id: string;
  name: string;
  nameZh: string;
  icon: React.ReactNode;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
}

interface TopicSelectorProps {
  onTopicSelect: (topic: Topic) => void;
  selectedTopic?: Topic | null;
  isRecordingActive?: boolean;
}

const topics: Topic[] = [
  {
    id: 'dining',
    name: 'Dining',
    nameZh: '用餐',
    icon: <Utensils className="h-5 w-5" />,
    difficulty: 'Beginner',
    description: 'Order food, discuss preferences, restaurant conversations'
  },
  {
    id: 'travel',
    name: 'Travel',
    nameZh: '旅行',
    icon: <Plane className="h-5 w-5" />,
    difficulty: 'Intermediate',
    description: 'Directions, booking, cultural sites, transportation'
  },
  {
    id: 'business',
    name: 'Business',
    nameZh: '商务',
    icon: <Briefcase className="h-5 w-5" />,
    difficulty: 'Advanced',
    description: 'Meetings, negotiations, presentations, networking'
  },
  {
    id: 'education',
    name: 'Education',
    nameZh: '教育',
    icon: <GraduationCap className="h-5 w-5" />,
    difficulty: 'Intermediate',
    description: 'School, learning, academic discussions'
  },
  {
    id: 'family',
    name: 'Family',
    nameZh: '家庭',
    icon: <Heart className="h-5 w-5" />,
    difficulty: 'Beginner',
    description: 'Family members, relationships, home life'
  },
  {
    id: 'shopping',
    name: 'Shopping',
    nameZh: '购物',
    icon: <ShoppingBag className="h-5 w-5" />,
    difficulty: 'Beginner',
    description: 'Prices, sizes, payments, bargaining'
  },
  {
    id: 'hobbies',
    name: 'Hobbies',
    nameZh: '爱好',
    icon: <Gamepad2 className="h-5 w-5" />,
    difficulty: 'Intermediate',
    description: 'Sports, music, games, leisure activities'
  },
  {
    id: 'daily',
    name: 'Daily Life',
    nameZh: '日常生活',
    icon: <Coffee className="h-5 w-5" />,
    difficulty: 'Beginner',
    description: 'Weather, time, daily routines, basic needs'
  }
];

export default function TopicSelector({ onTopicSelect, selectedTopic, isRecordingActive = false }: TopicSelectorProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-chart-2 text-white';
      case 'Intermediate': return 'bg-chart-3 text-white';
      case 'Advanced': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Choose a Topic</h2>
        <p className="text-muted-foreground">Select a conversation topic to practice</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map((topic) => (
          <Card
            key={topic.id}
            className={`p-4 transition-all ${
              isRecordingActive 
                ? 'cursor-not-allowed opacity-50' 
                : 'cursor-pointer hover-elevate'
            } ${
              selectedTopic?.id === topic.id ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => {
              if (isRecordingActive) {
                console.log('Topic selection blocked: Recording in progress');
                return;
              }
              onTopicSelect(topic);
              console.log('Topic selected:', topic.name);
            }}
            data-testid={`card-topic-${topic.id}`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2 bg-primary/10 rounded-lg text-primary">
                {topic.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium">{topic.name}</h3>
                  <span className="font-chinese text-sm text-muted-foreground">{topic.nameZh}</span>
                </div>
                <Badge 
                  className={`text-xs mb-2 ${getDifficultyColor(topic.difficulty)}`}
                  data-testid={`badge-difficulty-${topic.id}`}
                >
                  {topic.difficulty}
                </Badge>
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
      
      {selectedTopic && (
        <div className="mt-6 text-center">
          <Button 
            size="lg"
            onClick={() => {
              console.log('Starting conversation with topic:', selectedTopic.name);
            }}
            data-testid="button-start-conversation"
          >
            Start Conversation
          </Button>
        </div>
      )}
    </div>
  );
}