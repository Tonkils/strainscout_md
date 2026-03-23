#!/usr/bin/env python3
"""
Generate minimal shadcn/ui component stubs.
These are simplified versions that re-export Radix primitives with Tailwind styling.
"""
from pathlib import Path

UI_DIR = Path(__file__).parent / "client" / "src" / "components" / "ui"
UI_DIR.mkdir(parents=True, exist_ok=True)

# Map of component name -> content
# These are minimal stubs that satisfy imports without full shadcn/ui
COMPONENTS = {
    "button": '''import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3 text-xs",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
''',
    "card": '''import * as React from "react";
import { cn } from "@/lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border bg-card text-card-foreground shadow", className)} {...props} />;
}
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />;
}
function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
}
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />;
}
function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-center p-6 pt-0", className)} {...props} />;
}
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
''',
    "input": '''import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Input };
''',
    "badge": '''import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground shadow",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
''',
    "skeleton": '''import * as React from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("animate-pulse rounded-md bg-primary/10", className)} {...props} />;
}

export { Skeleton };
''',
    "separator": '''import * as React from "react";
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", decorative = true, ...props }: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      decorative={decorative}
      orientation={orientation}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)}
      {...props}
    />
  );
}

export { Separator };
''',
    "textarea": '''import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
''',
    "table": '''import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.ComponentProps<"table">>(({ className, ...props }, ref) => (
  <div className="relative w-full overflow-auto"><table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} /></div>
));
Table.displayName = "Table";
const TableHeader = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<"thead">>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";
const TableBody = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<"tbody">>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";
const TableFooter = React.forwardRef<HTMLTableSectionElement, React.ComponentProps<"tfoot">>(({ className, ...props }, ref) => (
  <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} {...props} />
));
TableFooter.displayName = "TableFooter";
const TableRow = React.forwardRef<HTMLTableRowElement, React.ComponentProps<"tr">>(({ className, ...props }, ref) => (
  <tr ref={ref} className={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)} {...props} />
));
TableRow.displayName = "TableRow";
const TableHead = React.forwardRef<HTMLTableCellElement, React.ComponentProps<"th">>(({ className, ...props }, ref) => (
  <th ref={ref} className={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...props} />
));
TableHead.displayName = "TableHead";
const TableCell = React.forwardRef<HTMLTableCellElement, React.ComponentProps<"td">>(({ className, ...props }, ref) => (
  <td ref={ref} className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]", className)} {...props} />
));
TableCell.displayName = "TableCell";
const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.ComponentProps<"caption">>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
''',
}

# Simple re-export stubs for Radix-based components
RADIX_STUBS = {
    "accordion": ("@radix-ui/react-accordion", "Accordion, AccordionContent, AccordionItem, AccordionTrigger"),
    "alert-dialog": ("@radix-ui/react-alert-dialog", "AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, AlertDialogPortal, AlertDialogTitle, AlertDialogTrigger"),
    "checkbox": ("@radix-ui/react-checkbox", "Checkbox"),
    "collapsible": ("@radix-ui/react-collapsible", "Collapsible, CollapsibleContent, CollapsibleTrigger"),
    "context-menu": ("@radix-ui/react-context-menu", "ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger"),
    "dialog": ("@radix-ui/react-dialog", "Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger"),
    "dropdown-menu": ("@radix-ui/react-dropdown-menu", "DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger"),
    "hover-card": ("@radix-ui/react-hover-card", "HoverCard, HoverCardContent, HoverCardTrigger"),
    "label": ("@radix-ui/react-label", "Label"),
    "menubar": ("@radix-ui/react-menubar", "Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarSeparator, MenubarTrigger"),
    "popover": ("@radix-ui/react-popover", "Popover, PopoverContent, PopoverTrigger"),
    "progress": ("@radix-ui/react-progress", "Progress"),
    "radio-group": ("@radix-ui/react-radio-group", "RadioGroup, RadioGroupItem"),
    "scroll-area": ("@radix-ui/react-scroll-area", "ScrollArea, ScrollBar"),
    "select": ("@radix-ui/react-select", "Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue"),
    "slider": ("@radix-ui/react-slider", "Slider"),
    "switch": ("@radix-ui/react-switch", "Switch"),
    "tabs": ("@radix-ui/react-tabs", "Tabs, TabsContent, TabsList, TabsTrigger"),
    "toggle": ("@radix-ui/react-toggle", "Toggle"),
    "toggle-group": ("@radix-ui/react-toggle-group", "ToggleGroup, ToggleGroupItem"),
    "tooltip": ("@radix-ui/react-tooltip", "Tooltip, TooltipContent, TooltipProvider, TooltipTrigger"),
}

