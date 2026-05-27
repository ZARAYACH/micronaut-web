import {
  Activity,
  Archive,
  ArrowRight,
  Atom,
  Box,
  Bot,
  BookOpen,
  Boxes,
  Braces,
  Calendar,
  ChartLine,
  CheckCircle,
  Cloud,
  CloudCog,
  CloudUpload,
  Code2,
  Container,
  Cookie,
  Cpu,
  Database,
  DatabaseZap,
  FileCheck2,
  FileCode2,
  FileJson,
  FileJson2,
  FlaskConical,
  FolderGit2,
  GitCompareArrows,
  Gauge,
  Gem,
  Languages,
  Layers3,
  LayoutTemplate,
  Lock,
  Logs,
  Mail,
  MemoryStick,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Network,
  Package,
  PanelsTopLeft,
  Plug,
  Radar,
  Rocket,
  Route,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  SlidersVertical,
  Sparkles,
  TableProperties,
  Terminal,
  TestTube2,
  Users,
  Video,
  Waves,
  Waypoints,
  Workflow,
  type LucideIcon
} from "lucide-react";

import { cn } from "@/lib/utils";
import { withBasePath } from "@/lib/base-path";

export type IconThemeTreatment = "auto" | "inverted" | "preserve";

const icons: Record<string, LucideIcon> = {
  activity: Activity,
  "arrow-right": ArrowRight,
  archive: Archive,
  atom: Atom,
  "book-open": BookOpen,
  bot: Bot,
  box: Box,
  boxes: Boxes,
  braces: Braces,
  calendar: Calendar,
  "chart-line": ChartLine,
  "check-circle": CheckCircle,
  cloud: Cloud,
  "cloud-cog": CloudCog,
  "cloud-upload": CloudUpload,
  code: Code2,
  container: Container,
  cookie: Cookie,
  cpu: Cpu,
  database: Database,
  "database-zap": DatabaseZap,
  "file-check-2": FileCheck2,
  "file-code-2": FileCode2,
  "file-json": FileJson,
  "file-json-2": FileJson2,
  "flask-conical": FlaskConical,
  "folder-git-2": FolderGit2,
  "git-compare-arrows": GitCompareArrows,
  gauge: Gauge,
  gem: Gem,
  languages: Languages,
  "layers-3": Layers3,
  "layout-template": LayoutTemplate,
  lock: Lock,
  logs: Logs,
  mail: Mail,
  "memory-stick": MemoryStick,
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  "messages-square": MessagesSquare,
  network: Network,
  package: Package,
  "panels-top-left": PanelsTopLeft,
  plug: Plug,
  radar: Radar,
  rocket: Rocket,
  route: Route,
  shield: Shield,
  "shield-check": ShieldCheck,
  "sliders-horizontal": SlidersHorizontal,
  "sliders-vertical": SlidersVertical,
  sparkles: Sparkles,
  "table-properties": TableProperties,
  terminal: Terminal,
  "test-tube-2": TestTube2,
  users: Users,
  video: Video,
  waves: Waves,
  waypoints: Waypoints,
  workflow: Workflow
};

function normalizeLucideName(name: string) {
  if (name.startsWith("lucide:")) {
    return name.slice("lucide:".length);
  }
  return name;
}

function assetThemeClass(name: string, themeTreatment: IconThemeTreatment) {
  if (themeTreatment === "preserve") {
    return undefined;
  }
  if (themeTreatment === "inverted") {
    return "brightness-0 invert";
  }
  if (name.startsWith("feature:")) {
    return undefined;
  }
  return "dark:brightness-0 dark:invert";
}

function DecorativeAssetGlyph({
  src,
  name,
  className,
  themeTreatment
}: {
  src: string;
  name: string;
  className?: string;
  themeTreatment: IconThemeTreatment;
}) {
  return (
    <span
      className={cn(
        "inline-block bg-contain bg-center bg-no-repeat",
        assetThemeClass(name, themeTreatment),
        className
      )}
      style={{ backgroundImage: `url(${src})` }}
      aria-hidden="true"
    />
  );
}

export function IconGlyph({
  name,
  className,
  themeTreatment = "auto"
}: {
  name: string;
  className?: string;
  themeTreatment?: IconThemeTreatment;
}) {
  if (name.startsWith("brand:")) {
    return (
      <DecorativeAssetGlyph
        src={withBasePath(`/micronaut-assets/icons/brands/${name.slice("brand:".length)}.svg`)}
        name={name}
        className={className}
        themeTreatment={themeTreatment}
      />
    );
  }
  if (name.startsWith("feature:")) {
    return (
      <DecorativeAssetGlyph
        src={withBasePath(`/micronaut-assets/icons/features/${name.slice("feature:".length)}.svg`)}
        name={name}
        className={className}
        themeTreatment={themeTreatment}
      />
    );
  }
  if (name.startsWith("image:")) {
    return (
      <DecorativeAssetGlyph
        src={withBasePath(`/micronaut-assets/icons/${name.slice("image:".length)}`)}
        name={name}
        className={className}
        themeTreatment={themeTreatment}
      />
    );
  }

  const Icon = icons[normalizeLucideName(name)] || icons["book-open"];
  return <Icon className={className} aria-hidden="true" />;
}
