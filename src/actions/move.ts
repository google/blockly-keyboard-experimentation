/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockSvg,
  ContextMenuRegistry,
  ShortcutRegistry,
  utils,
  WorkspaceSvg,
} from 'blockly';
import {Direction} from '../drag_direction';
import {Mover} from './mover';

const KeyCodes = utils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * Actions for moving blocks with keyboard shortcuts.
 */
export class MoveActions {
  constructor(private mover: Mover) {}

  private shortcuts: ShortcutRegistry.KeyboardShortcut[] = [
    // Begin and end move.
    {
      name: 'Start move',
      preconditionFn: (workspace) => {
        const startBlock = this.getCurrentBlock(workspace);
        return !!startBlock && this.mover.canMove(workspace, startBlock);
      },
      callback: (workspace) => {
        const startBlock = this.getCurrentBlock(workspace);
        return !!startBlock && this.mover.startMove(workspace, startBlock);
      },
      keyCodes: [KeyCodes.M],
    },
    {
      name: 'Finish move',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) => this.mover.finishMove(workspace),
      keyCodes: [KeyCodes.ENTER, KeyCodes.SPACE],
      allowCollision: true,
    },
    {
      name: 'Abort move',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) => this.mover.abortMove(workspace),
      keyCodes: [KeyCodes.ESC],
      allowCollision: true,
    },

    // Constrained moves.
    {
      name: 'Move left, constrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveConstrained(workspace, Direction.Left),
      keyCodes: [KeyCodes.LEFT],
      allowCollision: true,
    },
    {
      name: 'Move right constrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveConstrained(workspace, Direction.Right),
      keyCodes: [KeyCodes.RIGHT],
      allowCollision: true,
    },
    {
      name: 'Move up, constrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveConstrained(workspace, Direction.Up),
      keyCodes: [KeyCodes.UP],
      allowCollision: true,
    },
    {
      name: 'Move down constrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveConstrained(workspace, Direction.Down),
      keyCodes: [KeyCodes.DOWN],
      allowCollision: true,
    },

    // Unconstrained moves.
    {
      name: 'Move left, unconstrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveUnconstrained(workspace, Direction.Left),
      keyCodes: [
        createSerializedKey(KeyCodes.LEFT, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.LEFT, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move right, unconstrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveUnconstrained(workspace, Direction.Right),
      keyCodes: [
        createSerializedKey(KeyCodes.RIGHT, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.RIGHT, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move up unconstrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveUnconstrained(workspace, Direction.Up),
      keyCodes: [
        createSerializedKey(KeyCodes.UP, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.UP, [KeyCodes.CTRL]),
      ],
    },
    {
      name: 'Move down, unconstrained',
      preconditionFn: (workspace) => this.mover.isMoving(workspace),
      callback: (workspace) =>
        this.mover.moveUnconstrained(workspace, Direction.Down),
      keyCodes: [
        createSerializedKey(KeyCodes.DOWN, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.DOWN, [KeyCodes.CTRL]),
      ],
    },
  ];

  menuItems: ContextMenuRegistry.RegistryItem[] = [
    {
      displayText: 'Move Block (M)',
      preconditionFn: (scope, menuOpenEvent) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace || menuOpenEvent instanceof PointerEvent)
          return 'hidden';

        const startBlock = this.getCurrentBlock(workspace);
        return !!startBlock && this.mover.canMove(workspace, startBlock)
          ? 'enabled'
          : 'disabled';
      },
      callback: (scope) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace) return false;
        const startBlock = this.getCurrentBlock(workspace);
        return !!startBlock && this.mover.startMove(workspace, startBlock);
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
   * Get the source block for the cursor location, or undefined if no
   * source block can be found.
   * If the cursor is on a shadow block, walks up the tree until it finds
   * a non-shadow block to drag.
   *
   * @param workspace The workspace to inspect for a cursor.
   * @returns The source block, or undefined if no appropriate block
   *     could be found.
   */
  getCurrentBlock(workspace: WorkspaceSvg): BlockSvg | undefined {
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
}
