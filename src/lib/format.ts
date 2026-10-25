import type { Block } from "./types";

/** The block's invented street name, always marked as simulated wherever it's shown. */
export function streetLabel(block: Pick<Block, "street_label">): string {
  return `${block.street_label} (simulado)`;
}
