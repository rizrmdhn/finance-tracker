import { ArrowUpRightIcon, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "./empty";

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "link"
    | "destructive"
    | "secondary";
}

export interface EmptyStateProps {
  icon?: LucideIcon | ReactNode;
  iconVariant?: "default" | "icon";
  title: string;
  description: string;
  actions?: EmptyStateAction[];
  learnMoreHref?: string;
  learnMoreLabel?: string;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconVariant = "icon",
  title,
  description,
  actions = [],
  learnMoreHref,
  learnMoreLabel = "Learn More",
  className,
}: EmptyStateProps) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant={iconVariant}>
            {typeof Icon === "function" ? <Icon /> : Icon}
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions.length > 0 && (
        <EmptyContent>
          <div className="flex gap-2">
            {actions.map((action, index) => {
              if (action.href) {
                return (
                  <Button
                    key={index}
                    variant={action.variant || "default"}
                    asChild
                  >
                    <a href={action.href}>{action.label}</a>
                  </Button>
                );
              }
              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        </EmptyContent>
      )}
      {learnMoreHref && (
        <Button
          variant="link"
          asChild
          className="text-muted-foreground"
          size="sm"
        >
          <a href={learnMoreHref}>
            {learnMoreLabel} <ArrowUpRightIcon />
          </a>
        </Button>
      )}
    </Empty>
  );
}
