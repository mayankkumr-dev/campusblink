"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer data-[state=checked]:bg-accent-blue data-[state=unchecked]:bg-surface-elevated focus-visible:border-ring focus-visible:ring-accent-blue/50 inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-md border border-border-subtle transition-all outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "bg-white pointer-events-none block size-4 rounded-md ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 shadow-sm border border-border-subtle",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
