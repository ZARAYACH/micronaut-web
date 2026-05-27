import type { ComponentProps, ReactNode } from "react";
import { Copy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { docsSnippetCodeLanguageIcon } from "@/components/web/docs-snippet-icons";
import { docsSnippetStyles } from "@/components/web/docs-snippet-styles";
import { cn } from "@/lib/utils";

export type DocsSnippetKind = "code" | "dependency";

export function DocsSnippetCopyButton({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className={cn(
        docsSnippetStyles.copyButton,
        docsSnippetStyles.copyButtonMarker,
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function DocsSnippetLanguageButton({
  active,
  children,
  className,
  ...props
}: ComponentProps<typeof Button> & { active?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className={cn(
        docsSnippetStyles.languageButton,
        active
          ? docsSnippetStyles.languageButtonActive
          : docsSnippetStyles.languageButtonInactive,
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function DocsSnippetStaticLanguage({
  children,
  className,
  ...props
}: ComponentProps<"span">) {
  return (
    <span
      data-slot="button"
      data-variant="ghost"
      data-size="xs"
      className={cn(docsSnippetStyles.staticLanguage, className)}
      {...props}
    >
      {children}
    </span>
  );
}

export function CopyIcon() {
  return <Copy aria-hidden="true" focusable="false" />;
}

export function DocsSnippetCodeLanguageIcon({
  className,
  language,
}: {
  className?: string;
  language: string;
}) {
  const { icon, key } = docsSnippetCodeLanguageIcon(language);

  return (
    <span
      className={cn(
        docsSnippetStyles.languageIcon,
        `docs-code-language-icon-${key}`,
        icon.fill ? docsSnippetStyles.languageIconFill : undefined,
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox={icon.viewBox}
        fill={icon.fill ? "currentColor" : "none"}
        stroke={icon.fill ? undefined : "currentColor"}
        strokeWidth={icon.fill ? undefined : 2}
        strokeLinecap={icon.fill ? undefined : "round"}
        strokeLinejoin={icon.fill ? undefined : "round"}
        focusable="false"
        dangerouslySetInnerHTML={{ __html: icon.body }}
      />
    </span>
  );
}

export function SnippetKindIcon({
  kind,
}: {
  kind: DocsSnippetKind | "properties";
}) {
  const language =
    kind === "properties"
      ? "properties"
      : kind === "dependency"
        ? "gradle"
        : "text";
  return (
    <DocsSnippetCodeLanguageIcon
      language={language}
      className={docsSnippetStyles.kindIcon}
    />
  );
}

type DocsSnippetCardProps = {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  controls?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  id?: string;
  kind?: DocsSnippetKind;
  title?: ReactNode;
};

export function DocsSnippetCard({
  action,
  children,
  className,
  controls,
  description,
  footer,
  id,
  kind = "code",
  title,
}: DocsSnippetCardProps) {
  const externalHeader = kind === "dependency" && Boolean(title || description);
  const hasHeaderText = Boolean(title || description) && !externalHeader;

  return (
    <>
      {externalHeader ? (
        <div className={docsSnippetStyles.externalHeader}>
          {title ? (
            <div className={docsSnippetStyles.externalHeaderTitle}>{title}</div>
          ) : null}
          {description ? (
            <div className={docsSnippetStyles.externalHeaderDescription}>
              {description}
            </div>
          ) : null}
        </div>
      ) : null}
      <Card
        id={id}
        className={cn(
          docsSnippetStyles.card,
          kind === "dependency"
            ? docsSnippetStyles.dependencySnippetTemplate
            : docsSnippetStyles.codeSnippetTemplate,
          footer ? docsSnippetStyles.cardWithFooter : undefined,
          className,
        )}
        data-snippet-kind={kind}
      >
        <CardHeader
          className={
            hasHeaderText
              ? docsSnippetStyles.textHeader
              : docsSnippetStyles.toolbarHeader
          }
        >
          {title && !externalHeader ? (
            <CardTitle className={docsSnippetStyles.heading}>
              <SnippetKindIcon kind={kind} />
              <span>{title}</span>
            </CardTitle>
          ) : null}
          {description && !externalHeader ? (
            <CardDescription className={docsSnippetStyles.description}>
              {description}
            </CardDescription>
          ) : null}
          {controls ? (
            <div className={docsSnippetStyles.actions}>{controls}</div>
          ) : null}
          {action ? (
            <CardAction
              className={
                hasHeaderText ? undefined : docsSnippetStyles.toolbarAction
              }
            >
              {action}
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent className={docsSnippetStyles.content}>
          {children}
        </CardContent>
        {footer ? (
          <div data-slot="card-footer" className={docsSnippetStyles.footer}>
            {footer}
          </div>
        ) : null}
      </Card>
    </>
  );
}

type DocsPropertiesSnippetCardProps = {
  anchorId: string;
  children: ReactNode;
  countLabel: ReactNode;
  id: string;
  eyebrow: ReactNode;
  title: ReactNode;
};

export function DocsPropertiesSnippetCard({
  anchorId,
  children,
  countLabel,
  id,
  eyebrow,
  title,
}: DocsPropertiesSnippetCardProps) {
  return (
    <Card id={id} className={docsSnippetStyles.propertiesCard}>
      <a
        className={docsSnippetStyles.propertiesAnchor}
        id={anchorId}
        href={`#${anchorId}`}
        aria-hidden="true"
      />
      <CardHeader className={docsSnippetStyles.textHeader}>
        <CardTitle className={docsSnippetStyles.propertiesHeading}>
          <SnippetKindIcon kind="properties" />
          <span>{title}</span>
        </CardTitle>
        <CardDescription className={docsSnippetStyles.propertiesDescription}>
          {eyebrow}
        </CardDescription>
        <CardAction>
          <Badge
            variant="secondary"
            className={docsSnippetStyles.propertiesCount}
          >
            {countLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className={docsSnippetStyles.propertiesScroll}>
        {children}
      </CardContent>
    </Card>
  );
}
