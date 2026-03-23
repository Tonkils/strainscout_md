import * as React from "react";
import * as P from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
const Label=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Root ref={ref} className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",className)}{...p}/>));Label.displayName="Label";
export{Label};
