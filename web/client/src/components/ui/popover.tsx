import * as React from "react";
import * as P from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
const Popover=P.Root;const PopoverTrigger=P.Trigger;const PopoverAnchor=P.Anchor;
const PopoverContent=React.forwardRef<any,any>(({className,align="center",sideOffset=4,...p},ref)=>(<P.Portal><P.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none",className)}{...p}/></P.Portal>));PopoverContent.displayName="PopoverContent";
export{Popover,PopoverTrigger,PopoverContent,PopoverAnchor};