# Minimal stub components (no Radix dependency)
SIMPLE_STUBS = {
    "alert": '''import * as React from "react";
import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const alertVariants = cva("relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg~*]:pl-7", {
  variants: { variant: { default: "bg-background text-foreground", destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" }},
  defaultVariants: { variant: "default" },
});

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}
function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />;
}
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}
export { Alert, AlertTitle, AlertDescription };
''',
    "aspect-ratio": '''export { Root as AspectRatio } from "@radix-ui/react-aspect-ratio";
''',
    "avatar": '''import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return <AvatarPrimitive.Root className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props} />;
}
function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return <AvatarPrimitive.Image className={cn("aspect-square h-full w-full", className)} {...props} />;
}
function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return <AvatarPrimitive.Fallback className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)} {...props} />;
}
export { Avatar, AvatarImage, AvatarFallback };
''',
    "breadcrumb": '''import * as React from "react";
import { cn } from "@/lib/utils";

function Breadcrumb(props: React.ComponentProps<"nav">) { return <nav aria-label="breadcrumb" {...props} />; }
function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) { return <ol className={cn("flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5", className)} {...props} />; }
function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) { return <li className={cn("inline-flex items-center gap-1.5", className)} {...props} />; }
function BreadcrumbLink({ className, ...props }: React.ComponentProps<"a">) { return <a className={cn("transition-colors hover:text-foreground", className)} {...props} />; }
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) { return <span className={cn("font-normal text-foreground", className)} role="link" aria-disabled="true" aria-current="page" {...props} />; }
function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<"li">) { return <li className={cn("[&>svg]:w-3.5 [&>svg]:h-3.5", className)} role="presentation" aria-hidden="true" {...props}>{props.children || "/"}</li>; }
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) { return <span className={cn("flex h-9 w-9 items-center justify-center", className)} role="presentation" aria-hidden="true" {...props}>…</span>; }
export { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis };
''',
    "calendar": '''import * as React from "react";
export function Calendar(props: any) { return <div {...props}>Calendar placeholder</div>; }
''',
    "carousel": '''import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";

const CarouselContext = React.createContext<any>(null);
function Carousel({ children, className, ...props }: any) {
  const [emblaRef, emblaApi] = useEmblaCarousel(props.opts);
  return <CarouselContext.Provider value={{ emblaRef, emblaApi }}><div className={className} {...props}>{children}</div></CarouselContext.Provider>;
}
function CarouselContent({ className, ...props }: any) {
  const { emblaRef } = React.useContext(CarouselContext) || {};
  return <div ref={emblaRef} className="overflow-hidden"><div className={className} {...props} /></div>;
}
function CarouselItem({ className, ...props }: any) { return <div className={className} {...props} />; }
function CarouselPrevious(props: any) { return <button {...props}>←</button>; }
function CarouselNext(props: any) { return <button {...props}>→</button>; }
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
''',
    "command": '''import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className)} {...props} />;
}
const CommandInput = React.forwardRef<any, any>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3"><CommandPrimitive.Input ref={ref} className={cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} /></div>
));
CommandInput.displayName = "CommandInput";
function CommandList({ className, ...props }: any) { return <CommandPrimitive.List className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)} {...props} />; }
function CommandEmpty(props: any) { return <CommandPrimitive.Empty className="py-6 text-center text-sm" {...props} />; }
function CommandGroup({ className, ...props }: any) { return <CommandPrimitive.Group className={cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...props} />; }
function CommandItem({ className, ...props }: any) { return <CommandPrimitive.Item className={cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className)} {...props} />; }
function CommandSeparator({ className, ...props }: any) { return <CommandPrimitive.Separator className={cn("-mx-1 h-px bg-border", className)} {...props} />; }
export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator };
''',
    "drawer": '''import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

function Drawer(props: any) { return <DrawerPrimitive.Root {...props} />; }
function DrawerTrigger(props: any) { return <DrawerPrimitive.Trigger {...props} />; }
function DrawerClose(props: any) { return <DrawerPrimitive.Close {...props} />; }
function DrawerContent({ className, children, ...props }: any) {
  return <DrawerPrimitive.Portal><DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" /><DrawerPrimitive.Content className={cn("fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background", className)} {...props}><div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />{children}</DrawerPrimitive.Content></DrawerPrimitive.Portal>;
}
function DrawerHeader({ className, ...props }: any) { return <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />; }
function DrawerFooter({ className, ...props }: any) { return <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />; }
function DrawerTitle(props: any) { return <DrawerPrimitive.Title {...props} />; }
function DrawerDescription(props: any) { return <DrawerPrimitive.Description {...props} />; }
export { Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription };
''',
    "input-otp": '''import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "@/lib/utils";

function InputOTP({ className, ...props }: any) { return <OTPInput containerClassName={cn("flex items-center gap-2", className)} {...props} />; }
function InputOTPGroup({ className, ...props }: any) { return <div className={cn("flex items-center", className)} {...props} />; }
function InputOTPSlot({ index, className, ...props }: any) {
  const ctx = React.useContext(OTPInputContext);
  const slot = ctx?.slots?.[index] || {};
  return <div className={cn("relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md", className)} {...props}>{slot.char}</div>;
}
function InputOTPSeparator(props: any) { return <div role="separator" {...props}>-</div>; }
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
''',
    "navigation-menu": '''import * as React from "react";
export function NavigationMenu(props: any) { return <nav {...props} />; }
export function NavigationMenuList(props: any) { return <ul {...props} />; }
export function NavigationMenuItem(props: any) { return <li {...props} />; }
export function NavigationMenuTrigger(props: any) { return <button {...props} />; }
export function NavigationMenuContent(props: any) { return <div {...props} />; }
export function NavigationMenuLink(props: any) { return <a {...props} />; }
''',
    "pagination": '''import * as React from "react";
import { cn } from "@/lib/utils";

function Pagination({ className, ...props }: any) { return <nav className={cn("mx-auto flex w-full justify-center", className)} role="navigation" aria-label="pagination" {...props} />; }
function PaginationContent({ className, ...props }: any) { return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />; }
function PaginationItem(props: any) { return <li {...props} />; }
function PaginationLink({ className, isActive, ...props }: any) { return <a className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors h-9 px-4 py-2", isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent", className)} {...props} />; }
function PaginationPrevious(props: any) { return <PaginationLink aria-label="Go to previous page" {...props}>← Previous</PaginationLink>; }
function PaginationNext(props: any) { return <PaginationLink aria-label="Go to next page" {...props}>Next →</PaginationLink>; }
function PaginationEllipsis(props: any) { return <span className="flex h-9 w-9 items-center justify-center" {...props}>…</span>; }
export { Pagination, PaginationContent, PaginationLink, PaginationItem, PaginationPrevious, PaginationNext, PaginationEllipsis };
''',
    "resizable": '''import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return <ResizablePrimitive.PanelGroup className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)} {...props} />;
}
const ResizablePanel = ResizablePrimitive.Panel;
function ResizableHandle({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & { withHandle?: boolean }) {
  return <ResizablePrimitive.PanelResizeHandle className={cn("relative flex w-px items-center justify-center bg-border", className)} {...props} />;
}
export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
''',
    "sheet": '''import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
function SheetContent({ className, children, ...props }: any) {
  return <SheetPrimitive.Portal><SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" /><SheetPrimitive.Content className={cn("fixed z-50 gap-4 bg-background p-6 shadow-lg inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm", className)} {...props}>{children}</SheetPrimitive.Content></SheetPrimitive.Portal>;
}
function SheetHeader({ className, ...props }: any) { return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />; }
function SheetFooter({ className, ...props }: any) { return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />; }
function SheetTitle(props: any) { return <SheetPrimitive.Title {...props} />; }
function SheetDescription(props: any) { return <SheetPrimitive.Description {...props} />; }
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
''',
    "sidebar": '''import * as React from "react";
export function Sidebar(props: any) { return <aside {...props} />; }
export function SidebarContent(props: any) { return <div {...props} />; }
export function SidebarHeader(props: any) { return <div {...props} />; }
export function SidebarFooter(props: any) { return <div {...props} />; }
export function SidebarProvider(props: any) { return <div {...props} />; }
export function SidebarTrigger(props: any) { return <button {...props} />; }
export function SidebarInset(props: any) { return <div {...props} />; }
export function SidebarGroup(props: any) { return <div {...props} />; }
export function SidebarGroupLabel(props: any) { return <div {...props} />; }
export function SidebarGroupContent(props: any) { return <div {...props} />; }
export function SidebarMenu(props: any) { return <ul {...props} />; }
export function SidebarMenuItem(props: any) { return <li {...props} />; }
export function SidebarMenuButton(props: any) { return <button {...props} />; }
''',
    "sonner": '''import { Toaster as SonnerToaster } from "sonner";
export function Toaster() { return <SonnerToaster richColors position="bottom-right" />; }
''',
}

