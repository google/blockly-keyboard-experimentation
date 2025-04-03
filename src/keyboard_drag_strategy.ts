/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {dragging} from 'blockly';

export class KeyboardDragStrategy extends dragging.BlockDragStrategy {
  override startDrag(e?: PointerEvent) {
    super.startDrag(e);
    // Set position of the dragging block, so that it doesn't pop
    // to the top left of the workspace.
    // @ts-expect-error block and startLoc are private.
    this.block.moveDuringDrag(this.startLoc);
  }
}
