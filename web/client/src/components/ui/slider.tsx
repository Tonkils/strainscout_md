import * as React from "react";
import * as P from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";
const Slider=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Root ref={ref} className={cn("relative flex w-full touch-none select-none items-center",className)}{...p}><P.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20"><P.Range className="absolute h-full bg-primary"/></P.Track><P.Thumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow"/></P.Root>));Slider.displayName="Slider";
export{Slider};
