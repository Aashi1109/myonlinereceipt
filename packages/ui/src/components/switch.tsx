"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "#lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default" | "lg";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent p-[3px] transition-[background-color,box-shadow] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-border disabled:opacity-70 data-[size=default]:h-[26px] data-[size=default]:w-11 data-[size=lg]:h-8 data-[size=lg]:w-[52px] data-[size=sm]:h-6 data-[size=sm]:w-10 data-[state=checked]:justify-end data-[state=checked]:bg-primary data-[state=unchecked]:justify-start data-[state=unchecked]:bg-input",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full bg-white shadow-[0_1px_2px_#00000026] ring-0 group-data-[size=default]/switch:size-5 group-data-[size=lg]/switch:size-6 group-data-[size=sm]/switch:size-[18px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
