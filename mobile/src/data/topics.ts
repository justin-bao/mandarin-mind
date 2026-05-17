import type { Topic } from "../types";

export const topics: Topic[] = [
  { id: "dining", name: "Dining", nameZh: "用餐", difficulty: "Beginner", description: "Order food, discuss preferences, and handle restaurant conversations.", icon: "restaurant-outline" },
  { id: "travel", name: "Travel", nameZh: "旅行", difficulty: "Intermediate", description: "Practice directions, booking, transportation, and cultural sites.", icon: "airplane-outline" },
  { id: "business", name: "Business", nameZh: "商务", difficulty: "Advanced", description: "Meetings, presentations, negotiations, and networking.", icon: "briefcase-outline" },
  { id: "education", name: "Education", nameZh: "教育", difficulty: "Intermediate", description: "School, learning, academic life, and classroom discussions.", icon: "school-outline" },
  { id: "family", name: "Family", nameZh: "家庭", difficulty: "Beginner", description: "Talk about relatives, relationships, home life, and plans.", icon: "heart-outline" },
  { id: "shopping", name: "Shopping", nameZh: "购物", difficulty: "Beginner", description: "Prices, sizes, payments, returns, and bargaining.", icon: "bag-handle-outline" },
  { id: "hobbies", name: "Hobbies", nameZh: "爱好", difficulty: "Intermediate", description: "Sports, music, games, leisure, and weekend plans.", icon: "game-controller-outline" },
  { id: "daily", name: "Daily Life", nameZh: "日常生活", difficulty: "Beginner", description: "Weather, time, routines, errands, and basic needs.", icon: "cafe-outline" }
];
