/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {BlockSvg, IDragger, IDragStrategy} from 'blockly';
import {
  ASTNode,
  common,
  Connection,
  registry,
  utils,
  WorkspaceSvg,
} from 'blockly';
import * as Constants from '../constants';
import {Direction, getXYFromDirection} from '../drag_direction';
import {KeyboardDragStrategy} from '../keyboard_drag_strategy';
import {Navigation} from '../navigation';

/**
 * The distance to move an item, in workspace coordinates, when
 * making an unconstrained move.
 */
const UNCONSTRAINED_MOVE_DISTANCE = 20;

/**
 * Low-level code for moving blocks with keyboard shortcuts.
 */
export class Mover {
  /**
   * Map of moves in progress.
   *
   * An entry for a given workspace in this map means that the this
   * Mover is moving a block on that workspace, and will disable
   * normal cursor movement until the move is complete.
   */
  protected moves: Map<WorkspaceSvg, MoveInfo> = new Map();

  /**
   * The stashed isDragging function, which is replaced at the beginning
   * of a keyboard drag and reset at the end of a keyboard drag.
   */
  oldIsDragging: (() => boolean) | null = null;

  /**
   * The block's base drag strategy, which will be overridden during
   * keyboard drags and reset at the end of the drag.
   */
  private oldDragStrategy: IDragStrategy | null = null;

  constructor(protected navigation: Navigation) {}

  /**
   * Returns true iff we are able to begin moving the block which
   * currently has focus on the given workspace.
   *
   * @param workspace The workspace to move on.
   * @returns True iff we can begin a move.
   */
  canMove(workspace: WorkspaceSvg) {
    const block = this.getCurrentBlock(workspace);

    return !!(
      this.navigation.getState(workspace) === Constants.STATE.WORKSPACE &&
      this.navigation.canCurrentlyEdit(workspace) &&
      !this.moves.has(workspace) && // No move in progress.
      block?.isMovable()
    );
  }

  /**
   * Returns true iff we are currently moving a block on the given
   * workspace.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff we are moving.
   */
  isMoving(workspace: WorkspaceSvg) {
    return (
      this.navigation.canCurrentlyEdit(workspace) && this.moves.has(workspace)
    );
  }

  /**
   * Start moving the currently-focused item on workspace, if
   * possible.
   *
   * Should only be called if canMove has returned true.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff a move has successfully begun.
   */
  startMove(workspace: WorkspaceSvg) {
    const cursor = workspace?.getCursor();
    const block = this.getCurrentBlock(workspace);
    if (!cursor || !block) throw new Error('precondition failure');

    // Select and focus block.
    common.setSelected(block);
    cursor.setCurNode(ASTNode.createBlockNode(block));

    this.patchIsDragging(workspace);
    this.patchDragStrategy(block);
    // Begin dragging block.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(block, workspace);
    // Record that a move is in progress and start dragging.
    const info = new MoveInfo(block, dragger);
    this.moves.set(workspace, info);
    // Begin drag.
    dragger.onDragStart(info.fakePointerEvent('pointerdown'));
    return true;
  }

  /**
   * Finish moving the currently-focused item on workspace.
   *
   * Should only be called if isMoving has returned true.
   *
   * @param workspace The workspace on which we are moving.
   * @returns True iff move successfully finished.
   */
  finishMove(workspace: WorkspaceSvg) {
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.unpatchIsDragging(workspace);
    this.unpatchDragStrategy(info.block);
    this.moves.delete(workspace);
    return true;
  }

  /**
   * Abort moving the currently-focused item on workspace.
   *
   * Should only be called if isMoving has returned true.
   *
   * @param workspace The workspace on which we are moving.
   * @returns True iff move successfully aborted.
   */
  abortMove(workspace: WorkspaceSvg) {
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Monkey patch dragger to trigger call to draggable.revertDrag.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info.dragger as any).shouldReturnToStart = () => true;
    const blockSvg = info.block;

    // Explicitly call `hidePreview` because it is not called in revertDrag.
    // @ts-expect-error Access to private property dragStrategy.
    blockSvg.dragStrategy.connectionPreviewer.hidePreview();
    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.unpatchIsDragging(workspace);
    this.unpatchDragStrategy(info.block);
    this.moves.delete(workspace);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @param direction The direction to move the dragged item.
   * @returns True iff this action applies and has been performed.
   */
  moveConstrained(workspace: WorkspaceSvg, direction: Direction) {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDrag(
      info.fakePointerEvent('pointermove', direction),
      info.totalDelta,
    );

    info.updateTotalDelta();
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * without constraint.
   *
   * @param workspace The workspace to move on.
   * @param direction The direction to move the dragged item.
   * @returns True iff this action applies and has been performed.
   */
  moveUnconstrained(workspace: WorkspaceSvg, direction: Direction): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    const {x, y} = getXYFromDirection(direction);
    info.totalDelta.x += x * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y += y * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(info.fakePointerEvent('pointermove'), info.totalDelta);
    return true;
  }

