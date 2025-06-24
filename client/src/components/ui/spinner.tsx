import * as React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export const Spinner = ({ className, size = "md", ...props }: SpinnerProps) => {
  const sizeClass = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-solid border-[#3483FA] border-t-transparent",
        sizeClass[size],
        className
      )}
      {...props}
    >
      <span className="sr-only">Cargando...</span>
    </div>
  );
};