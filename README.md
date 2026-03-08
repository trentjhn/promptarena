# PromptArena

A prompt engineering practice arena powered by Claude. Write prompts, get real AI responses, and receive expert feedback on your technique.

## What It Is

PromptArena gives you 15 structured scenarios — from extracting action items to task decomposition — and teaches prompt engineering by doing. Write a prompt, see Claude's response, get AI-powered feedback on what worked and what to improve, then compare against an expert solution.

## Scenarios

**Beginner**
1. Extract Key Points from Meeting Transcript
2. Rewrite Email for Tone
3. Classify Customer Feedback
4. Handle Ambiguity — Ask Before Acting
5. Use XML Tags to Separate Content

**Intermediate**
6. Competitive Strategy Analysis
7. Summarize Under a Hard Constraint
8. Chain-of-Thought Reasoning
9. Few-Shot Prompting
10. Conditional Instructions

**Advanced**
11. Generate PRD from Product Requirements
12. Code Review and Plain-Language Explanation
13. Self-Verification
14. Meta-Prompting — Improve a Weak Prompt
15. Task Decomposition

## Tech Stack

- React 18 + TypeScript + Vite
- Vercel Serverless Functions
- Anthropic Claude (claude-haiku-4-5-20251001)
- Custom CSS — no UI library

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your Anthropic API key to `.env`:
   ```
   ANTHROPIC_API_KEY=your_key_here
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

4. In a separate terminal, start the Vercel dev server (required for API routes):
   ```bash
   npx vercel dev
   ```

   Use the Vercel dev URL (default `http://localhost:3000`) rather than the Vite port for full functionality including API routes.

## Deploy

Deploy to Vercel and set `ANTHROPIC_API_KEY` as an environment variable in your project settings.

## License

MIT
