import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { MessageCircle, GraduationCap, Settings, Layers, Film, Languages, CheckCircle2 } from "lucide-react";

const navItems = [
  { id: "conversation", label: "Talk", icon: MessageCircle },
  { id: "practice", label: "My Phrases", icon: GraduationCap },
  { id: "grammar", label: "Grammar", icon: CheckCircle2 },
  { id: "flashcards", label: "Flashcards", icon: Layers },
  { id: "media", label: "Media", icon: Film },
  { id: "settings", label: "Settings", icon: Settings },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  const handleNavChange = (tabId: string) => {
    onTabChange(tabId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Languages className="h-4 w-4 text-primary" />
          </div>
          <span className="font-bold text-base">MandarinMind</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activeTab === item.id}
                    onClick={() => handleNavChange(item.id)}
                    data-testid={`sidebar-tab-${item.id}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
