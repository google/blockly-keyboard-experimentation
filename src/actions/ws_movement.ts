/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ASTNode, ShortcutRegistry, utils as BlocklyUtils} from 'blockly';
import * as Constants from '../constants';
import type {WorkspaceSvg} from 'blockly';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * Logic for free movement of the cursor on the workspace with keyboard
 * shortcuts.
 */
export class WorkspaceMovement {
  /**
   * Function provided by the navigation controller to say whether editing
   * is allowed.
   */
  private canCurrentlyEdit: (ws: WorkspaceSvg) => boolean;

  /**
   * The distance to move the cursor when the cursor is on the workspace.
   */
  WS_MOVE_DISTANCE = 40;

  constructor(canEdit: (ws: WorkspaceSvg) => boolean) {
    this.canCurrentlyEdit = canEdit;
  }

  /**
   * Install these actions as both keyboard shortcuts and context menu items.
   */
  install() {
    const shortcutList: {
      [name: string]: ShortcutRegistry.KeyboardShortcut;
    } = {
      /** Move the cursor on the workspace to the left. */
      wsMoveLeft: {
        name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_LEFT,
        preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
        callback: (workspace) => this.moveWSCursor(workspace, -1, 0),
        keyCodes: [createSerializedKey(KeyCodes.A, [KeyCodes.SHIFT])],
      },
      /** Move the cursor on the workspace to the right. */
      wsMoveRight: {
        name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_RIGHT,
        preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
        callback: (workspace) => this.moveWSCursor(workspace, 1, 0),
        keyCodes: [createSerializedKey(KeyCodes.D, [KeyCodes.SHIFT])],
      },

      /** Move the cursor on the workspace up. */
      wsMoveUp: {
        name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_UP,
        preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
        callback: (workspace) => this.moveWSCursor(workspace, 0, -1),
        keyCodes: [createSerializedKey(KeyCodes.W, [KeyCodes.SHIFT])],
      },

      /** Move the cursor on the workspace down. */
      wsMoveDown: {
        name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_DOWN,
        preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
        callback: (workspace) => this.moveWSCursor(workspace, 0, 1),
        keyCodes: [createSerializedKey(KeyCodes.S, [KeyCodes.SHIFT])],
      },
    };
    for (const shortcut of Object.values(shortcutList)) {
      ShortcutRegistry.registry.register(shortcut);
    }
  }

  /**
   * Uninstall these actions.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(
      Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_LEFT,
    );
    ShortcutRegistry.registry.unregister(
      Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_RIGHT,
    );
    ShortcutRegistry.registry.unregister(
      Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_UP,
    );
    ShortcutRegistry.registry.unregister(
      Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_DOWN,
    );
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
    const cursor = workspace.getCursor();
    if (!cursor) {
      return false;
    }
    const curNode = cursor.getCurNode();

    if (curNode.getType() !== ASTNode.types.WORKSPACE) {
      return false;
    }

    const wsCoord = curNode.getWsCoordinate();
    const newX = xDirection * this.WS_MOVE_DISTANCE + wsCoord.x;
    const newY = yDirection * this.WS_MOVE_DISTANCE + wsCoord.y;

    cursor.setCurNode(
      ASTNode.createWorkspaceNode(
        workspace,
        new BlocklyUtils.Coordinate(newX, newY),
      )!,
    );
    return true;
  }
}
