import * as React from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type TooltipSide = "top" | "right" | "bottom" | "left";
type TooltipAlign = "start" | "center" | "end";

type TooltipProviderProps = {
  children: React.ReactNode;
  delayDuration?: number;
};

type TooltipContextValue = {
  open: boolean;
  contentId: string;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  openTooltip: () => void;
  closeTooltip: () => void;
};

const TooltipConfigContext = React.createContext<{ delayDuration: number }>({ delayDuration: 0 });
const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string) {
  const context = React.useContext(TooltipContext);

  if (!context) {
    throw new Error(`${component} must be used within <Tooltip>`);
  }

  return context;
}

function composeEventHandlers<E>(
  original?: (event: E) => void,
  next?: (event: E) => void,
) {
  return (event: E) => {
    original?.(event);
    next?.(event);
  };
}

function setRef<T>(ref: React.Ref<T> | undefined, value: T) {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (value: T) => {
    refs.forEach((ref) => setRef(ref, value));
  };
}

const TooltipProvider = ({ children, delayDuration = 0 }: TooltipProviderProps) => {
  return (
    <TooltipConfigContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipConfigContext.Provider>
  );
};
TooltipProvider.displayName = "TooltipProvider";

const Tooltip = ({ children }: { children: React.ReactNode }) => {
  const { delayDuration } = React.useContext(TooltipConfigContext);
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();
  const timeoutRef = React.useRef<number | null>(null);

  const clearPending = React.useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const openTooltip = React.useCallback(() => {
    clearPending();

    if (delayDuration > 0) {
      timeoutRef.current = window.setTimeout(() => setOpen(true), delayDuration);
      return;
    }

    setOpen(true);
  }, [clearPending, delayDuration]);

  const closeTooltip = React.useCallback(() => {
    clearPending();
    setOpen(false);
  }, [clearPending]);

  React.useEffect(() => () => clearPending(), [clearPending]);

  return (
    <TooltipContext.Provider value={{ open, contentId, triggerRef, openTooltip, closeTooltip }}>
      {children}
    </TooltipContext.Provider>
  );
};
Tooltip.displayName = "Tooltip";

type TooltipTriggerProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  children: React.ReactNode;
};

const TooltipTrigger = React.forwardRef<HTMLElement, TooltipTriggerProps>(
  ({ asChild, children, onMouseEnter, onMouseLeave, onFocus, onBlur, ...props }, forwardedRef) => {
    const { contentId, open, triggerRef, openTooltip, closeTooltip } = useTooltipContext("TooltipTrigger");

    const triggerProps = {
      ...props,
      "aria-describedby": open ? contentId : undefined,
      "data-state": open ? "open" : "closed",
      onMouseEnter: composeEventHandlers(onMouseEnter, openTooltip),
      onMouseLeave: composeEventHandlers(onMouseLeave, closeTooltip),
      onFocus: composeEventHandlers(onFocus, openTooltip),
      onBlur: composeEventHandlers(onBlur, closeTooltip),
    };

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;

      return React.cloneElement(child, {
        ...triggerProps,
        ref: mergeRefs(forwardedRef, (child as { ref?: React.Ref<HTMLElement> }).ref, (node: HTMLElement | null) => {
          triggerRef.current = node;
        }),
      });
    }

    return (
      <span
        {...triggerProps}
        ref={mergeRefs(forwardedRef, (node: HTMLElement | null) => {
          triggerRef.current = node;
        })}
        tabIndex={0}
      >
        {children}
      </span>
    );
  },
);
TooltipTrigger.displayName = "TooltipTrigger";

type TooltipContentProps = React.HTMLAttributes<HTMLDivElement> & {
  side?: TooltipSide;
  align?: TooltipAlign;
  sideOffset?: number;
};

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, side = "top", align = "center", sideOffset = 4, style, hidden, children, ...props }, forwardedRef) => {
    const { open, contentId, triggerRef } = useTooltipContext("TooltipContent");
    const localRef = React.useRef<HTMLDivElement | null>(null);
    const [position, setPosition] = React.useState({ top: -9999, left: -9999, ready: false });

    const updatePosition = React.useCallback(() => {
      if (!triggerRef.current || !localRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const contentRect = localRef.current.getBoundingClientRect();
      const viewportPadding = 8;

      let top = 0;
      let left = 0;

      if (side === "bottom") top = triggerRect.bottom + sideOffset;
      if (side === "top") top = triggerRect.top - contentRect.height - sideOffset;
      if (side === "left") left = triggerRect.left - contentRect.width - sideOffset;
      if (side === "right") left = triggerRect.right + sideOffset;

      if (side === "top" || side === "bottom") {
        if (align === "start") left = triggerRect.left;
        if (align === "center") left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        if (align === "end") left = triggerRect.right - contentRect.width;
      }

      if (side === "left" || side === "right") {
        if (align === "start") top = triggerRect.top;
        if (align === "center") top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        if (align === "end") top = triggerRect.bottom - contentRect.height;
      }

      top = Math.max(viewportPadding, Math.min(top, window.innerHeight - contentRect.height - viewportPadding));
      left = Math.max(viewportPadding, Math.min(left, window.innerWidth - contentRect.width - viewportPadding));

      setPosition({ top, left, ready: true });
    }, [align, side, sideOffset, triggerRef]);

    React.useLayoutEffect(() => {
      if (!open || hidden) return;

      updatePosition();
      window.addEventListener("resize", updatePosition);
      window.addEventListener("scroll", updatePosition, true);

      return () => {
        window.removeEventListener("resize", updatePosition);
        window.removeEventListener("scroll", updatePosition, true);
      };
    }, [hidden, open, updatePosition]);

    if (!open || hidden || typeof document === "undefined") {
      return null;
    }

    return createPortal(
      <div
        {...props}
        id={contentId}
        role="tooltip"
        ref={mergeRefs(forwardedRef, (node: HTMLDivElement | null) => {
          localRef.current = node;
        })}
        data-state={open ? "open" : "closed"}
        data-side={side}
        style={{
          position: "fixed",
          top: position.top,
          left: position.left,
          visibility: position.ready ? "visible" : "hidden",
          ...style,
        }}
        className={cn(
          "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
      >
        {children}
      </div>,
      document.body,
    );
  },
);
TooltipContent.displayName = "TooltipContent";

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
