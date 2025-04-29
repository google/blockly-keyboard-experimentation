/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  utils as BlocklyUtils,
  BlockSvg,
  Events,
  WorkspaceSvg,
} from 'blockly/core';

import {showConstrainedMovementHint, showUnconstrainedMoveHint} from '../hints';
import type {Navigation} from '../navigation';
import {Mover} from './mover';

/**
 * Class with common insert logic.
 */
export class Inserter {
  constructor(
    private mover: Mover,
    private navigation: Navigation,
  ) {}

  /**
   * Inserts a block and leaves the block in move mode.
   *
   * Tries to find a connection on the block to connect to the cursor
   * If no connection has been marked, or there is not a compatible
   * connection then the block is placed on the workspace in free space.
   *
   * @param workspace The main workspace. The workspace
   *     the block will be placed on.
   * @param blockFactory Creates the new block, e.g. from flyout or clipboard.
   * @return true if a block was inserted, false otherwise.
   */
  insert(
    workspace: WorkspaceSvg,
    blockFactory: (workspace: WorkspaceSvg) => BlockSvg | null,
  ): boolean {
    workspace.setResizesEnabled(false);
    // Create a new event group or append to the existing group.
    const existingGroup = Events.getGroup();
    if (!existingGroup) {
      Events.setGroup(true);
    }

    const stationaryNode = this.navigation.getStationaryNode(workspace);
    const newBlock = blockFactory(workspace);
    if (!newBlock) return false;
    const insertStartPoint = stationaryNode
      ? this.navigation.findInsertStartPoint(stationaryNode, newBlock)
      : null;
    if (workspace.getTopBlocks().includes(newBlock)) {
      this.positionNewTopLevelBlock(workspace, newBlock);
    }

    workspace.setResizesEnabled(true);

    this.navigation.focusWorkspace(workspace);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    workspace.getCursor()?.setCurNode(ASTNode.createBlockNode(newBlock)!);
    this.mover.startMove(workspace, newBlock, insertStartPoint);

    const isStartBlock =
      !newBlock.outputConnection &&
      !newBlock.nextConnection &&
      !newBlock.previousConnection;
    if (isStartBlock) {
      showUnconstrainedMoveHint(workspace, false);
    } else {
      showConstrainedMovementHint(workspace);
    }
    return true;
  }

  /**
   * Position a new top-level block to avoid overlap at the top left.
   *
   * Similar to `WorkspaceSvg.cleanUp()` but does not constrain itself to not
   * affecting code ordering in order to use horizontal space.
   *
   * @param workspace The workspace.
   * @param newBlock The top-level block to move to free space.
   */
  private positionNewTopLevelBlock(
    workspace: WorkspaceSvg,
    newBlock: BlockSvg,
  ) {
    const initialY = 10;
    const initialX = 10;
    const xSpacing = 80;

    const filteredTopBlocks = workspace
      .getTopBlocks(true)
      .filter((block) => block.id !== newBlock.id);
    const allBlockBounds = filteredTopBlocks.map((block) =>
      block.getBoundingRectangle(),
    );

    const toolboxWidth = workspace.getToolbox()?.getWidth();
    const workspaceWidth =
      workspace.getParentSvg().clientWidth - (toolboxWidth ?? 0);
    const workspaceHeight = workspace.getParentSvg().clientHeight;
    const {height: newBlockHeight, width: newBlockWidth} =
      newBlock.getHeightWidth();

    const getNextIntersectingBlock = function (
      newBlockRect: BlocklyUtils.Rect,
    ): BlocklyUtils.Rect | null {
      for (const rect of allBlockBounds) {
        if (newBlockRect.intersects(rect)) {
          return rect;
        }
      }
      return null;
    };

    let cursorY = initialY;
    let cursorX = initialX;
    const minBlockHeight = workspace
      .getRenderer()
      .getConstants().MIN_BLOCK_HEIGHT;
    // Make the initial movement of shifting the block to its best possible position.
    let boundingRect = newBlock.getBoundingRectangle();
    newBlock.moveBy(cursorX - boundingRect.left, cursorY - boundingRect.top, [
      'cleanup',
    ]);
    newBlock.snapToGrid();

    boundingRect = newBlock.getBoundingRectangle();
    let conflictingRect = getNextIntersectingBlock(boundingRect);
    while (conflictingRect != null) {
      const newCursorX =
        conflictingRect.left + conflictingRect.getWidth() + xSpacing;
      const newCursorY =
        conflictingRect.top + conflictingRect.getHeight() + minBlockHeight;
      if (newCursorX + newBlockWidth <= workspaceWidth) {
        cursorX = newCursorX;
      } else if (newCursorY + newBlockHeight <= workspaceHeight) {
        cursorY = newCursorY;
        cursorX = initialX;
      } else {
        // Off screen, but new blocks will be selected which will scroll them
        // into view.
        cursorY = newCursorY;
        cursorX = initialX;
      }
      newBlock.moveBy(cursorX - boundingRect.left, cursorY - boundingRect.top, [
        'cleanup',
      ]);
      newBlock.snapToGrid();
      boundingRect = newBlock.getBoundingRectangle();
      conflictingRect = getNextIntersectingBlock(boundingRect);
    }

    newBlock.bringToFront();
  }
}
