/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Constants from '../constants';
import {ASTNode, ShortcutRegistry, utils as BlocklyUtils} from 'blockly';
import type {Block, WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * Actions for moving blocks with keyboard shortcuts.
 */
export class Mover {
  /**
   * Function provided by the navigation controller to say whether editing
   * is allowed.
   */
  protected canCurrentlyEdit: (ws: WorkspaceSvg) => boolean;

  /**
   * Map of moves in progress.
   *
   * An entry for a given workspace in this map means that the this
   * Mover is moving a block on that workspace, and will disable
   * normal cursor movement until the move is complete.
   */
  protected moves: Map<WorkspaceSvg, MoveInfo> = new Map();

  constructor(
    protected navigation: Navigation,
    canEdit: (ws: WorkspaceSvg) => boolean,
  ) {
    this.canCurrentlyEdit = canEdit;
  }

  private shortcuts: ShortcutRegistry.KeyboardShortcut[] = [
    // Begin and end move.
    {
      name: 'Start move',
      preconditionFn: (workspace) => this.canMove(workspace),
      callback: (workspace) => this.startMove(workspace),
      keyCodes: [KeyCodes.M],
      allowCollision: true, // TODO: remove once #309 has been merged.
    },
    {
      name: 'Finish move',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.finishMove(workspace),
      keyCodes: [KeyCodes.ENTER],
      allowCollision: true,
    },
    {
      name: 'Abort move',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.abortMove(workspace),
      keyCodes: [KeyCodes.ESC],
      allowCollision: true,
    },

    // Constrained moves.
    {
      name: 'Move left, constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ...*/),
      keyCodes: [KeyCodes.LEFT],
      allowCollision: true,
    },
    {
      name: 'Move right unconstraind',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ... */),
      keyCodes: [KeyCodes.RIGHT],
      allowCollision: true,
    },
    {
      name: 'Move up, constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ... */),
      keyCodes: [KeyCodes.UP],
      allowCollision: true,
    },
    {
      name: 'Move down constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace /* , ... */),
      keyCodes: [KeyCodes.DOWN],
      allowCollision: true,
    },

    // Unconstrained moves.
    {
      name: 'Move left, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, -1, 0),
      keyCodes: [createSerializedKey(KeyCodes.LEFT, [KeyCodes.ALT])],
    },
    {
      name: 'Move right, unconstraind',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 1, 0),
      keyCodes: [createSerializedKey(KeyCodes.RIGHT, [KeyCodes.ALT])],
    },
    {
      name: 'Move up unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 0, -1),
      keyCodes: [createSerializedKey(KeyCodes.UP, [KeyCodes.ALT])],
    },
    {
      name: 'Move down, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 0, 1),
      keyCodes: [createSerializedKey(KeyCodes.DOWN, [KeyCodes.ALT])],
    },
  ];

  /**
   * Install the actions as both keyboard shortcuts and (where
   * applicable) context menu items.
   */
  install() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.register(shortcut);
    }
  }

  /**
   * Uninstall these actions.
   */
  uninstall() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.unregister(shortcut.name);
    }
  }

  /**
   * Returns true iff we are able to begin moving a block on the given
   * workspace.
   *
   * @param workspace The workspace to move on.
   * @returns True iff we can beign a move.
   */
  canMove(workspace: WorkspaceSvg) {
    // TODO: also check if current block is movable.
    return (
      this.navigation.getState(workspace) === Constants.STATE.WORKSPACE &&
      this.canCurrentlyEdit(workspace) &&
      !this.moves.has(workspace)
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
    return this.canCurrentlyEdit(workspace) && this.moves.has(workspace);
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
    const curNode = cursor?.getCurNode();
    const block = curNode?.getSourceBlock();
    if (!block || !block.isMovable()) return false;

    console.log('startMove');

    this.moves.set(workspace, {});
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
    if (!workspace) return false;

    console.log('finishMove');

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
    if (!workspace) return false;

    console.log('abortMove');

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
  moveConstrained(
    workspace: WorkspaceSvg,
    /* ... */
  ) {
    console.log('moveConstrained');
    // Not yet implemented.  Absorb keystroke to avoid moving cursor.
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
  moveUnconstrained(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
    console.log('moveUnconstrained');
    // Not yet implemented.  Absorb keystroke to avoid moving cursor.
    return true;
  }
}

/**
 * Information about the currently in-progress move for a given
 * Workspace.
 */
type MoveInfo = {};
