import * as React from "react";
import * as P from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
const Tabs=P.Root;
const TabsList=React.forwardRef<any,any>(({className,...p},ref)=><P.List ref={ref} className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",className)}{...p}/>);TabsList.displayName="TabsList";
const TabsTrigger=React.forwardRef<any,any>(({className,...p},ref)=><P.Trigger ref={ref} className={cn("inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",className)}{...p}/>);TabsTrigger.displayName="TabsTrigger";
const TabsContent=React.forwardRef<any,any>(({className,...p},ref)=><P.Content ref={ref} className={cn("mt-2",className)}{...p}/>);TabsContent.displayName="TabsContent";
export{Tabs,TabsList,TabsTrigger,TabsContent};
