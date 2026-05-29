/**
 * AiRefCheck - Avatar Component
 * User avatar with image and fallback support.
 * Follows shadcn/ui avatar patterns with graceful image error handling.
 */

"use client";

import React from "react";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                  Avatar                                    */
/* -------------------------------------------------------------------------- */

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
          className
        )}
        {...props}
      />
    );
  }
);
Avatar.displayName = "Avatar";

/* -------------------------------------------------------------------------- */
/*                               AvatarImage                                  */
/* -------------------------------------------------------------------------- */

export interface AvatarImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onError, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    const handleError = React.useCallback(
      (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setHasError(true);
        onError?.(event);
      },
      [onError]
    );

    if (hasError) {
      return null;
    }

    return (
      <img
        ref={ref}
        className={cn("aspect-square h-full w-full", className)}
        onError={handleError}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

/* -------------------------------------------------------------------------- */
/*                             AvatarFallback                                 */
/* -------------------------------------------------------------------------- */

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLSpanElement> {}

const AvatarFallback = React.forwardRef<HTMLSpanElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full bg-muted",
          className
        )}
        {...props}
      />
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
