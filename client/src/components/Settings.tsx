import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import {
  Volume2,
  Globe,
  Palette,
  Bell,
  Download,
  Trash2,
  Info,
  LogOut,
  User,
} from "lucide-react";

type AuthUser = { id: string; email: string; createdAt: string | null };

interface SettingsProps {
  user: AuthUser;
}

export default function Settings({ user }: SettingsProps) {
  const { toast } = useToast();
  const [autoPlayAudio, setAutoPlayAudio] = useState(true);
  const [showPinyin, setShowPinyin] = useState(true);
  const [voiceSpeed, setVoiceSpeed] = useState("normal");
  const [notifications, setNotifications] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      toast({ title: "Logout failed", variant: "destructive" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Settings</h2>
        <p className="text-muted-foreground">Customize your learning experience</p>
      </div>

      {/* Account */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5" />
          <Label className="text-base font-medium">Account</Label>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-sm font-medium">{user.email}</p>
              <p className="text-xs text-muted-foreground">
                Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "recently"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {logoutMutation.isPending ? "Signing out…" : "Sign Out"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Audio Settings */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Volume2 className="h-5 w-5" />
          <Label className="text-base font-medium">Audio Settings</Label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Auto-play AI responses</Label>
              <p className="text-sm text-muted-foreground">Automatically play audio for AI messages</p>
            </div>
            <Switch
              checked={autoPlayAudio}
              onCheckedChange={setAutoPlayAudio}
              data-testid="switch-autoplay"
            />
          </div>

          <div className="space-y-2">
            <Label>Voice Speed</Label>
            <Select value={voiceSpeed} onValueChange={setVoiceSpeed}>
              <SelectTrigger data-testid="select-voice-speed">
                <SelectValue placeholder="Select speed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="slow">Slow</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="fast">Fast</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Display Settings */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5" />
          <Label className="text-base font-medium">Display Settings</Label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Show Pinyin</Label>
              <p className="text-sm text-muted-foreground">Display pinyin for Chinese characters</p>
            </div>
            <Switch
              checked={showPinyin}
              onCheckedChange={setShowPinyin}
              data-testid="switch-pinyin"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </Card>

      {/* Learning Settings */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5" />
          <Label className="text-base font-medium">Learning Settings</Label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label>Practice Reminders</Label>
              <p className="text-sm text-muted-foreground">Get notifications to practice regularly</p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={setNotifications}
              data-testid="switch-notifications"
            />
          </div>
        </div>
      </Card>

      {/* Data Management */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="h-5 w-5" />
          <Label className="text-base font-medium">Data Management</Label>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() => console.log("Exporting conversations")}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Conversations
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => console.log("Clear all data")}
            data-testid="button-clear-data"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>
        </div>
      </Card>

      {/* About */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-5 w-5" />
          <Label className="text-base font-medium">About</Label>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Version</span>
            <Badge variant="secondary">1.0.0</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Build</span>
            <Badge variant="secondary">2026.05.05</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
