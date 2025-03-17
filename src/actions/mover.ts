/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Constants from '../constants';
import {
  ASTNode,
  Connection,
  ContextMenuRegistry,
  ShortcutRegistry,
  common,
  utils,
} from 'blockly';
import type {Block, BlockSvg, WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';

const KeyCodes = utils.KeyCodes;
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
      callback: (workspace) => this.moveConstrained(workspace, -1, 0),
      keyCodes: [KeyCodes.LEFT],
      allowCollision: true,
    },
    {
      name: 'Move right unconstraind',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace, 1, 0),
      keyCodes: [KeyCodes.RIGHT],
      allowCollision: true,
    },
    {
      name: 'Move up, constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace, 0, -1),
      keyCodes: [KeyCodes.UP],
      allowCollision: true,
    },
    {
      name: 'Move down constrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveConstrained(workspace, 0, 1),
      keyCodes: [KeyCodes.DOWN],
      allowCollision: true,
    },

    // Unconstrained moves.
    {
      name: 'Move left, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, -1, 0),
      keyCodes: [
        createSerializedKey(KeyCodes.LEFT, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.LEFT, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move right, unconstraind',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 1, 0),
      keyCodes: [
        createSerializedKey(KeyCodes.RIGHT, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.RIGHT, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move up unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 0, -1),
      keyCodes: [
        createSerializedKey(KeyCodes.UP, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.UP, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move down, unconstrained',
      preconditionFn: (workspace) => this.isMoving(workspace),
      callback: (workspace) => this.moveUnconstrained(workspace, 0, 1),
      keyCodes: [
        createSerializedKey(KeyCodes.DOWN, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.DOWN, [KeyCodes.CTRL]),
      ],
    },
  ];

  menuItems: ContextMenuRegistry.RegistryItem[] = [
    {
      displayText: 'Move Block (M)',
      preconditionFn: (scope) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace) return 'hidden';
        return this.canMove(workspace, scope.block) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace) return false;
        this.startMove(workspace, scope.block);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'move',
      weight: 8.5,
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
    for (const menuItem of this.menuItems) {
      ContextMenuRegistry.registry.register(menuItem);
    }
  }

  /**
   * Uninstall these actions.
   */
  uninstall() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.unregister(shortcut.name);
    }
    for (const menuItem of this.menuItems) {
      ContextMenuRegistry.registry.unregister(menuItem.id);
    }
  }

  /**
   * Returns true iff we are able to begin moving the given block (or,
   * if no block supplied, the block wich currently has focus) on the
   * given workspace.
   *
   * @param workspace The workspace to move on.
   * @returns True iff we can beign a move.
   */
  canMove(workspace: WorkspaceSvg, block?: Block) {
    if (!block) {
      const cursor = workspace?.getCursor();
      const curNode = cursor?.getCurNode();
      block = curNode?.getSourceBlock() ?? undefined;
    }

    return !!(
      this.navigation.getState(workspace) === Constants.STATE.WORKSPACE &&
      this.canCurrentlyEdit(workspace) &&
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
  startMove(workspace: WorkspaceSvg, block?: Block) {
    const cursor = workspace?.getCursor();
    if (!block) {
      const curNode = cursor?.getCurNode();
      block = curNode?.getSourceBlock() ?? undefined;
    }
    if (!cursor || !block) throw new Error('precondition failure');

    // Select and focus block.
    common.setSelected(block as BlockSvg);
    cursor.setCurNode(ASTNode.createBlockNode(block)!);

    // Additional implementation goes here.
    console.log('startMove');

    this.moves.set(workspace, new MoveInfo(block));
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
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Additional implementation goes here.
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
    const info = this.moves.get(workspace);
    if (!info) throw new Error('no move info for workspace');

    // Additional implementation goes here.
    console.log('abortMove');

    this.moves.delete(workspace);
    return true;
  }

  /**
   * Action to move the item being moved in the given direction,
   * constrained to valid attachment points (if any).
   *
   * @param workspace The workspace to move on.
   * @param xDirection -1 to move left. 1 to move right.
   * @param yDirection -1 to move up. 1 to move down.
   * @returns True iff this action applies and has been performed.
   */
  moveConstrained(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
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
export class MoveInfo {
  public readonly parentNext: Connection | null;
  public readonly parentInput: Connection | null;
  public readonly startLocation: utils.Coordinate;

  constructor(public readonly block: Block) {
    this.parentNext = block.previousConnection?.targetConnection ?? null;
    this.parentInput = block.outputConnection?.targetConnection ?? null;
    this.startLocation = block.getRelativeToSurfaceXY();
  }
}
