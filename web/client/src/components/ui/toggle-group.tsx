import * as React from "react";
import * as P from "@radix-ui/react-toggle-group";
import { cn } from "@/lib/utils";
import { toggleVariants } from "@/components/ui/toggle";
const ToggleGroup=React.forwardRef<any,any>(({className,variant,size,children,...p},ref)=>(<P.Root ref={ref} className={cn("flex items-center justify-center gap-1",className)}{...p}>{children}</P.Root>));ToggleGroup.displayName="ToggleGroup";
const ToggleGroupItem=React.forwardRef<any,any>(({className,variant,size,...p},ref)=><P.Item ref={ref} className={cn(toggleVariants({variant,size,className}))}{...p}/>);ToggleGroupItem.displayName="ToggleGroupItem";
export{ToggleGroup,ToggleGroupItem};
