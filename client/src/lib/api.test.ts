import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationApi, phraseListsApi, startAudioRecording, stopAudioRecording } from "./api";

describe("frontend API helpers", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: "ok" }),
      })
    );
  });

  it("sends JSON requests with credentials for conversation creation", async () => {
    await conversationApi.create({ topic: "Dining", topicZh: "用餐", difficulty: "Beginner" });

    expect(fetch).toHaveBeenCalledWith("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: "Dining", topicZh: "用餐", difficulty: "Beginner" }),
      credentials: "include",
    });
  });

  it("uses the phrase list item endpoints", async () => {
    await phraseListsApi.addItem("list-1", { chinese: "你好", pinyin: "nǐ hǎo", english: "hello" });
    await phraseListsApi.deleteItem("list-1", "item-1");

    expect(fetch).toHaveBeenNthCalledWith(1, "/api/phrase-lists/list-1/items", expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/phrase-lists/list-1/items/item-1", expect.any(Object));
  });

  it("posts audio with FormData and included cookies", async () => {
    await conversationApi.sendAudio("conv-1", new Blob(["audio"], { type: "audio/webm" }));

    expect(fetch).toHaveBeenCalledWith("/api/conversations/conv-1/audio", {
      method: "POST",
      headers: {},
      body: expect.any(FormData),
      credentials: "include",
    });
  });

  it("starts and stops browser audio recording while releasing tracks", async () => {
    const stopTrack = vi.fn();
    const stream = { getTracks: () => [{ stop: stopTrack }] } as unknown as MediaStream;
    const recorder = {
      stream,
      stop: vi.fn(function (this: MediaRecorder) {
        this.onstop?.(new Event("stop"));
      }),
      onstop: null,
    } as unknown as MediaRecorder;
    const MediaRecorderMock = vi.fn(function MediaRecorderMock() {
      return recorder;
    });
    vi.stubGlobal("MediaRecorder", MediaRecorderMock);
    vi.stubGlobal("navigator", {
      mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
    });

    const started = await startAudioRecording();
    const blob = await stopAudioRecording(started, ["chunk"]);

    expect(MediaRecorderMock).toHaveBeenCalledWith(stream, { mimeType: "audio/webm;codecs=opus" });
    expect(blob.type).toBe("audio/webm;codecs=opus");
    expect(stopTrack).toHaveBeenCalled();
  });
});
