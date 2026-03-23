#!/usr/bin/env python3
"""Generate remaining Radix-based shadcn/ui component stubs."""
from pathlib import Path

UI_DIR = Path(__file__).parent / "client" / "src" / "components" / "ui"

STUBS = {}

STUBS["accordion"] = r'''import * as React from "react";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
const Accordion = AccordionPrimitive.Root;
const AccordionItem = React.forwardRef<any, any>(({ className, ...props }, ref) => <AccordionPrimitive.Item ref={ref} className={cn("border-b", className)} {...props} />);
AccordionItem.displayName = "AccordionItem";
const AccordionTrigger = React.forwardRef<any, any>(({ className, children, ...props }, ref) => (<AccordionPrimitive.Header className="flex"><AccordionPrimitive.Trigger ref={ref} className={cn("flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180", className)} {...props}>{children}<ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" /></AccordionPrimitive.Trigger></AccordionPrimitive.Header>));
AccordionTrigger.displayName = "AccordionTrigger";
const AccordionContent = React.forwardRef<any, any>(({ className, children, ...props }, ref) => (<AccordionPrimitive.Content ref={ref} className="overflow-hidden text-sm" {...props}><div className={cn("pb-4 pt-0", className)}>{children}</div></AccordionPrimitive.Content>));
AccordionContent.displayName = "AccordionContent";
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
'''

