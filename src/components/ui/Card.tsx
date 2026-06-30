import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  as: Tag = "div",
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: React.ElementType }) {
  return (
    <Tag
      className={cn(
        "rounded-lg border border-neutral-200 bg-white shadow-card",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-b border-neutral-100", className)}>{children}</div>;
}

export function CardBody({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
