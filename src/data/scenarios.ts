import type { Scenario } from "../types/scenario";

export const scenarios: Scenario[] = [
  // ─── BEGINNER ───────────────────────────────────────────────────────────────
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
        description: "Does it specify the output format (e.g., bullet list, table)?",
        points: 25,
      },
      {
        criterion: "Constraint Definition",
        description: "Does it include constraints (e.g., max 5 items, must include owner)?",
        points: 25,
      },
      {
        criterion: "Actual Output Quality",
        description: "Does Claude's response match what you expected structurally?",
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
    id: "email-tone",
    number: 2,
    difficulty: "beginner",
    title: "Rewrite Email for Tone",
    description:
      "You have a hastily written email that sounds passive-aggressive. You need it rewritten to be professional, direct, and constructive.",
    task: "Write a prompt that rewrites a draft email to sound professional and concise. Include a sample draft email in your prompt for Claude to work with.",
    expertPrompt: `You are a professional business communication editor.

Take the following draft email and rewrite it to be:
- Professional in tone (no passive-aggression, no informality)
- Concise (remove redundancies, aim for 30% shorter)
- Direct (lead with the main point)

Preserve all key information and action items. Output only the rewritten email — do not explain your changes.

Draft email:
[paste your draft email here]`,
    hints: [
      "Assign Claude a specific editing persona",
      "List the exact tone qualities you want (professional, direct, concise)",
      "Constrain the output — ask for the rewritten email only, no commentary",
    ],
  },
  {
    id: "classify-feedback",
    number: 3,
    difficulty: "beginner",
    title: "Classify Customer Feedback",
    description:
      "You have a batch of customer support messages. You need each classified by sentiment and summarized by theme.",
    task: "Write a prompt that classifies customer feedback as Positive, Negative, or Neutral and identifies the primary theme of each entry. Include 3–5 sample feedback items in your prompt.",
    expertPrompt: `Classify each of the following customer feedback entries.

For each entry, provide:
- Sentiment: Positive | Negative | Neutral
- Primary theme: one short phrase (e.g., "slow response time", "easy onboarding")
- Confidence: High | Medium | Low

Format as a table with columns: # | Sentiment | Theme | Confidence

Feedback entries:
[paste your feedback entries here]`,
    hints: [
      "Define the exact categories upfront — don't leave them implicit",
      "Specify a consistent output format (a table works well here)",
      "Ask for a confidence rating to handle ambiguous cases",
    ],
  },
  {
    id: "handle-ambiguity",
    number: 4,
    difficulty: "beginner",
    title: "Handle Ambiguity — Ask Before Acting",
    description:
      "Claude tends to fill gaps with assumptions. This scenario teaches you to instruct Claude to identify ambiguity and ask clarifying questions before proceeding.",
    task: "Write a prompt for a vague, underspecified task that instructs Claude to identify what is unclear and ask targeted clarifying questions before doing any work.",
    expertPrompt: `Before you attempt this task, identify everything that is ambiguous or unclear about the request below.

List each ambiguity as a numbered question. Be specific — ask about the audience, format, scope, constraints, or any missing details.

Do not attempt the task until all your questions are listed.

Task: Create a report on our Q3 performance.`,
    hints: [
      "Explicitly tell Claude NOT to proceed until it lists its questions",
      "Give Claude a genuinely vague task so it has something to ask about",
      "Ask for numbered questions so the output is scannable",
    ],
  },
  {
    id: "xml-tags",
    number: 5,
    difficulty: "beginner",
    title: "Use XML Tags to Separate Content",
    description:
      "When you provide multiple pieces of content in a single prompt, Claude can mix them up. XML tags create clear boundaries between content blocks.",
    task: "Write a prompt that uses XML tags to clearly separate two different pieces of content you want Claude to analyze or compare.",
    expertPrompt: `Compare the two business proposals below and identify:
1. Their shared assumptions
2. Their key differences
3. Which you would recommend, and why

Base your analysis only on what is stated in the proposals. If something is not mentioned, note it as "Not specified."

<proposal_a>
[paste first proposal here]
</proposal_a>

<proposal_b>
[paste second proposal here]
</proposal_b>`,
    hints: [
      "Wrap each content block in an XML tag with a descriptive name",
      "Reference the tag names in your instructions (e.g., 'Based on <proposal_a>...')",
      "XML tags help most when comparing, contrasting, or processing multiple inputs",
    ],
  },

  // ─── INTERMEDIATE ────────────────────────────────────────────────────────────
  {
    id: "analyze-competitor",
    number: 6,
    difficulty: "intermediate",
    title: "Competitive Strategy Analysis",
    description:
      "Analyze a competitor's product positioning to identify strategic gaps.",
    task: "Write a prompt that analyzes a competitor's value propositions and identifies strategic vulnerabilities.",
    rubric: [
      {
        criterion: "Step-by-Step Process",
        description: "Does the prompt force reasoning before conclusions (using Level 4 structure)?",
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
        description: "Can you actually use the output to make a business decision?",
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
    id: "constrained-summary",
    number: 7,
    difficulty: "intermediate",
    title: "Summarize Under a Hard Constraint",
    description:
      "Unconstrained summaries balloon in length. This scenario teaches you to enforce strict output limits and prioritization criteria.",
    task: "Write a prompt that summarizes a piece of text in 100 words or fewer, leading with the single most important insight. Include a sample text paragraph in your prompt.",
    expertPrompt: `Summarize the following text in 100 words or fewer.

Requirements:
- Lead with the single most important insight
- Preserve all key numbers or statistics
- Omit examples or background context if needed to meet the word limit
- End your summary with: (Word count: N)

Text:
[paste your text here]`,
    hints: [
      "State the word limit as an absolute constraint, not a guideline",
      "Tell Claude what to prioritize and what to cut first",
      "Ask Claude to include a word count so you can verify compliance",
    ],
  },
  {
    id: "chain-of-thought",
    number: 8,
    difficulty: "intermediate",
    title: "Chain-of-Thought Reasoning",
    description:
      "Claude often jumps straight to conclusions. Forcing step-by-step reasoning improves accuracy on complex decisions.",
    task: "Write a prompt that forces Claude to reason step by step through a multi-factor decision before stating its recommendation.",
    expertPrompt: `Think step by step.

Step 1: List the key factors relevant to this decision.
Step 2: For each factor, assess whether it supports or opposes the decision, and explain why.
Step 3: Weigh the factors against each other — which carry more importance and why?
Step 4: Only after completing the above steps, state your final recommendation and the primary reason behind it.

Do not jump to a recommendation before completing Steps 1–3.

Decision: Should a 10-person startup expand into the European market in the next 6 months?`,
    hints: [
      'Use numbered steps with "Only after..." to prevent premature conclusions',
      "Include an explicit prohibition on jumping ahead",
      "The more factors involved, the more chain-of-thought helps",
    ],
  },
  {
    id: "few-shot",
    number: 9,
    difficulty: "intermediate",
    title: "Few-Shot Prompting",
    description:
      "When you need consistent output format across many items, showing examples (few-shot) is more reliable than describing the format in words.",
    task: "Write a prompt that uses 2–3 examples to teach Claude a consistent output pattern, then applies that pattern to a new item.",
    expertPrompt: `Extract the product name and price from each input. Follow the format shown exactly.

Input: "The new AirPods Pro (2nd gen) are now $249 at Apple."
Output: Product: AirPods Pro 2nd gen | Price: $249

Input: "Samsung just dropped the Galaxy S24 to $799 this weekend only."
Output: Product: Galaxy S24 | Price: $799

Input: "Dyson V15 Detect vacuum — limited time offer at $649.99."
Output: Product: Dyson V15 Detect | Price: $649.99

Now extract from this input:
[paste your product text here]
Output:`,
    hints: [
      "Use 2–3 representative examples that cover the variation you expect",
      "Keep example format identical — Claude mirrors what it sees",
      "End with the real task using the same input/output structure",
    ],
  },
  {
    id: "conditional-instructions",
    number: 10,
    difficulty: "intermediate",
    title: "Conditional Instructions",
    description:
      "Real-world prompts often need to handle multiple input types differently. Explicit if/else logic in your prompt prevents Claude from guessing.",
    task: "Write a prompt with conditional logic that tells Claude how to respond differently based on whether the input is a complaint, a question, or a compliment.",
    expertPrompt: `You will receive a customer message. Respond according to its type:

If it is a COMPLAINT: Acknowledge the issue, apologize sincerely (one sentence), and describe one concrete next step.
If it is a QUESTION: Answer directly and concisely. If you don't know the answer, say so explicitly.
If it is a COMPLIMENT: Thank them warmly in one sentence. Do not elaborate or upsell.

If the message type is unclear, respond as if it is a question.

Customer message:
[paste message here]`,
    hints: [
      "Use explicit IF/THEN language, not vague descriptions",
      "Cover edge cases — what should Claude do if the type is ambiguous?",
      "Keep each conditional branch short and specific",
    ],
  },

  // ─── ADVANCED ────────────────────────────────────────────────────────────────
  {
    id: "prd-generation",
    number: 11,
    difficulty: "advanced",
    title: "Generate PRD from Product Requirements",
    description:
      "Convert raw product requirements into a structured PRD document.",
    task: "Write a prompt that transforms vague product requirements into a complete PRD with clear success metrics.",
    rubric: [
      {
        criterion: "Problem Definition",
        description: "Does the prompt capture the core problem being solved?",
        points: 25,
      },
      {
        criterion: "Success Metrics",
        description: "Are success metrics specific, measurable, and tied to business outcomes?",
        points: 25,
      },
      {
        criterion: "MVP Scoping",
        description: "Does it distinguish MVP from future roadmap features?",
        points: 25,
      },
      {
        criterion: "Completeness",
        description: "Does the output include all PRD sections (user stories, API)?",
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
  {
    id: "code-review",
    number: 12,
    difficulty: "advanced",
    title: "Code Review and Plain-Language Explanation",
    description:
      "Getting Claude to review code is easy. Getting it to explain issues clearly for a junior developer — without jargon, with severity ratings — requires a well-structured prompt.",
    task: "Write a prompt that reviews a code snippet for bugs and explains each issue in plain language suitable for a junior developer. Include a code snippet in your prompt.",
    expertPrompt: `Act as a senior software engineer reviewing code for a junior developer on your team.

For each bug or issue you find:
1. Identify the line or section
2. Describe what is wrong in plain language (no jargon — assume the reader has 6 months of experience)
3. Rate severity: Critical | Major | Minor
4. Show the corrected version with a one-line explanation of why it's better

After the review, add a "Key Takeaways" section with the top 1–2 things the developer should study or practice.

Code to review:
\`\`\`
[paste your code here]
\`\`\``,
    hints: [
      "Specify the audience — 'junior developer' changes how Claude explains things",
      "Structure the output so each issue follows the same format",
      "Ask for a Key Takeaways section so feedback is educational, not just corrective",
    ],
  },
  {
    id: "self-verification",
    number: 13,
    difficulty: "advanced",
    title: "Self-Verification",
    description:
      "Claude can make confident errors. Teaching it to verify its own output against explicit criteria — before showing the result — catches many mistakes.",
    task: "Write a prompt that asks Claude to generate a response, verify it against your stated requirements, and revise if anything is missing — all in one turn. Output only the final version.",
    expertPrompt: `Generate a response to the task below.

Before outputting anything, verify your response against each requirement:
- [ ] The response is under 200 words
- [ ] It includes a specific, concrete example
- [ ] It avoids technical jargon
- [ ] It ends with a clear call to action

If any requirement is not met, revise the response until all are satisfied.

Output only the final, verified response. Do not show intermediate drafts or the verification process.

Task: Write a short pitch for a new productivity app aimed at freelancers.`,
    hints: [
      "List your requirements as an explicit checklist Claude must check off",
      "Instruct Claude to hide intermediate steps — output only the final version",
      "This pattern works best when you have 3+ concrete, measurable requirements",
    ],
  },
  {
    id: "meta-prompting",
    number: 14,
    difficulty: "advanced",
    title: "Meta-Prompting — Improve a Weak Prompt",
    description:
      "A key skill: using Claude to improve your own prompts. This requires writing a prompt that instructs Claude to act as a prompt engineer.",
    task: "Write a prompt that takes a weak, vague prompt as input and rewrites it to be specific, well-structured, and effective. Include the weak prompt you want Claude to improve.",
    expertPrompt: `Act as an expert prompt engineer.

You will be given a weak, vague prompt. Rewrite it to be:
- Specific: a clear task with no ambiguity
- Structured: includes a persona, task context, and desired output format
- Constrained: defines at least one thing Claude should avoid or limit

Output only the improved prompt — do not explain your changes or add commentary.

Weak prompt: "Tell me about marketing."`,
    hints: [
      "Give Claude the 'prompt engineer' persona explicitly",
      "Define what a good prompt looks like — specificity, structure, constraints",
      "Ask for output-only to get a clean, usable result",
    ],
  },
  {
    id: "task-decomposition",
    number: 15,
    difficulty: "advanced",
    title: "Task Decomposition",
    description:
      "Complex goals need to be broken into ordered, concrete steps. This scenario teaches you to prompt Claude to act as a project manager and produce an actionable plan.",
    task: "Write a prompt that breaks a complex, high-level goal into an ordered sequence of concrete subtasks, each completable in one day or less, with dependencies noted.",
    expertPrompt: `Act as a senior project manager.

Break down the following goal into a detailed, ordered action plan:
- Number each subtask (1, 2, 3...)
- Each subtask must be concrete and completable in one working day or less
- For each subtask, note dependencies using: "Requires: Step N" (omit if none)
- Flag any subtask that requires an external decision or approval with [DECISION]
- Do not include vague subtasks (e.g., "do research") — break those down further

Goal: Launch a new SaaS product from idea to first 10 paying customers.`,
    hints: [
      "Give Claude a project manager persona for structured, numbered output",
      "Constrain subtask size — 'one day or less' prevents vague mega-tasks",
      "Ask for dependency notation to surface sequencing requirements",
    ],
  },
];
