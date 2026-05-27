import { CheckIcon, ChevronDownIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  guideOptionPath,
  guideOverviewPath,
  guideTagPath,
  preferredGuideOption,
  type GeneratedGuide,
} from "@/lib/generated-guides";
import { withBasePath } from "@/lib/base-path";

export function LatestGuideCard({
  guide,
  root = "/latest",
}: {
  guide: GeneratedGuide;
  root?: string;
}) {
  const option = preferredGuideOption(guide);
  const href = withBasePath(
    option ? guideOptionPath(option, root) : guideOverviewPath(guide, root),
  );
  const hasVariantMenu = guide.options.length > 1;
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          {(guide.categories.length ? guide.categories : ["Guide"])
            .slice(0, 2)
            .map((category) => (
              <Badge key={category} variant="secondary">
                {category}
              </Badge>
            ))}
        </div>
        <CardTitle className="text-xl leading-tight">
          <a href={href} className="text-inherit no-underline hover:text-brand">
            {guide.title}
          </a>
        </CardTitle>
        <CardDescription>{guide.intro}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="flex flex-wrap gap-1.5">
          {guide.tags.slice(0, 5).map((tag) => (
            <a
              key={tag}
              href={withBasePath(guideTagPath(tag, root))}
              className="no-underline"
              aria-label={`Open guides tagged ${tag}`}
            >
              <Badge variant="outline">{tag}</Badge>
            </a>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>{guide.estimatedMinutes} min</span>
          {hasVariantMenu ? (
            <ButtonGroup>
              <Button asChild variant="outline" size="sm">
                <a href={href} aria-label={`Read ${guide.title}`}>
                  Read
                </a>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={`Choose variant for ${guide.title}`}
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-56">
                  <DropdownMenuLabel>Variants</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {guide.options.map((variant) => {
                    const active = variant.file === option?.file;
                    return (
                      <DropdownMenuItem key={variant.id} asChild>
                        <a
                          href={withBasePath(guideOptionPath(variant, root))}
                          aria-current={active ? "page" : undefined}
                        >
                          <span>{variant.languageLabel}</span>
                          <span className="ml-auto text-xs text-muted-foreground">
                            {variant.buildToolLabel}
                          </span>
                          {active ? (
                            <CheckIcon className="ml-1 size-4" />
                          ) : null}
                        </a>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          ) : (
            <Button asChild variant="outline" size="sm">
              <a href={href} aria-label={`Read ${guide.title}`}>
                Read
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
