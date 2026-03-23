import * as React from "react";
import * as P from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
const ContextMenu=P.Root;const ContextMenuTrigger=P.Trigger;
const ContextMenuContent=React.forwardRef<any,any>(({className,...p},ref)=><P.Portal><P.Content ref={ref} className={cn("z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",className)}{...p}/></P.Portal>);ContextMenuContent.displayName="ContextMenuContent";
const ContextMenuItem=React.forwardRef<any,any>(({className,...p},ref)=><P.Item ref={ref} className={cn("relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent",className)}{...p}/>);ContextMenuItem.displayName="ContextMenuItem";
export{ContextMenu,ContextMenuTrigger,ContextMenuContent,ContextMenuItem};
