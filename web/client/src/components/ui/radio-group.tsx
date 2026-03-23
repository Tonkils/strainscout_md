import * as React from "react";
import * as P from "@radix-ui/react-radio-group";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
const RadioGroup=React.forwardRef<any,any>(({className,...p},ref)=><P.Root className={cn("grid gap-2",className)}{...p} ref={ref}/>);RadioGroup.displayName="RadioGroup";
const RadioGroupItem=React.forwardRef<any,any>(({className,...p},ref)=>(<P.Item ref={ref} className={cn("aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow",className)}{...p}><P.Indicator className="flex items-center justify-center"><Circle className="h-3.5 w-3.5 fill-primary"/></P.Indicator></P.Item>));RadioGroupItem.displayName="RadioGroupItem";
export{RadioGroup,RadioGroupItem};
