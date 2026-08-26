import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] border-2 border-foreground text-sm font-bold ring-offset-background transition-[transform,box-shadow,background-color,color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground shadow-[3px_3px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--ink)]",
				destructive:
					"bg-destructive text-destructive-foreground shadow-[3px_3px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
				outline:
					"bg-card text-foreground shadow-[3px_3px_0_var(--ink)] hover:bg-muted hover:translate-x-[-1px] hover:translate-y-[-1px]",
				secondary:
					"bg-secondary text-secondary-foreground shadow-[3px_3px_0_var(--ink)] hover:translate-x-[-1px] hover:translate-y-[-1px]",
				ghost: "border-transparent shadow-none hover:bg-muted hover:text-foreground active:translate-x-0 active:translate-y-0",
				link: "border-transparent text-primary underline-offset-4 shadow-none hover:underline active:translate-x-0 active:translate-y-0",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-[var(--radius-button)] px-3",
				lg: "h-11 rounded-[var(--radius-button)] px-8",
				icon: "h-10 w-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
