export type OfflineDictionaryEntry = {
  chinese: string;
  pinyin: string;
  english: string;
};

const entries: OfflineDictionaryEntry[] = [
  { chinese: "你好", pinyin: "nǐ hǎo", english: "hello" },
  { chinese: "你好吗", pinyin: "nǐ hǎo ma", english: "how are you?" },
  { chinese: "我很好", pinyin: "wǒ hěn hǎo", english: "I am fine" },
  { chinese: "谢谢", pinyin: "xiè xie", english: "thank you" },
  { chinese: "不客气", pinyin: "bù kè qi", english: "you are welcome" },
  { chinese: "对不起", pinyin: "duì bu qǐ", english: "I am sorry" },
  { chinese: "没关系", pinyin: "méi guān xi", english: "it is okay / no problem" },
  { chinese: "请问", pinyin: "qǐng wèn", english: "excuse me / may I ask" },
  { chinese: "再见", pinyin: "zài jiàn", english: "goodbye" },
  { chinese: "早上好", pinyin: "zǎo shang hǎo", english: "good morning" },
  { chinese: "晚安", pinyin: "wǎn ān", english: "good night" },
  { chinese: "我叫", pinyin: "wǒ jiào", english: "my name is" },
  { chinese: "你叫什么名字", pinyin: "nǐ jiào shén me míng zi", english: "what is your name?" },
  { chinese: "很高兴认识你", pinyin: "hěn gāo xìng rèn shi nǐ", english: "nice to meet you" },
  { chinese: "菜单", pinyin: "cài dān", english: "menu" },
  { chinese: "服务员", pinyin: "fú wù yuán", english: "waiter / waitress" },
  { chinese: "买单", pinyin: "mǎi dān", english: "the bill, please" },
  { chinese: "多少钱", pinyin: "duō shao qián", english: "how much does it cost?" },
  { chinese: "我要点菜", pinyin: "wǒ yào diǎn cài", english: "I would like to order" },
  { chinese: "不辣", pinyin: "bú là", english: "not spicy" },
  { chinese: "好吃", pinyin: "hǎo chī", english: "delicious" },
  { chinese: "一杯水", pinyin: "yì bēi shuǐ", english: "a glass of water" },
  { chinese: "火车站", pinyin: "huǒ chē zhàn", english: "train station" },
  { chinese: "地铁站", pinyin: "dì tiě zhàn", english: "subway station" },
  { chinese: "出租车", pinyin: "chū zū chē", english: "taxi" },
  { chinese: "飞机场", pinyin: "fēi jī chǎng", english: "airport" },
  { chinese: "去哪里", pinyin: "qù nǎ lǐ", english: "where are you going?" },
  { chinese: "怎么走", pinyin: "zěn me zǒu", english: "how do I get there?" },
  { chinese: "下一站", pinyin: "xià yí zhàn", english: "next stop" },
  { chinese: "我只是看看", pinyin: "wǒ zhǐ shì kàn kan", english: "I am just looking" },
  { chinese: "太贵了", pinyin: "tài guì le", english: "too expensive" },
  { chinese: "便宜一点", pinyin: "pián yi yì diǎn", english: "a bit cheaper, please" },
  { chinese: "可以试穿吗", pinyin: "kě yǐ shì chuān ma", english: "may I try it on?" },
  { chinese: "刷卡", pinyin: "shuā kǎ", english: "pay by card" },
  { chinese: "在哪里", pinyin: "zài nǎ lǐ", english: "where is it?" },
  { chinese: "厕所在哪里", pinyin: "cè suǒ zài nǎ lǐ", english: "where is the bathroom?" },
  { chinese: "我不懂", pinyin: "wǒ bù dǒng", english: "I do not understand" },
  { chinese: "请再说一遍", pinyin: "qǐng zài shuō yí biàn", english: "please say that again" },
  { chinese: "请说慢一点", pinyin: "qǐng shuō màn yì diǎn", english: "please speak more slowly" },
  { chinese: "我的中文不好", pinyin: "wǒ de zhōng wén bù hǎo", english: "my Chinese is not good" },
  { chinese: "帮我一下", pinyin: "bāng wǒ yí xià", english: "please help me" },
  { chinese: "我迷路了", pinyin: "wǒ mí lù le", english: "I am lost" },
  { chinese: "现在几点", pinyin: "xiàn zài jǐ diǎn", english: "what time is it now?" },
  { chinese: "今天几号", pinyin: "jīn tiān jǐ hào", english: "what date is today?" },
  { chinese: "明天", pinyin: "míng tiān", english: "tomorrow" },
  { chinese: "昨天", pinyin: "zuó tiān", english: "yesterday" }
];

const byChinese = new Map(entries.map((entry) => [entry.chinese, entry]));

export function lookupOfflinePhrase(chinese: string) {
  return byChinese.get(chinese.trim()) ?? null;
}
