// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { chineseToPinyin, lookupPhrase, tokenizeSentence, translateSentence } from "./translation.js";

describe("translation utilities", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          responseData: { translatedText: "hello+" },
          quotaFinished: false,
        }),
      })
    );
  });

  it("converts Chinese text to pinyin with tone marks", () => {
    expect(chineseToPinyin("你好")).toBe("nǐ hǎo");
  });

  it("tokenizes Chinese text with per-character pinyin", () => {
    expect(tokenizeSentence("你好！")).toEqual([
      { char: "你", pinyin: "nǐ" },
      { char: "好", pinyin: "hǎo" },
      { char: "！", pinyin: "！" },
    ]);
  });

  it("looks up a phrase with local pinyin and remote translation", async () => {
    await expect(lookupPhrase("你好")).resolves.toEqual({ pinyin: "nǐ hǎo", english: "hello" });
  });

  it("returns annotated sentence data for Chinese-to-English", async () => {
    await expect(translateSentence("你好", "zh-en")).resolves.toMatchObject({
      chinese: "你好",
      translation: "hello",
      tokens: [
        { char: "你", pinyin: "nǐ" },
        { char: "好", pinyin: "hǎo" },
      ],
    });
  });
});
