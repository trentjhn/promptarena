import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ScenarioCard } from "../components/ScenarioCard";
import { PromptEditor } from "../components/PromptEditor";
import { ResponseDisplay } from "../components/ResponseDisplay";
import { RubricDisplay } from "../components/RubricDisplay";
import { SolutionModal } from "../components/SolutionModal";
import { FeedbackDisplay } from "../components/FeedbackDisplay";
import type { Scenario } from "../types/scenario";
import type { GradeFeedback } from "../types/scenario";

const scenario: Scenario = {
  id: "test-scenario",
  number: 1,
  difficulty: "beginner",
  title: "Test Scenario Title",
  description: "A test description",
  task: "Write a prompt",
  rubric: [
    { criterion: "Clarity", description: "Is it clear?", points: 50 },
    { criterion: "Format", description: "Is it formatted?", points: 50 },
  ],
  expertPrompt: "Expert prompt text here",
  hints: ["Hint one", "Hint two"],
};

describe("ScenarioCard", () => {
  it("renders scenario title and difficulty", () => {
    render(
      <ScenarioCard
        scenario={scenario}
        isCompleted={false}
        isSelected={false}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("Test Scenario Title")).toBeInTheDocument();
    expect(screen.getByText("beginner")).toBeInTheDocument();
  });

  it("shows completed indicator when isCompleted is true", () => {
    render(
      <ScenarioCard
        scenario={scenario}
        isCompleted={true}
        isSelected={false}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("does not show completed indicator when not completed", () => {
    render(
      <ScenarioCard
        scenario={scenario}
        isCompleted={false}
        isSelected={false}
        onClick={vi.fn()}
      />
    );
    expect(screen.queryByText("Completed")).not.toBeInTheDocument();
  });
});

describe("PromptEditor", () => {
  it("disables submit button when textarea is empty", () => {
    render(
      <PromptEditor
        value=""
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );
    const button = screen.getByRole("button", {
      name: /submit prompt to claude/i,
    });
    expect(button).toBeDisabled();
  });

  it("enables submit button when textarea has content", () => {
    render(
      <PromptEditor
        value="a non-empty prompt"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />
    );
    const button = screen.getByRole("button", {
      name: /submit prompt to claude/i,
    });
    expect(button).not.toBeDisabled();
  });

  it("shows loading state and disables button when isLoading is true", () => {
    render(
      <PromptEditor
        value="some prompt"
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />
    );
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled();
  });
});

describe("ResponseDisplay", () => {
  it("displays response text and token count", () => {
    render(<ResponseDisplay response="Claude said hello" tokensUsed={123} />);
    expect(screen.getByText("Claude said hello")).toBeInTheDocument();
    expect(screen.getByText("123 tokens used")).toBeInTheDocument();
  });
});

describe("RubricDisplay", () => {
  it("does not show submit button before all criteria are graded", () => {
    render(<RubricDisplay scenario={scenario} onGrade={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /submit score/i })
    ).not.toBeInTheDocument();
  });

  it("shows submit button only after all criteria are graded", () => {
    render(<RubricDisplay scenario={scenario} onGrade={vi.fn()} />);

    // Grade both rubric items
    const passButtons = screen.getAllByRole("button", { name: /pass/i });
    fireEvent.click(passButtons[0]);
    fireEvent.click(passButtons[1]);

    expect(
      screen.getByRole("button", { name: /submit score/i })
    ).toBeInTheDocument();
  });

  it("calls onGrade with total score when submitted", () => {
    const onGrade = vi.fn();
    render(<RubricDisplay scenario={scenario} onGrade={onGrade} />);

    const passButtons = screen.getAllByRole("button", { name: /pass/i });
    fireEvent.click(passButtons[0]); // 50 pts
    fireEvent.click(passButtons[1]); // 50 pts

    fireEvent.click(screen.getByRole("button", { name: /submit score/i }));
    expect(onGrade).toHaveBeenCalledWith(100);
  });
});

describe("SolutionModal", () => {
  it("displays expert prompt and hints", () => {
    render(<SolutionModal scenario={scenario} onClose={vi.fn()} />);
    expect(screen.getByText("Expert prompt text here")).toBeInTheDocument();
    expect(screen.getByText("Hint one")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<SolutionModal scenario={scenario} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

const mockFeedback: GradeFeedback = {
  objectiveMet: true,
  objectiveFeedback: "The response covered all required points.",
  strengths: ["Clear persona assigned", "Output format specified"],
  gaps: ["No examples provided"],
  rewrittenPrompt: "You are a senior analyst...",
  isEffective: false,
};

describe("FeedbackDisplay", () => {
  it("renders objective feedback and badge", () => {
    render(<FeedbackDisplay feedback={mockFeedback} />);
    expect(screen.getByText("Objective Met")).toBeInTheDocument();
    expect(screen.getByText("The response covered all required points.")).toBeInTheDocument();
  });

  it("renders strengths list", () => {
    render(<FeedbackDisplay feedback={mockFeedback} />);
    expect(screen.getByText("Clear persona assigned")).toBeInTheDocument();
  });

  it("renders rewritten prompt when not effective", () => {
    render(<FeedbackDisplay feedback={mockFeedback} />);
    expect(screen.getByText("You are a senior analyst...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("shows effective message and hides rewrite when isEffective is true", () => {
    render(
      <FeedbackDisplay
        feedback={{ ...mockFeedback, isEffective: true, gaps: [], rewrittenPrompt: "" }}
      />
    );
    expect(
      screen.getByText(/demonstrates effective technique/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy/i })).not.toBeInTheDocument();
  });
});