STUBS["alert-dialog"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
const AlertDialog = P.Root; const AlertDialogTrigger = P.Trigger; const AlertDialogPortal = P.Portal;
const AlertDialogOverlay = React.forwardRef<any,any>(({className,...p},ref)=><P.Overlay className={cn("fixed inset-0 z-50 bg-black/80",className)} {...p} ref={ref}/>);AlertDialogOverlay.displayName="AlertDialogOverlay";
function AlertDialogContent({className,...p}:any){return<AlertDialogPortal><AlertDialogOverlay/><P.Content className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",className)}{...p}/></AlertDialogPortal>}
function AlertDialogHeader({className,...p}:any){return<div className={cn("flex flex-col space-y-2 text-center sm:text-left",className)}{...p}/>}
function AlertDialogFooter({className,...p}:any){return<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",className)}{...p}/>}
const AlertDialogTitle=React.forwardRef<any,any>(({className,...p},ref)=><P.Title ref={ref} className={cn("text-lg font-semibold",className)}{...p}/>);AlertDialogTitle.displayName="AlertDialogTitle";
const AlertDialogDescription=React.forwardRef<any,any>(({className,...p},ref)=><P.Description ref={ref} className={cn("text-sm text-muted-foreground",className)}{...p}/>);AlertDialogDescription.displayName="AlertDialogDescription";
const AlertDialogAction=React.forwardRef<any,any>(({className,...p},ref)=><P.Action ref={ref} className={cn(buttonVariants(),className)}{...p}/>);AlertDialogAction.displayName="AlertDialogAction";
const AlertDialogCancel=React.forwardRef<any,any>(({className,...p},ref)=><P.Cancel ref={ref} className={cn(buttonVariants({variant:"outline"}),"mt-2 sm:mt-0",className)}{...p}/>);AlertDialogCancel.displayName="AlertDialogCancel";
export{AlertDialog,AlertDialogPortal,AlertDialogOverlay,AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogFooter,AlertDialogTitle,AlertDialogDescription,AlertDialogAction,AlertDialogCancel};
'''

STUBS["checkbox"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
const Checkbox = React.forwardRef<any,any>(({className,...props},ref)=>(<P.Root ref={ref} className={cn("peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",className)}{...props}><P.Indicator className={cn("flex items-center justify-center text-current")}><Check className="h-4 w-4"/></P.Indicator></P.Root>));
Checkbox.displayName="Checkbox";
export{Checkbox};
'''

STUBS["collapsible"] = r'''export { Root as Collapsible, Trigger as CollapsibleTrigger, Content as CollapsibleContent } from "@radix-ui/react-collapsible";
'''

STUBS["context-menu"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
const ContextMenu=P.Root;const ContextMenuTrigger=P.Trigger;
const ContextMenuContent=React.forwardRef<any,any>(({className,...p},ref)=><P.Portal><P.Content ref={ref} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",className)}{...p}/></P.Portal>);ContextMenuContent.displayName="ContextMenuContent";
const ContextMenuItem=React.forwardRef<any,any>(({className,...p},ref)=><P.Item ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent",className)}{...p}/>);ContextMenuItem.displayName="ContextMenuItem";
export{ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem};
'''

STUBS["dialog"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const Dialog=P.Root;const DialogTrigger=P.Trigger;const DialogPortal=P.Portal;const DialogClose=P.Close;
const DialogOverlay=React.forwardRef<any,any>(({className,...p},ref)=><P.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80",className)}{...p}/>);DialogOverlay.displayName="DialogOverlay";
const DialogContent=React.forwardRef<any,any>(({className,children,...p},ref)=>(<DialogPortal><DialogOverlay/><P.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",className)}{...p}>{children}<P.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4"/></P.Close></P.Content></DialogPortal>));DialogContent.displayName="DialogContent";
function DialogHeader({className,...p}:any){return<div className={cn("flex flex-col space-y-1.5 text-center sm:text-left",className)}{...p}/>}
function DialogFooter({className,...p}:any){return<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",className)}{...p}/>}
const DialogTitle=React.forwardRef<any,any>(({className,...p},ref)=><P.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight",className)}{...p}/>);DialogTitle.displayName="DialogTitle";
const DialogDescription=React.forwardRef<any,any>(({className,...p},ref)=><P.Description ref={ref} className={cn("text-sm text-muted-foreground",className)}{...p}/>);DialogDescription.displayName="DialogDescription";
export{Dialog,DialogPortal,DialogOverlay,DialogTrigger,DialogClose,DialogContent,DialogHeader,DialogFooter,DialogTitle,DialogDescription};
'''

STUBS["dropdown-menu"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
const DropdownMenu=P.Root;const DropdownMenuTrigger=P.Trigger;const DropdownMenuGroup=P.Group;const DropdownMenuSub=P.Sub;const DropdownMenuRadioGroup=P.RadioGroup;
const DropdownMenuContent=React.forwardRef<any,any>(({className,sideOffset=4,...p},ref)=>(<P.Portal><P.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",className)}{...p}/></P.Portal>));DropdownMenuContent.displayName="DropdownMenuContent";
const DropdownMenuItem=React.forwardRef<any,any>(({className,...p},ref)=><P.Item ref={ref} className={cn("relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent",className)}{...p}/>);DropdownMenuItem.displayName="DropdownMenuItem";
const DropdownMenuLabel=React.forwardRef<any,any>(({className,...p},ref)=><P.Label ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold",className)}{...p}/>);DropdownMenuLabel.displayName="DropdownMenuLabel";
const DropdownMenuSeparator=React.forwardRef<any,any>(({className,...p},ref)=><P.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted",className)}{...p}/>);DropdownMenuSeparator.displayName="DropdownMenuSeparator";
const DropdownMenuCheckboxItem=React.forwardRef<any,any>(({className,children,checked,...p},ref)=><P.CheckboxItem ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent",className)} checked={checked}{...p}>{children}</P.CheckboxItem>);DropdownMenuCheckboxItem.displayName="DropdownMenuCheckboxItem";
export{DropdownMenu,DropdownMenuTrigger,DropdownMenuContent,DropdownMenuItem,DropdownMenuCheckboxItem,DropdownMenuLabel,DropdownMenuSeparator,DropdownMenuGroup,DropdownMenuSub,DropdownMenuRadioGroup};
'''

STUBS["hover-card"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";
const HoverCard=P.Root;const HoverCardTrigger=P.Trigger;
const HoverCardContent=React.forwardRef<any,any>(({className,align="center",sideOffset=4,...p},ref)=>(<P.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md",className)}{...p}/>));HoverCardContent.displayName="HoverCardContent";
export{HoverCard,HoverCardTrigger,HoverCardContent};
'''

STUBS["label"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
const Label=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Root ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",className)}{...p}/>));Label.displayName="Label";
export{Label};
'''

STUBS["menubar"] = r'''export { Root as Menubar, Menu as MenubarMenu, Trigger as MenubarTrigger, Content as MenubarContent, Item as MenubarItem, Separator as MenubarSeparator } from "@radix-ui/react-menubar";
'''

STUBS["popover"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
const Popover=P.Root;const PopoverTrigger=P.Trigger;const PopoverAnchor=P.Anchor;
const PopoverContent=React.forwardRef<any,any>(({className,align="center",sideOffset=4,...p},ref)=>(<P.Portal><P.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",className)}{...p}/></P.Portal>));PopoverContent.displayName="PopoverContent";
export{Popover,PopoverTrigger,PopoverContent,PopoverAnchor};
'''

STUBS["progress"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
const Progress=React.forwardRef<any,any>(({className,value,...p},ref)=>(<P.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20",className)}{...p}><P.Indicator className="h-full w-full flex-1 bg-primary transition-all" style={{transform:`translateX(-${100-(value||0)}%)`}}/></P.Root>));Progress.displayName="Progress";
export{Progress};
'''

STUBS["radio-group"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
const RadioGroup=React.forwardRef<any,any>(({className,...p},ref)=><P.Root className={cn("grid gap-2",className)}{...p} ref={ref}/>);RadioGroup.displayName="RadioGroup";
const RadioGroupItem=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Item ref={ref} className={cn("aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow",className)}{...p}><P.Indicator className="flex items-center justify-center"><Circle className="h-3.5 w-3.5 fill-primary"/></P.Indicator></P.Item>));RadioGroupItem.displayName="RadioGroupItem";
export{RadioGroup,RadioGroupItem};
'''

STUBS["scroll-area"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
const ScrollArea=React.forwardRef<any,any>(({className,children,...p},ref)=>(<P.Root ref={ref} className={cn("relative overflow-hidden",className)}{...p}><P.Viewport className="h-full w-full rounded-[inherit]">{children}</P.Viewport><ScrollBar/><P.Corner/></P.Root>));ScrollArea.displayName="ScrollArea";
const ScrollBar=React.forwardRef<any,any>(({className,orientation="vertical",...p},ref)=>(<P.ScrollAreaScrollbar ref={ref} orientation={orientation} className={cn("flex touch-none select-none transition-colors",orientation==="vertical"?"h-full w-2.5 border-l border-l-transparent p-[1px]":"h-2.5 flex-col border-t border-t-transparent p-[1px]",className)}{...p}><P.ScrollAreaThumb className="relative flex-1 rounded-full bg-border"/></P.ScrollAreaScrollbar>));ScrollBar.displayName="ScrollBar";
export{ScrollArea,ScrollBar};
'''

STUBS["select"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
const Select=P.Root;const SelectGroup=P.Group;const SelectValue=P.Value;
const SelectTrigger=React.forwardRef<any,any>(({className,children,...p},ref)=>(<P.Trigger ref={ref} className={cn("flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",className)}{...p}>{children}<P.Icon asChild><ChevronDown className="h-4 w-4 opacity-50"/></P.Icon></P.Trigger>));SelectTrigger.displayName="SelectTrigger";
const SelectContent=React.forwardRef<any,any>(({className,children,position="popper",...p},ref)=>(<P.Portal><P.Content ref={ref} className={cn("relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md",className)} position={position}{...p}><P.Viewport className={cn("p-1",position==="popper"&&"h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]")}>{children}</P.Viewport></P.Content></P.Portal>));SelectContent.displayName="SelectContent";
const SelectLabel=React.forwardRef<any,any>(({className,...p},ref)=><P.Label ref={ref} className={cn("px-2 py-1.5 text-sm font-semibold",className)}{...p}/>);SelectLabel.displayName="SelectLabel";
const SelectItem=React.forwardRef<any,any>(({className,children,...p},ref)=>(<P.Item ref={ref} className={cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50",className)}{...p}><span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center"><P.ItemIndicator><Check className="h-4 w-4"/></P.ItemIndicator></span><P.ItemText>{children}</P.ItemText></P.Item>));SelectItem.displayName="SelectItem";
const SelectSeparator=React.forwardRef<any,any>(({className,...p},ref)=><P.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-muted",className)}{...p}/>);SelectSeparator.displayName="SelectSeparator";
export{Select,SelectGroup,SelectValue,SelectTrigger,SelectContent,SelectLabel,SelectItem,SelectSeparator};
'''

STUBS["slider"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
const Slider=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Root ref={ref} className={cn("relative flex w-full touch-none select-none items-center",className)}{...p}><P.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20"><P.Range className="absolute h-full bg-primary"/></P.Track><P.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow"/></P.Root>));Slider.displayName="Slider";
export{Slider};
'''

STUBS["switch"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
const Switch=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Root className={cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",className)}{...p} ref={ref}><P.Thumb className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0")}/></P.Root>));Switch.displayName="Switch";
export{Switch};
'''

STUBS["tabs"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
const Tabs=P.Root;
const TabsList=React.forwardRef<any,any>(({className,...p},ref)=><P.List ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",className)}{...p}/>);TabsList.displayName="TabsList";
const TabsTrigger=React.forwardRef<any,any>(({className,...p},ref)=><P.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",className)}{...p}/>);TabsTrigger.displayName="TabsTrigger";
const TabsContent=React.forwardRef<any,any>(({className,...p},ref)=><P.Content ref={ref} className={cn("mt-2",className)}{...p}/>);TabsContent.displayName="TabsContent";
export{Tabs,TabsList,TabsTrigger,TabsContent};
'''

STUBS["toggle"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
const toggleVariants=cva("inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors hover:bg-muted hover:text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0",{variants:{variant:{default:"bg-transparent",outline:"border border-input bg-transparent shadow-xs hover:bg-accent"},size:{default:"h-9 px-2 min-w-9",sm:"h-8 px-1.5 min-w-8",lg:"h-10 px-2.5 min-w-10"}},defaultVariants:{variant:"default",size:"default"}});
const Toggle=React.forwardRef<any,any>(({className,variant,size,...p},ref)=><P.Root ref={ref} className={cn(toggleVariants({variant,size,className}))}{...p}/>);Toggle.displayName="Toggle";
export{Toggle,toggleVariants};
'''

STUBS["toggle-group"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";
const ToggleGroup=React.forwardRef<any,any>(({className,variant,size,children,...p},ref)=>(<P.Root ref={ref} className={cn("flex items-center justify-center gap-1",className)}{...p}>{children}</P.Root>));ToggleGroup.displayName="ToggleGroup";
const ToggleGroupItem=React.forwardRef<any,any>(({className,variant,size,...p},ref)=><P.Item ref={ref} className={cn(toggleVariants({variant,size,className}))}{...p}/>);ToggleGroupItem.displayName="ToggleGroupItem";
export{ToggleGroup,ToggleGroupItem};
'''

STUBS["tooltip"] = r'''import * as React from "react";
import * as P from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
const TooltipProvider=P.Provider;const Tooltip=P.Root;const TooltipTrigger=P.Trigger;
const TooltipContent=React.forwardRef<any,any>(({className,sideOffset=4,...p},ref)=>(<P.Portal><P.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",className)}{...p}/></P.Portal>));TooltipContent.displayName="TooltipContent";
export{Tooltip,TooltipTrigger,TooltipContent,TooltipProvider};
'''

for name, content in STUBS.items():
    path = UI_DIR / f"{name}.tsx"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(content)
    print(f"  WRITE: {name}.tsx ({len(content)} chars)")

print(f"\nGenerated {len(STUBS)} Radix-based UI components")
