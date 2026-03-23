import * as React from "react";
import * as P from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";
const ScrollArea=React.forwardRef<any,any>(({className,children,...p},ref)=>(<P.Root ref={ref} className={cn("relative overflow-hidden",className)}{...p}><P.Viewport className="h-full w-full rounded-[inherit]">{children}</P.Viewport><ScrollBar/><P.Corner/></P.Root>));ScrollArea.displayName="ScrollArea";
const ScrollBar=React.forwardRef<any,any>(({className,orientation="vertical",...p},ref)=>(<P.ScrollAreaScrollbar ref={ref} orientation={orientation} className={cn("flex touch-none select-none transition-colors",orientation==="vertical"?"h-full w-2.5 border-l border-l-transparent p-[1px]":"h-2.5 flex-col border-t border-t-transparent p-[1px]",className)}{...p}><P.ScrollAreaThumb className="relative flex-1 rounded-full bg-border"/></P.ScrollAreaScrollbar>));ScrollBar.displayName="ScrollBar";
export{ScrollArea,ScrollBar};
