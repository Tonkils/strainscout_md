import * as React from "react";
import * as P from "@radix-ui/react-hover-card";
import { cn } from "@/lib/utils";
const HoverCard=P.Root;const HoverCardTrigger=P.Trigger;
const HoverCardContent=React.forwardRef<any,any>(({className,align="center",sideOffset=4,...p},ref)=>(<P.Content ref={ref} align={align} sideOffset={sideOffset} className={cn("z-50 w-64 rounded-md border bg-popover p-4 text-popover-foreground shadow-md",className)}{...p}/>));HoverCardContent.displayName="HoverCardContent";
export{HoverCard,HoverCardTrigger,HoverCardContent};
