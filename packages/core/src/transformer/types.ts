export interface StructuredSkill {
  name: string;
  sourceTitle: string;
  sourceUrl: string;
  generatedAt: string;
  content: string;
}

export type SkillPlan = {
  video: { title: string; url: string; duration?: string };
  content_type: "tutorial" | "workflow-demo" | "lecture" | "interview" | "mixed";
  segmentation_policy: { max_segments: number; min_lines: number; allow_overlap: false };
  segments: SkillSegment[];
};

export type SkillSegment = {
  id: string;
  proposed_name: string;
  proposed_slug: string;
  description: string;
  start_line: number;
  end_line: number;
  evidence_quotes: string[];
  priority: 1 | 2 | 3;
};