def write_component(name: str, content: str):
    path = UI_DIR / f"{name}.tsx"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
        if not content.endswith("\n"):
            f.write("\n")
    print(f"  WRITE: components/ui/{name}.tsx ({len(content)} chars)")

def write_radix_stub(name: str, pkg: str, exports: str):
    """Create a simple re-export stub for Radix-based components."""
    export_list = [e.strip() for e in exports.split(",")]

    lines = [f'import * as React from "react";']
    lines.append(f'import * as Primitive from "{pkg}";')
    lines.append(f'import {{ cn }} from "@/lib/utils";')
    lines.append("")

    for exp in export_list:
        # Create a simple wrapper
        lines.append(f'const {exp} = React.forwardRef<any, any>((props, ref) => <Primitive.{exp.replace("Dialog", "").replace("Alert", "") or "Root"} ref={{ref}} {{...props}} />);')
        lines.append(f'{exp}.displayName = "{exp}";')

    lines.append("")
    lines.append(f'export {{ {exports} }};')

    content = "\n".join(lines) + "\n"
    write_component(name, content)

def main():
    print("Generating shadcn/ui component stubs...")
    print(f"Output: {UI_DIR}")
    print()

    # Full implementations
    for name, content in COMPONENTS.items():
        write_component(name, content)

    # Simple stubs
    for name, content in SIMPLE_STUBS.items():
        write_component(name, content)

    print()
    print(f"Generated {len(COMPONENTS) + len(SIMPLE_STUBS)} UI components")

if __name__ == "__main__":
    main()
