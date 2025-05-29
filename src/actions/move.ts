/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockSvg,
  ContextMenuRegistry,
  FocusManager,
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
  /**
   * Stored to enable us to restore monkey patch.
   */
  private oldShortcutRegistryOnKeyDown:
    | typeof ShortcutRegistry.registry.onKeyDown
    | null = null;

  constructor(private mover: Mover) {}

  private shortcutNames: string[] = [];
  private menuItemNames: string[] = [];

  private registerShortcuts() {
    const shortcuts: ShortcutRegistry.KeyboardShortcut[] = [
      // Begin and end move.
      {
        name: Msg['START_MOVE'],
        preconditionFn: (workspace) => {
          const startBlock = this.getCurrentBlock(workspace);
          return !!startBlock && this.mover.canMove(workspace, startBlock);
        },
        callback: (workspace) => {
          const startBlock = this.getCurrentBlock(workspace);
          return (
            !!startBlock && this.mover.startMove(workspace, startBlock, null)
          );
        },
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

          const startBlock = this.getCurrentBlock(workspace);
          return !!startBlock && this.mover.canMove(workspace, startBlock)
            ? 'enabled'
            : 'disabled';
        },
        callback: (scope) => {
          const workspace = scope.block?.workspace as WorkspaceSvg | null;
          if (!workspace) return false;
          const startBlock = this.getCurrentBlock(workspace);
          return (
            !!startBlock && this.mover.startMove(workspace, startBlock, null)
          );
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

    // Monkey patch shortcut registry to: finish any in-progress move for all
    // non-move-related actions and bail on actions other than "escape" during
    // ephemeral focus.
    this.oldShortcutRegistryOnKeyDown = ShortcutRegistry.registry.onKeyDown;
    ShortcutRegistry.registry.onKeyDown = (workspace, e) => {
      if (!this.oldShortcutRegistryOnKeyDown) return false;
      // @ts-expect-error private method
      const key = ShortcutRegistry.registry.serializeKeyEvent(e);
      const shortcutNamesForKey =
        ShortcutRegistry.registry.getShortcutNamesByKeyCode(key);
      if (
        !this.shortcutNames.some((moveShortcutName) =>
          shortcutNamesForKey?.includes(moveShortcutName),
        )
      ) {
        if (this.mover.isMoving(workspace)) {
          this.mover.finishMove(workspace);
        }
      }

      // @ts-expect-error private method
      const {currentlyHoldsEphemeralFocus} = FocusManager.getFocusManager();
      if (
        currentlyHoldsEphemeralFocus &&
        !shortcutNamesForKey?.includes('escape')
      ) {
        return false;
      }

      return this.oldShortcutRegistryOnKeyDown.call(
        ShortcutRegistry.registry,
        workspace,
        e,
      );
    };
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

    if (this.oldShortcutRegistryOnKeyDown) {
      ShortcutRegistry.registry.onKeyDown = this.oldShortcutRegistryOnKeyDown;
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
    let block = workspace?.getCursor()?.getSourceBlock();
    if (!block) return undefined;
    while (block.isShadow()) {
      block = block.getParent();
      if (!block) {
        throw new Error(
          'Tried to drag a shadow block with no parent. ' +
            'Shadow blocks should always have parents.',
        );
      }
    }
    return block;
  }
}
