import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
function SheetContent({ className, children, ...props }: any) {
  return <SheetPrimitive.Portal><SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" /><SheetPrimitive.Content className={cn("fixed z-50 gap-4 bg-background p-6 shadow-lg inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm", className)} {...props}>{children}</SheetPrimitive.Content></SheetPrimitive.Portal>;
}
function SheetHeader({ className, ...props }: any) { return <div className={cn("flex flex-col space-y-2 text-center sm:text-left", className)} {...props} />; }
function SheetFooter({ className, ...props }: any) { return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />; }
function SheetTitle(props: any) { return <SheetPrimitive.Title {...props} />; }
function SheetDescription(props: any) { return <SheetPrimitive.Description {...props} />; }
export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };
