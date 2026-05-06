import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import TopicSelector from "./TopicSelector";

describe("TopicSelector", () => {
  it("renders built-in topics and calls back with the selected topic", async () => {
    const onTopicSelect = vi.fn();
    render(createElement(TopicSelector, { onTopicSelect }));

    await userEvent.click(screen.getByTestId("card-topic-dining"));

    expect(screen.getByText("Choose a Topic")).toBeInTheDocument();
    expect(onTopicSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "dining", name: "Dining", nameZh: "用餐", difficulty: "Beginner" })
    );
  });

  it("blocks topic selection while recording is active", async () => {
    const onTopicSelect = vi.fn();
    render(createElement(TopicSelector, { onTopicSelect, isRecordingActive: true }));

    await userEvent.click(screen.getByTestId("card-topic-dining"));

    expect(onTopicSelect).not.toHaveBeenCalled();
  });
});
