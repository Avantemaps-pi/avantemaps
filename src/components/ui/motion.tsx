
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

const Motion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    initial?: Record<string, any>;
    animate?: Record<string, any>;
    transition?: Record<string, any>;
    whileHover?: Record<string, any>;
    whileTap?: Record<string, any>;
    whileFocus?: Record<string, any>;
    whileInView?: Record<string, any>;
    skipMobileAnimations?: boolean;
  }
>(
  (
    {
      className,
      initial,
      animate,
      transition,
      whileHover,
      whileTap,
      whileFocus,
      whileInView,
      skipMobileAnimations = false,
      ...props
    },
    ref
  ) => {
    const [isClient, setIsClient] = React.useState(false);
    const isMobile = useIsMobile();

    React.useEffect(() => {
      setIsClient(true);
    }, []);

    const shouldApplyAnimations = React.useMemo(() => {
      return isClient && (!skipMobileAnimations || !isMobile);
    }, [isClient, skipMobileAnimations, isMobile]);

    const style = React.useMemo(() => {
      if (!shouldApplyAnimations) {
        return {};
      }

      let styles: Record<string, any> = { ...initial };

      if (animate) {
        styles = { ...styles, ...animate };
      }

      if (transition) {
        const { duration } = transition;
        styles['transition'] = `all ${duration || 0.3}s ease`;
      }

      return styles;
    }, [shouldApplyAnimations, initial, animate, transition]);

    const handleMouseEnter = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!shouldApplyAnimations || !whileHover) return;

        const target = e.currentTarget;
        
        Object.entries(whileHover).forEach(([key, value]) => {
          if (key === "scale" || key === "x" || key === "y") {
            target.style.transform = `${target.style.transform || ""} ${key}(${value})`.trim();
          } else {
            (target.style as any)[key] = value;
          }
        });
      },
      [shouldApplyAnimations, whileHover]
    );

    const handleMouseLeave = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!shouldApplyAnimations || !whileHover) return;

        const target = e.currentTarget;
        
        // Reset to animate state
        Object.keys(whileHover).forEach((key) => {
          if (key === "scale" || key === "x" || key === "y") {
            target.style.transform = animate?.['transform'] || "";
          } else {
            (target.style as any)[key] = animate?.[key] || "";
          }
        });
      },
      [shouldApplyAnimations, whileHover, animate]
    );

    const handleTouchStart = React.useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        if (!shouldApplyAnimations || !whileTap) return;

        const target = e.currentTarget;
        
        Object.entries(whileTap).forEach(([key, value]) => {
          if (key === "scale" || key === "x" || key === "y") {
            target.style.transform = `${target.style.transform || ""} ${key}(${value})`.trim();
          } else {
            (target.style as any)[key] = value;
          }
        });
      },
      [shouldApplyAnimations, whileTap]
    );

    const handleTouchEnd = React.useCallback(
      (e: React.TouchEvent<HTMLDivElement>) => {
        if (!shouldApplyAnimations || !whileTap) return;

        const target = e.currentTarget;
        
        // Reset to animate state
        Object.keys(whileTap).forEach((key) => {
          if (key === "scale" || key === "x" || key === "y") {
            target.style.transform = animate?.['transform'] || "";
          } else {
            (target.style as any)[key] = animate?.[key] || "";
          }
        });
      },
      [shouldApplyAnimations, whileTap, animate]
    );

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={style}
        onMouseEnter={whileHover ? handleMouseEnter : undefined}
        onMouseLeave={whileHover ? handleMouseLeave : undefined}
        onTouchStart={whileTap ? handleTouchStart : undefined}
        onTouchEnd={whileTap ? handleTouchEnd : undefined}
        {...props}
      />
    );
  }
);

Motion.displayName = "Motion";

export { Motion };
export const motion = {
  div: Motion,
};
