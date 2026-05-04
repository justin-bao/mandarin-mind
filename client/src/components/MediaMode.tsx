import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Image as ImageIcon,
  Film,
  Music,
  Trash2,
  Camera,
  Upload,
  Loader2,
  ChevronLeft,
  FileImage,
  FileVideo,
  FileAudio,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MediaItem } from "@shared/schema";
import ImageOCRViewer from "./ImageOCRViewer";
import MediaCaptionPlayer from "./MediaCaptionPlayer";

async function uploadImage(file: File): Promise<MediaItem> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/media/upload/image", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadVideo(file: File): Promise<MediaItem> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/media/upload/video", { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function deleteMedia(id: string): Promise<void> {
  const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
}

function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function TypeBadge({ type }: { type: MediaItem["type"] }) {
  if (type === "image") return <Badge variant="secondary" className="text-xs">Image</Badge>;
  if (type === "video") return <Badge variant="secondary" className="text-xs">Video</Badge>;
  return <Badge variant="secondary" className="text-xs">Audio</Badge>;
}

function TypeIcon({ type, className }: { type: MediaItem["type"]; className?: string }) {
  if (type === "image") return <FileImage className={className} />;
  if (type === "video") return <FileVideo className={className} />;
  return <FileAudio className={className} />;
}

export default function MediaMode() {
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const { data: items = [], isLoading } = useQuery<MediaItem[]>({
    queryKey: ["/api/media"],
    queryFn: async () => {
      const res = await fetch("/api/media");
      if (!res.ok) throw new Error("Failed to fetch media");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({ description: "Media item deleted" });
      setDeleteTarget(null);
    },
    onError: () => toast({ description: "Failed to delete item", variant: "destructive" }),
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingImage(true);
    try {
      const item = await uploadImage(file);
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({ description: "Image scanned successfully" });
      setSelectedItem(item);
    } catch {
      toast({ description: "Failed to process image", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setUploadingVideo(true);
    try {
      const item = await uploadVideo(file);
      queryClient.invalidateQueries({ queryKey: ["/api/media"] });
      toast({ description: "Captions generated successfully" });
      setSelectedItem(item);
    } catch {
      toast({ description: "Failed to process media file", variant: "destructive" });
    } finally {
      setUploadingVideo(false);
    }
  };

  // ─── Viewer ────────────────────────────────────────────────────────────────
  if (selectedItem) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 p-4 border-b">
          <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <TypeIcon type={selectedItem.type} className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{selectedItem.originalName}</span>
            <TypeBadge type={selectedItem.type} />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {selectedItem.type === "image" ? (
            <ImageOCRViewer mediaItem={selectedItem} />
          ) : (
            <MediaCaptionPlayer mediaItem={selectedItem} />
          )}
        </div>
      </div>
    );
  }

  // ─── History + upload screen ───────────────────────────────────────────────
  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Media</h1>

      {/* Upload buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={uploadingImage}
          onClick={() => imageInputRef.current?.click()}
          className="flex flex-col items-center gap-2 p-5 rounded-lg border-2 border-dashed border-border hover-elevate bg-card text-center disabled:opacity-60"
        >
          {uploadingImage ? (
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          ) : (
            <Camera className="h-7 w-7 text-primary" />
          )}
          <span className="text-sm font-medium">
            {uploadingImage ? "Scanning…" : "Scan Image"}
          </span>
          <span className="text-xs text-muted-foreground">JPG, PNG, WEBP, GIF</span>
        </button>

        <button
          type="button"
          disabled={uploadingVideo}
          onClick={() => videoInputRef.current?.click()}
          className="flex flex-col items-center gap-2 p-5 rounded-lg border-2 border-dashed border-border hover-elevate bg-card text-center disabled:opacity-60"
        >
          {uploadingVideo ? (
            <Loader2 className="h-7 w-7 text-primary animate-spin" />
          ) : (
            <Upload className="h-7 w-7 text-primary" />
          )}
          <span className="text-sm font-medium">
            {uploadingVideo ? "Processing…" : "Upload Video / Audio"}
          </span>
          <span className="text-xs text-muted-foreground">MP4, MP3, WAV, MOV…</span>
        </button>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*,audio/*"
        className="hidden"
        onChange={handleVideoChange}
      />

      {/* History list */}
      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          History
        </h2>

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No media uploaded yet</p>
            <p className="text-xs mt-1">Scan an image or upload a video to get started</p>
          </div>
        )}

        {!isLoading && items.map((item) => (
          <Card
            key={item.id}
            className="cursor-pointer hover-elevate"
            onClick={() => setSelectedItem(item)}
          >
            <CardContent className="flex items-center gap-3 p-3">
              {/* Thumbnail or icon */}
              <div className="h-12 w-12 flex-shrink-0 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                {item.type === "image" ? (
                  <img
                    src={item.fileUrl}
                    alt={item.originalName}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : item.type === "video" ? (
                  <Film className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Music className="h-6 w-6 text-muted-foreground" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.originalName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <TypeBadge type={item.type} />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(item.uploadedAt)}
                  </span>
                  {item.type === "image" && item.ocrBlocks && (
                    <span className="text-xs text-muted-foreground">
                      {item.ocrBlocks.length} text blocks
                    </span>
                  )}
                  {(item.type === "video" || item.type === "audio") && item.captions && (
                    <span className="text-xs text-muted-foreground">
                      {item.captions.length} captions
                    </span>
                  )}
                </div>
              </div>

              {/* Delete */}
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(item);
                }}
              >
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete media item?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.originalName}" and all its extracted data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
