export type DateStripArrowDirection = "left" | "right";

const buttonWidth = 54;
const fadeWidth = 32;
const overlayWidth = buttonWidth + fadeWidth;
const opacityStops = [0.9, 0.76, 0.6, 0.43, 0.28, 0.15, 0.06] as const;

export function getDateStripArrowLayout(direction: DateStripArrowDirection, backgroundColor: string) {
  const isLeft = direction === "left";
  return {
    overlayWidth,
    button: {
      backgroundColor,
      width: buttonWidth,
      left: isLeft ? 0 : undefined,
      right: isLeft ? undefined : 0,
    },
    gradient: {
      width: fadeWidth,
      left: isLeft ? buttonWidth : undefined,
      right: isLeft ? undefined : buttonWidth,
      opacityStops: isLeft ? opacityStops : [...opacityStops].reverse(),
    },
  };
}