  /**
   * Get the source block for the cursor location, or undefined if no
   * source block can be found.
   * If the cursor is on a shadow block, walks up the tree until it finds
   * a non-shadow block to drag.
   *
   * @param workspace The workspace to inspect for a cursor.
   * @returns The source block, or undefined if no appropriate block
   *     could be found.
   */
  protected getCurrentBlock(workspace: WorkspaceSvg): BlockSvg | undefined {
    const curNode = workspace?.getCursor()?.getCurNode();
    let block = curNode?.getSourceBlock();
    if (!block) return undefined;
    while (block && block.isShadow()) {
      block = block.getParent();
      if (!block) {
        throw new Error(
          'Tried to drag a shadow block with no parent. ' +
            'Shadow blocks should always have parents.',
        );
      }
    }
    return block as BlockSvg;
  }

  /**
   * Monkeypatch over workspace.isDragging to return whether a keyboard
   * drag is in progress.
   *
   * @param workspace The workspace to patch.
   */
  private patchIsDragging(workspace: WorkspaceSvg) {
    this.oldIsDragging = workspace.isDragging;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workspace as any).isDragging = () => this.isMoving(workspace);
  }

  /**
   * Remove the monkeypatch on workspace.isDragging.
   *
   * @param workspace The workspace to unpatch.
   */
  private unpatchIsDragging(workspace: WorkspaceSvg) {
    if (this.oldIsDragging) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (workspace as any).isDragging = this.oldIsDragging;
    }
  }
  /**
   * Monkeypatch: replace the block's drag strategy and cache the old value.
   *
   * @param block The block to patch.
   */
  private patchDragStrategy(block: BlockSvg) {
    // @ts-expect-error block.dragStrategy is private.
    this.oldDragStrategy = block.dragStrategy;
    block.setDragStrategy(new KeyboardDragStrategy(block));
  }

  /**
   * Undo the monkeypatching of the block's drag strategy.
   *
   * @param block The block to patch.
   */
  private unpatchDragStrategy(block: BlockSvg) {
    if (this.oldDragStrategy) {
      block.setDragStrategy(this.oldDragStrategy);
      this.oldDragStrategy = null;
    }
  }
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
export class MoveInfo {
  /** Total distance moved, in workspace units. */
  totalDelta = new utils.Coordinate(0, 0);
  readonly parentNext: Connection | null;
  readonly parentInput: Connection | null;
  readonly startLocation: utils.Coordinate;

  constructor(
    readonly block: BlockSvg,
    readonly dragger: IDragger,
  ) {
    this.parentNext = block.previousConnection?.targetConnection ?? null;
    this.parentInput = block.outputConnection?.targetConnection ?? null;
    this.startLocation = block.getRelativeToSurfaceXY();
  }

  /**
   * Create a fake pointer event for dragging.
   *
   * @param type Which type of pointer event to create.
   * @param direction The direction if this movement is a constrained drag.
   * @returns A synthetic PointerEvent that can be consumed by Blockly's
   *     dragging code.
   */
  fakePointerEvent(type: string, direction?: Direction): PointerEvent {
    const workspace = this.block.workspace;
    if (!(workspace instanceof WorkspaceSvg)) throw new TypeError();

    const blockCoords = utils.svgMath.wsToScreenCoordinates(
      workspace,
      new utils.Coordinate(
        this.startLocation.x + this.totalDelta.x,
        this.startLocation.y + this.totalDelta.y,
      ),
    );
    const tilts = getXYFromDirection(direction);
    return new PointerEvent(type, {
      clientX: blockCoords.x,
      clientY: blockCoords.y,
      tiltX: tilts.x,
      tiltY: tilts.y,
    });
  }

  /**
   * The keyboard drag may have moved the block to an appropriate location
   * for a preview. Update the saved delta to reflect the block's new
   * location, so that it does not jump during the next unconstrained move.
   */
  updateTotalDelta() {
    const workspace = this.block.workspace;
    if (!(workspace instanceof WorkspaceSvg)) throw new TypeError();

    this.totalDelta = new utils.Coordinate(
      this.block.relativeCoords.x - this.startLocation.x,
      this.block.relativeCoords.y - this.startLocation.y,
    );
  }
}
