import * as React from "react";
import * as P from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";
const Progress=React.forwardRef<any,any>(({className,value,...p},ref)=>(<P.Root ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20",className)}{...p}><P.Indicator className="h-full w-full flex-1 bg-primary transition-all" style={{transform:`translateX(-${100-(value||0)}%)`}}/></P.Root>));Progress.displayName="Progress";
export{Progress};
