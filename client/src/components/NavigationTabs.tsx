import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  GraduationCap, 
  Settings,
  Layers,
  Film,
} from "lucide-react";

interface NavigationTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface NavigationTabsProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

const tabs: NavigationTab[] = [
  {
    id: 'conversation',
    label: 'Conversation',
    icon: <MessageCircle className="h-5 w-5" />
  },
  {
    id: 'practice',
    label: 'Practice',
    icon: <GraduationCap className="h-5 w-5" />
  },
  {
    id: 'flashcards',
    label: 'Flashcards',
    icon: <Layers className="h-5 w-5" />
  },
  {
    id: 'media',
    label: 'Media',
    icon: <Film className="h-5 w-5" />
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />
  }
];

export default function NavigationTabs({ activeTab, onTabChange, className }: NavigationTabsProps) {

  return (
    <div className={`relative ${className}`}>
      {/* Bottom Navigation */}
      <div className="bg-card border-t border-border">
        <div className="flex items-center justify-around px-4 py-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                onTabChange(tab.id);
                console.log('Tab changed to:', tab.label);
              }}
              className="flex-col h-auto py-2 px-3 relative"
              data-testid={`tab-${tab.id}`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                    data-testid={`badge-${tab.id}`}
                  >
                    {tab.badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs mt-1">{tab.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}