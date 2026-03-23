import * as React from "react";
import { cn } from "@/lib/utils";

function Breadcrumb(props: React.ComponentProps<"nav">) { return <nav aria-label="breadcrumb" {...props} />; }
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) { return <ol className={cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5", className)} {...props} />; }
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) { return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />; }
function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) { return <a className={cn("transition-colors hover:text-foreground", className)} {...props} />; }
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) { return <span className={cn("font-normal text-foreground", className)} role="link" aria-disabled="true" aria-current="page" {...props} />; }
function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) { return <li className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)} role="presentation" aria-hidden="true" {...props}>{props.children || "/"}</li>; }
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) { return <span className={cn("flex h-9 w-9 items-center justify-center", className)} role="presentation" aria-hidden="true" {...props}>…</span>; }
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
