import * as React from "react";
import * as P from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
const Checkbox = React.forwardRef<any,any>(({className,...props},ref)=>(<P.Root ref={ref} className={cn("peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground",className)}{...props}><P.Indicator className={cn("flex items-center justify-center text-current")}><Check className="h-4 w-4"/></P.Indicator></P.Root>));
Checkbox.displayName="Checkbox";
export{Checkbox};
