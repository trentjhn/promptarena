import type { Scenario } from "../types/scenario";

export const scenarios: Scenario[] = [
  {
    id: "extract-points",
    number: 1,
    difficulty: "beginner",
    title: "Extract Key Points from Meeting Transcript",
    description:
      "You have a 30-minute meeting transcript. You need to extract the top 5 action items and who owns them.",
    task: "Write a prompt that extracts action items from the following meeting transcript:\n\n[Meeting excerpt will be provided in the app]",
    rubric: [
      {
        criterion: "Instruction Clarity",
        description: "Does the prompt clearly state what to extract?",
        points: 25,
      },
      {
        criterion: "Format Specification",
        description:
          "Does it specify the output format (e.g., bullet list, table)?",
        points: 25,
      },
      {
        criterion: "Constraint Definition",
        description:
          "Does it include constraints (e.g., max 5 items, must include owner)?",
        points: 25,
      },
      {
        criterion: "Actual Output Quality",
        description:
          "Does Claude's response match what you expected structurally?",
        points: 25,
      },
    ],
    expertPrompt: `Extract the top 5 action items from this meeting transcript.

For each item, provide:
- Action (what needs to be done)
- Owner (who is responsible)
- Due date (if mentioned)

Format as a bullet list. If due date is not mentioned, state "TBD".`,
    hints: [
      "Tell Claude exactly how many items you want",
      "Specify who should be responsible for each",
      'Use "Format as..." to request a specific structure',
    ],
  },
  {
    id: "analyze-competitor",
    number: 2,
    difficulty: "intermediate",
    title: "Competitive Strategy Analysis",
    description:
      "Analyze a competitor's product positioning to identify strategic gaps.",
    task: "Write a prompt that analyzes a competitor's value propositions and identifies strategic vulnerabilities.",
    rubric: [
      {
        criterion: "Step-by-Step Process",
        description:
          "Does the prompt force reasoning before conclusions (using Level 4 structure)?",
        points: 30,
      },
      {
        criterion: "Constraint Boundaries",
        description: "Does it prevent hallucination (e.g., 'cite sources')?",
        points: 25,
      },
      {
        criterion: "Evidence-Driven",
        description: "Does it require reasoning to be backed by facts?",
        points: 25,
      },
      {
        criterion: "Output Actionability",
        description:
          "Can you actually use the output to make a business decision?",
        points: 20,
      },
    ],
    expertPrompt: `Act as a senior product strategist.

First, identify the top three value propositions claimed by the competitor.
Then, evaluate which are defensible vs. easily copied by competitors.
Only after both steps, recommend the strategic vulnerabilities they should address.

Do not make claims without evidence from their public materials.
If something is unclear, state "Insufficient data: [claim]" instead of guessing.

Format as:
1. Core Value Props (bullet list)
2. Defensibility Analysis (table: Prop | Defensible? | Why)
3. Strategic Gaps (ranked by exploitability)`,
    hints: [
      "Separate instruction from data using XML tags",
      'Force step-by-step thinking with "First... Then... Only after..."',
      "Tell Claude when to admit uncertainty instead of guessing",
    ],
  },
  {
    id: "prd-generation",
    number: 3,
    difficulty: "advanced",
    title: "Generate PRD from Product Requirements",
    description:
      "Convert raw product requirements into a structured PRD document.",
    task: "Write a prompt that transforms vague product requirements into a complete PRD with clear success metrics.",
    rubric: [
      {
        criterion: "Problem Definition",
        description:
          "Does the prompt capture the core problem being solved?",
        points: 25,
      },
      {
        criterion: "Success Metrics",
        description:
          "Are success metrics specific, measurable, and tied to business outcomes?",
        points: 25,
      },
      {
        criterion: "MVP Scoping",
        description: "Does it distinguish MVP from future roadmap features?",
        points: 25,
      },
      {
        criterion: "Completeness",
        description:
          "Does the output include all PRD sections (user stories, API)?",
        points: 25,
      },
    ],
    expertPrompt: `Act as a senior product manager reviewing a product brief.

Step 1: Extract the core problem statement. Reframe it if needed for clarity.
Step 2: Define 3-5 success metrics that are measurable and tied to business outcomes.
Step 3: Identify the MVP scope — what's the minimum that proves the concept?
Step 4: Generate user stories in the format "As a [user], I want [action] so that [benefit]"

Do not assume technical implementation details.
Focus on the "why" before the "how".

Format output as:
# [Product Name] PRD
## Problem Statement
## Success Metrics
## MVP Scope
## User Stories`,
    hints: [
      "Separate defining the problem from generating solutions",
      "Make success metrics SMART (Specific, Measurable, Achievable, Relevant, Time-bound)",
      "Force MVP thinking by asking 'What's the minimum?'",
    ],
  },
];
