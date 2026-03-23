import * as React from "react";
import * as P from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
const AlertDialog = P.Root; const AlertDialogTrigger = P.Trigger; const AlertDialogPortal = P.Portal;
const AlertDialogOverlay = React.forwardRef<any,any>(({className,...p},ref)=><P.Overlay className={cn("fixed inset-0 z-50 bg-black/80",className)} {...p} ref={ref}/>);AlertDialogOverlay.displayName="AlertDialogOverlay";
function AlertDialogContent({className,...p}:any){return<AlertDialogPortal><AlertDialogOverlay/><P.Content className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg",className)}{...p}/></AlertDialogPortal>}
function AlertDialogHeader({className,...p}:any){return<div className={cn("flex flex-col space-y-2 text-center sm:text-left",className)}{...p}/>}
function AlertDialogFooter({className,...p}:any){return<div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",className)}{...p}/>}
const AlertDialogTitle=React.forwardRef<any,any>(({className,...p},ref)=><P.Title ref={ref} className={cn("text-lg font-semibold",className)}{...p}/>);AlertDialogTitle.displayName="AlertDialogTitle";
const AlertDialogDescription=React.forwardRef<any,any>(({className,...p},ref)=><P.Description ref={ref} className={cn("text-sm text-muted-foreground",className)}{...p}/>);AlertDialogDescription.displayName="AlertDialogDescription";
const AlertDialogAction=React.forwardRef<any,any>(({className,...p},ref)=><P.Action ref={ref} className={cn(buttonVariants(),className)}{...p}/>);AlertDialogAction.displayName="AlertDialogAction";
const AlertDialogCancel=React.forwardRef<any,any>(({className,...p},ref)=><P.Cancel ref={ref} className={cn(buttonVariants({variant:"outline"}),"mt-2 sm:mt-0",className)}{...p}/>);AlertDialogCancel.displayName="AlertDialogCancel";
export{AlertDialog,AlertDialogPortal,AlertDialogOverlay,AlertDialogTrigger,AlertDialogContent,AlertDialogHeader,AlertDialogFooter,AlertDialogTitle,AlertDialogDescription,AlertDialogAction,AlertDialogCancel};
