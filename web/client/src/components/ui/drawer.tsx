import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

function Drawer(props: any) { return <DrawerPrimitive.Root {...props} />; }
function DrawerTrigger(props: any) { return <DrawerPrimitive.Trigger {...props} />; }
function DrawerClose(props: any) { return <DrawerPrimitive.Close {...props} />; }
function DrawerContent({ className, children, ...props }: any) {
  return <DrawerPrimitive.Portal><DrawerPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80" /><DrawerPrimitive.Content className={cn("fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background", className)} {...props}><div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />{children}</DrawerPrimitive.Content></DrawerPrimitive.Portal>;
}
function DrawerHeader({ className, ...props }: any) { return <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />; }
function DrawerFooter({ className, ...props }: any) { return <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />; }
function DrawerTitle(props: any) { return <DrawerPrimitive.Title {...props} />; }
function DrawerDescription(props: any) { return <DrawerPrimitive.Description {...props} />; }
export { Drawer, DrawerTrigger, DrawerClose, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription };
