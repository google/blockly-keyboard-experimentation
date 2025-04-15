/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
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
      preconditionFn: (workspace) => this.mover.canMove(workspace),
      callback: (workspace) => this.mover.startMove(workspace),
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
        return this.mover.canMove(workspace) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const workspace = scope.block?.workspace as WorkspaceSvg | null;
        if (!workspace) return false;
        this.mover.startMove(workspace);
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
}
