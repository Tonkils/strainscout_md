import * as React from "react";
import * as P from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
const Switch=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Root className={cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-xs transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",className)}{...p} ref={ref}><P.Thumb className={cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0")}/></P.Root>));Switch.displayName="Switch";
export{Switch};
