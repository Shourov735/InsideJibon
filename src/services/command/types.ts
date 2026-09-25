export type CommandItemKind =
  | "course"
  | "lesson"
  | "exam"
  | "assignment"
  | "student"
  | "global";

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  href: string;
  kind: CommandItemKind;
  keywords?: string[];
}
