export interface RubricCriterion {
  criterion: string;
  description: string;
  points: number;
}

export interface Scenario {
  id: string;
  number: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  title: string;
  description: string;
  task: string;
  rubric: RubricCriterion[];
  expertPrompt: string;
  expectedOutput?: string;
  hints?: string[];
}

export interface GradeFeedback {
  objectiveMet: boolean;
  objectiveFeedback: string;
  strengths: string[];
  gaps: string[];
  rewrittenPrompt: string;
  isEffective: boolean;
}
