import { BookOpen, ClipboardList, FileText, Gift, Globe2, GraduationCap, Home, Images, Inbox, LayoutDashboard, LibraryBig, Mail, Settings, Sparkles, Users } from "lucide-react";

const icons = { overview: LayoutDashboard, home: Home, destinations: Globe2, universities: GraduationCap, courses: BookOpen, stories: Sparkles, blog: LibraryBig, packages: Gift, about: Users, contact: Mail, applications: ClipboardList, agreements: FileText, submissions: Inbox, team: Users, settings: Settings, media: Images };
export function CmsIcon({ name, size = 18 }: { name: string; size?: number }) {
  const Icon = icons[name as keyof typeof icons] || FileText;
  return <Icon size={size} strokeWidth={1.65} aria-hidden />;
}
