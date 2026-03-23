import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

function ResizablePanelGroup({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  return <ResizablePrimitive.PanelGroup className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)} {...props} />;
}
const ResizablePanel = ResizablePrimitive.Panel;
function ResizableHandle({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & { withHandle?: boolean }) {
  return <ResizablePrimitive.PanelResizeHandle className={cn("relative flex w-px items-center justify-center bg-border", className)} {...props} />;
}
export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
