/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextMenuRegistry,
  Msg,
  ShortcutRegistry,
  utils,
  WorkspaceSvg,
} from 'blockly';
import {Direction} from '../drag_direction';
import {Mover} from './mover';
import {getShortActionShortcut} from '../shortcut_formatting';
const KeyCodes = utils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * Actions for moving blocks with keyboard shortcuts.
 */
export class MoveActions {
  constructor(private mover: Mover) {}

  private shortcutNames: Array<string> = [];
  private menuItemNames: Array<string> = [];

  private registerShortcuts() {
    const shortcuts: ShortcutRegistry.KeyboardShortcut[] = [
      // Begin and end move.
      {
        name: Msg['START_MOVE'],
        preconditionFn: (workspace) => this.mover.canMove(workspace),
        callback: (workspace) => this.mover.startMove(workspace),
        keyCodes: [KeyCodes.M],
      },
      {
        name: Msg['FINISH_MOVE'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) => this.mover.finishMove(workspace),
        keyCodes: [KeyCodes.ENTER, KeyCodes.SPACE],
        allowCollision: true,
      },
      {
        name: Msg['ABORT_MOVE'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) => this.mover.abortMove(workspace),
        keyCodes: [KeyCodes.ESC],
        allowCollision: true,
      },

      // Constrained moves.
      {
        name: Msg['MOVE_LEFT_CONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveConstrained(workspace, Direction.Left),
        keyCodes: [KeyCodes.LEFT],
        allowCollision: true,
      },
      {
        name: Msg['MOVE_RIGHT_CONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveConstrained(workspace, Direction.Right),
        keyCodes: [KeyCodes.RIGHT],
        allowCollision: true,
      },
      {
        name: Msg['MOVE_UP_CONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveConstrained(workspace, Direction.Up),
        keyCodes: [KeyCodes.UP],
        allowCollision: true,
      },
      {
        name: Msg['MOVE_DOWN_CONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveConstrained(workspace, Direction.Down),
        keyCodes: [KeyCodes.DOWN],
        allowCollision: true,
      },

      // Unconstrained moves.
      {
        name: Msg['MOVE_LEFT_UNCONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveUnconstrained(workspace, Direction.Left),
        keyCodes: [
          createSerializedKey(KeyCodes.LEFT, [KeyCodes.ALT]),
          createSerializedKey(KeyCodes.LEFT, [KeyCodes.CTRL]),
        ],
      },
      {
        name: Msg['MOVE_RIGHT_UNCONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveUnconstrained(workspace, Direction.Right),
        keyCodes: [
          createSerializedKey(KeyCodes.RIGHT, [KeyCodes.ALT]),
          createSerializedKey(KeyCodes.RIGHT, [KeyCodes.CTRL]),
        ],
      },
      {
        name: Msg['MOVE_UP_UNCONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveUnconstrained(workspace, Direction.Up),
        keyCodes: [
          createSerializedKey(KeyCodes.UP, [KeyCodes.ALT]),
          createSerializedKey(KeyCodes.UP, [KeyCodes.CTRL]),
        ],
      },
      {
        name: Msg['MOVE_DOWN_UNCONSTRAINED'],
        preconditionFn: (workspace) => this.mover.isMoving(workspace),
        callback: (workspace) =>
          this.mover.moveUnconstrained(workspace, Direction.Down),
        keyCodes: [
          createSerializedKey(KeyCodes.DOWN, [KeyCodes.ALT]),
          createSerializedKey(KeyCodes.DOWN, [KeyCodes.CTRL]),
        ],
      },
    ];

    for (const shortcut of shortcuts) {
      ShortcutRegistry.registry.register(shortcut);
      this.shortcutNames.push(shortcut.name);
    }
  }

  private registerMenuItems() {
    const menuItems: ContextMenuRegistry.RegistryItem[] = [
      {
        displayText: Msg['MOVE_BLOCK'].replace(
          '%1',
          getShortActionShortcut(Msg['START_MOVE']),
        ),
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
    for (const menuItem of menuItems) {
      ContextMenuRegistry.registry.register(menuItem);
      this.menuItemNames.push(menuItem.id);
    }
  }

  /**
   * Install the actions as both keyboard shortcuts and (where
   * applicable) context menu items.
   */
  install() {
    this.registerShortcuts();
    this.registerMenuItems();
  }

  /**
   * Uninstall these actions.
   */
  uninstall() {
    for (const shortcut of this.shortcutNames) {
      ShortcutRegistry.registry.unregister(shortcut);
    }
    for (const menuItem of this.menuItemNames) {
      ContextMenuRegistry.registry.unregister(menuItem);
    }
  }
}
