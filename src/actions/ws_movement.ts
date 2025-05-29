/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ShortcutRegistry,
  utils as BlocklyUtils,
  keyboardNavigationController,
} from 'blockly';
import * as Constants from '../constants';
import type {WorkspaceSvg} from 'blockly';
import {Navigation} from 'src/navigation';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * The distance to move the cursor when the cursor is on the workspace.
 */
const WS_MOVE_DISTANCE = 40;

/**
 * Logic for free movement of the cursor on the workspace with keyboard
 * shortcuts.
 */
export class WorkspaceMovement {
  constructor(private navigation: Navigation) {}

  private shortcuts: ShortcutRegistry.KeyboardShortcut[] = [
    /** Move the cursor on the workspace to the left. */
    {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_LEFT,
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyEdit(workspace),
      callback: (workspace) => this.moveWSCursor(workspace, -1, 0),
      keyCodes: [createSerializedKey(KeyCodes.A, [KeyCodes.SHIFT])],
    },
    /** Move the cursor on the workspace to the right. */
    {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_RIGHT,
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyEdit(workspace),
      callback: (workspace) => this.moveWSCursor(workspace, 1, 0),
      keyCodes: [createSerializedKey(KeyCodes.D, [KeyCodes.SHIFT])],
    },
    /** Move the cursor on the workspace up. */
    {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_UP,
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyEdit(workspace),
      callback: (workspace) => this.moveWSCursor(workspace, 0, -1),
      keyCodes: [createSerializedKey(KeyCodes.W, [KeyCodes.SHIFT])],
    },

    /** Move the cursor on the workspace down. */
    {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_DOWN,
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyEdit(workspace),
      callback: (workspace) => this.moveWSCursor(workspace, 0, 1),
      keyCodes: [createSerializedKey(KeyCodes.S, [KeyCodes.SHIFT])],
    },

    /** Move the cursor to the workspace. */
    {
      name: Constants.SHORTCUT_NAMES.CREATE_WS_CURSOR,
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        keyboardNavigationController.setIsActive(true);
        return this.createWSCursor(workspace);
      },
      keyCodes: [KeyCodes.W],
    },
  ];

  /**
   * Install the shortcuts.
   */
  install() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.register(shortcut);
    }
  }

  /**
   * Uninstall the shortcuts.
   */
  uninstall() {
    for (const shortcut of this.shortcuts) {
      ShortcutRegistry.registry.unregister(shortcut.name);
    }
  }

  /**
   * Moves the workspace cursor in the given direction.
   *
   * @param workspace The workspace the cursor is on.
   * @param xDirection -1 to move cursor left. 1 to move cursor right.
   * @param yDirection -1 to move cursor up. 1 to move cursor down.
   * @returns True if the current node is a workspace, false
   *     otherwise.
   */
  moveWSCursor(
    workspace: WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
    return false;
  }

  /**
   * Moves the cursor to the workspace near the origin.
   *
   * @param workspace The workspace the cursor is on.
   */
  createWSCursor(workspace: WorkspaceSvg) {
    const cursor = workspace.getCursor();

    if (!cursor) return false;

    cursor.setCurNode(workspace);
    return true;
  }
}
