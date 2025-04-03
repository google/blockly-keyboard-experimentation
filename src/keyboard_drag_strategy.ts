/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {dragging, utils} from 'blockly';
import {Direction, getDirectionFromXY} from './drag_direction';

export class KeyboardDragStrategy extends dragging.BlockDragStrategy {
  private currentDragDirection: Direction | null = null;

  override startDrag(e?: PointerEvent) {
    super.startDrag(e);
    // Set position of the dragging block, so that it doesn't pop
    // to the top left of the workspace.
    // @ts-expect-error block and startLoc are private.
    this.block.moveDuringDrag(this.startLoc);
  }

  override drag(newLoc: utils.Coordinate, e?: PointerEvent): void {
    if (!e) return;
    this.currentDragDirection = getDirectionFromXY({x: e.tiltX, y: e.tiltY});
    super.drag(newLoc);
  }

  /**
   * Get whether the most recent drag event represents a constrained
   * keyboard drag.
   *
   * @returns true if the current movement is constrained, otherwise false.
   */
  private isConstrainedMovement(): boolean {
    return !!this.currentDragDirection;
  }
}
