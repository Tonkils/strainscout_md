import * as React from "react";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: any) { return <nav className={cn("mx-auto flex w-full justify-center", className)} role="navigation" aria-label="pagination" {...props} />; }
function PaginationContent({ className, ...props }: any) { return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />; }
function PaginationItem(props: any) { return <li {...props} />; }
function PaginationLink({ className, isActive, ...props }: any) { return <a className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2", isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent", className)} {...props} />; }
function PaginationPrevious(props: any) { return <PaginationLink aria-label="Go to previous page" {...props}>← Previous</PaginationLink>; }
function PaginationNext(props: any) { return <PaginationLink aria-label="Go to next page" {...props}>Next →</PaginationLink>; }
function PaginationEllipsis(props: any) { return <span className="flex h-9 w-9 items-center justify-center" {...props}>…</span>; }
export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
