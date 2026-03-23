import * as React from "react";
import * as P from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
const Dialog=P.Root;const DialogTrigger=P.Trigger;const DialogPortal=P.Portal;const DialogClose=P.Close;
const DialogOverlay=React.forwardRef<any,any>(({className,...p},ref)=><P.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/80",className)}{...p}/>);DialogOverlay.displayName="DialogOverlay";
const DialogContent=React.forwardRef<any,any>(({className,children,...p},ref)=>(<DialogPortal><DialogOverlay/><P.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",className)}{...p}>{children}<P.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"><X className="h-4 w-4"/></P.Close></P.Content></DialogPortal>));DialogContent.displayName="DialogContent";
function DialogHeader({className,...p}:any){return<div className={cn("flex flex-col space-y-1.5 text-center sm:text-left",className)}{...p}/>}
function DialogFooter({className,...p}:any){return<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",className)}{...p}/>}
const DialogTitle=React.forwardRef<any,any>(({className,...p},ref)=><P.Title ref={ref} className={cn("text-lg font-semibold leading-none tracking-tight",className)}{...p}/>);DialogTitle.displayName="DialogTitle";
const DialogDescription=React.forwardRef<any,any>(({className,...p},ref)=><P.Description ref={ref} className={cn("text-sm text-muted-foreground",className)}{...p}/>);DialogDescription.displayName="DialogDescription";
export{Dialog,DialogPortal,DialogOverlay,DialogTrigger,DialogClose,DialogContent,DialogHeader,DialogFooter,DialogTitle,DialogDescription};
