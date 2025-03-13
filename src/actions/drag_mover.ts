/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Constants from '../constants';
import {
  ASTNode,
  Connection,
  ShortcutRegistry,
  common,
  registry,
  utils,
} from 'blockly';
import type {Block, BlockSvg, IDragger, WorkspaceSvg} from 'blockly';
import {Mover, MoveInfo} from './mover';
import {Navigation} from '../navigation';

/**
 * An experimental implementation of Mover that uses a dragger to
 * perform unconstraind movment.
 */
export class DragMover extends Mover {
  /**
   * The distance to move an item, in workspace coordinates, when
   * making an unconstrained move.
   */
  UNCONSTRAINED_MOVE_DISTANCE = 20;

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
    const curNode = cursor?.getCurNode();
    const block = curNode?.getSourceBlock() as BlockSvg | null;
    if (!cursor || !block) throw new Error('precondition failure');

    // Select and focus block.
    common.setSelected(block);
    cursor.setCurNode(ASTNode.createBlockNode(block)!);
    // Begin dragging block.
    const DraggerClass = registry.getClassFromOptions(
      registry.Type.BLOCK_DRAGGER,
      workspace.options,
      true,
    );
    if (!DraggerClass) throw new Error('no Dragger registered');
    const dragger = new DraggerClass(block, workspace);
    // Record that a move is in progress and start dragging.
    this.moves.set(workspace, new DragMoveInfo(block, dragger));
    dragger.onDragStart(new PointerEvent('pointerdown'));
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
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    info.dragger.onDragEnd(
      new PointerEvent('pointerup'),
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
    if (!workspace) return false;
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Monkey patch dragger to trigger call to draggable.revertDrag.
    (info.dragger as any).shouldReturnToStart = () => true;
    info.dragger.onDragEnd(
      new PointerEvent('pointerup'),
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
      xDirection * this.UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;
    info.totalDelta.y +=
      yDirection * this.UNCONSTRAINED_MOVE_DISTANCE * workspace.scale;

    info.dragger.onDrag(new PointerEvent('pointermove'), info.totalDelta);
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
    public readonly block: Block,
    public readonly dragger: IDragger,
  ) {
    super(block);
  }
}
