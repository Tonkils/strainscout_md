import * as React from "react";
import { OTPInput, OTPInputContext } from "input-otp";
import { cn } from "@/lib/utils";

function InputOTP({ className, ...props }: any) { return <OTPInput containerClassName={cn("flex items-center gap-2", className)} {...props} />; }
function InputOTPGroup({ className, ...props }: any) { return <div className={cn("flex items-center", className)} {...props} />; }
function InputOTPSlot({ index, className, ...props }: any) {
  const ctx = React.useContext(OTPInputContext);
  const slot = ctx?.slots?.[index] || {};
  return <div className={cn("relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md", className)} {...props}>{slot.char}</div>;
}
function InputOTPSeparator(props: any) { return <div role="separator" {...props}>-</div>; }
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator };
