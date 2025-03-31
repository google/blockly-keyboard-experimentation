/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  BlockSvg,
  WorkspaceSvg,
  common,
  registry,
  utils,
} from 'blockly';
import type {Block, IDragger} from 'blockly';
import {Mover, MoveInfo} from './mover';

/**
 * The distance to move an item, in workspace coordinates, when
 * making an unconstrained move.
 */
const UNCONSTRAINED_MOVE_DISTANCE = 20;

/**
 * An experimental implementation of Mover that uses a dragger to
 * perform unconstrained movement.
 */
export class DragMover extends Mover {
  /**
   * Map of moves in progress.
   *
   * An entry for a given workspace in this map means that the this
   * Mover is moving a block on that workspace, and will disable
   * normal cursor movement until the move is complete.
   */
  protected declare moves: Map<WorkspaceSvg, DragMoveInfo>;

  /**
   * Start moving the currently-focused item on workspace, if
   * possible.
   *
   * Should only be called if canMove has returned true.
   *
   * @param workspace The workspace we might be moving on.
   * @returns True iff a move has successfully begun.
   */
  override startMove(workspace: WorkspaceSvg) {
    const cursor = workspace?.getCursor();
    const block = this.getCurrentBlock(workspace);
    if (!cursor || !block) throw new Error('precondition failure');

    // Select and focus block.
    common.setSelected(block);
    cursor.setCurNode(ASTNode.createBlockNode(block));
    // Begin dragging block.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(block, workspace);
    // Record that a move is in progress and start dragging.
    const info = new DragMoveInfo(block, dragger);
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
  override finishMove(workspace: WorkspaceSvg) {
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

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
  override abortMove(workspace: WorkspaceSvg) {
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Monkey patch dragger to trigger call to draggable.revertDrag.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (info.dragger as any).shouldReturnToStart = () => true;
    const blockSvg = info.block as BlockSvg;

    // Explicitly call `hidePreview` because it is not called in revertDrag.
    // @ts-expect-error Access to private property dragStrategy.
    blockSvg.dragStrategy.connectionPreviewer.hidePreview();
    info.dragger.onDragEnd(
      info.fakePointerEvent('pointerup'),
      new utils.Coordinate(0, 0),
    );

    this.moves.delete(workspace);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @returns True iff this action applies and has been performed.
   */
  override moveConstrained(
    workspace: WorkspaceSvg,
    /* ... */
  ) {
    // Not yet implemented.  Absorb keystroke to avoid moving cursor.
    alert(`Constrained movement not implemented.

Use ctrl+arrow or alt+arrow (option+arrow on macOS) for unconstrained move.
Use enter to complete the move, or escape to abort.`);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * without constraint.
   *
   * @param workspace The workspace to move on.
   * @param xDirection -1 to move left. 1 to move right.
   * @param yDirection -1 to move up. 1 to move down.
   * @returns True iff this action applies and has been performed.
   */
  override moveUnconstrained(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.totalDelta.x +=
      xDirection * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y +=
      yDirection * UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(info.fakePointerEvent('pointermove'), info.totalDelta);
    return true;
  }
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
class DragMoveInfo extends MoveInfo {
  /** Total distance moved, in screen pixels */
  totalDelta = new utils.Coordinate(0, 0);

  constructor(
    readonly block: Block,
    readonly dragger: IDragger,
  ) {
    super(block);
  }

  /**
   * Create a fake pointer event for dragging.
   *
   * @param type Which type of pointer event to create.
   * @returns A synthetic PointerEvent that can be consumed by Blockly's
   *     dragging code.
   */
  fakePointerEvent(type: string): PointerEvent {
    const workspace = this.block.workspace;
    if (!(workspace instanceof WorkspaceSvg)) throw new TypeError();

    const blockCoords = utils.svgMath.wsToScreenCoordinates(
      workspace,
      new utils.Coordinate(
        this.startLocation.x + this.totalDelta.x,
        this.startLocation.y + this.totalDelta.y,
      ),
    );
    return new PointerEvent(type, {
      clientX: blockCoords.x,
      clientY: blockCoords.y,
    });
  }
}
