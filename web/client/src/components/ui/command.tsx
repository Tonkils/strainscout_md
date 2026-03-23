import * as React from "react";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return <CommandPrimitive className={cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", className)} {...props} />;
}
const CommandInput = React.forwardRef<any, any>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b px-3"><CommandPrimitive.Input ref={ref} className={cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} /></div>
));
CommandInput.displayName = "CommandInput";
function CommandList({ className, ...props }: any) { return <CommandPrimitive.List className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)} {...props} />; }
function CommandEmpty(props: any) { return <CommandPrimitive.Empty className="py-6 text-center text-sm" {...props} />; }
function CommandGroup({ className, ...props }: any) { return <CommandPrimitive.Group className={cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", className)} {...props} />; }
function CommandItem({ className, ...props }: any) { return <CommandPrimitive.Item className={cn("relative flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", className)} {...props} />; }
function CommandSeparator({ className, ...props }: any) { return <CommandPrimitive.Separator className={cn("-mx-1 h-px bg-border", className)} {...props} />; }
export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator };
