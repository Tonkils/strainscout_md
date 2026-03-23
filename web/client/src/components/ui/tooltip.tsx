import * as React from "react";
import * as P from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";
const TooltipProvider=P.Provider;const Tooltip=P.Root;const TooltipTrigger=P.Trigger;
const TooltipContent=React.forwardRef<any,any>(({className,sideOffset=4,...p},ref)=>(<P.Portal><P.Content ref={ref} sideOffset={sideOffset} className={cn("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",className)}{...p}/></P.Portal>));TooltipContent.displayName="TooltipContent";
export{Tooltip,TooltipTrigger,TooltipContent,TooltipProvider};
