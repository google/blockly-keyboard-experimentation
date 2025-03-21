/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ASTNode, ShortcutRegistry, utils as BlocklyUtils} from 'blockly/core';

import type {Field, Toolbox, WorkspaceSvg} from 'blockly/core';

import * as Constants from '../constants';
import type {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Class for registering shortcuts for navigating the workspace with arrow keys.
 */
export class ArrowNavigation {
  constructor(
    private navigation: Navigation,
    private canCurrentlyNavigate: (ws: WorkspaceSvg) => boolean,
  ) {}

  /**
   * Gives the cursor to the field to handle if the cursor is on a field.
   *
   * @param workspace The workspace to check.
   * @param shortcut The shortcut
   *     to give to the field.
   * @returns True if the shortcut was handled by the field, false
   *     otherwise.
   */
  fieldShortcutHandler(
    workspace: WorkspaceSvg,
    shortcut: ShortcutRegistry.KeyboardShortcut,
  ): boolean {
    const cursor = workspace.getCursor();
    if (!cursor || !cursor.getCurNode()) {
      return false;
    }
    const curNode = cursor.getCurNode();
    if (curNode?.getType() === ASTNode.types.FIELD) {
      return (curNode.getLocation() as Field).onShortcut(shortcut);
    }
    return false;
  }

  /**
   * Adds all arrow key navigation shortcuts to the registry.
   */
  install() {
    const shortcuts: {
      [name: string]: ShortcutRegistry.KeyboardShortcut;
    } = {
      /** Go to the next location to the right. */
      right: {
        name: Constants.SHORTCUT_NAMES.RIGHT,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const toolbox = workspace.getToolbox() as Toolbox;
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && workspace) {
                if (!this.navigation.defaultCursorPositionIfNeeded(workspace)) {
                  workspace.getCursor()?.in();
                }
                isHandled = true;
              }
              return isHandled;
            case Constants.STATE.TOOLBOX:
              isHandled =
                toolbox && typeof toolbox.onShortcut === 'function'
                  ? toolbox.onShortcut(shortcut)
                  : false;
              if (!isHandled) {
                this.navigation.focusFlyout(workspace);
              }
              return true;
            default:
              return false;
          }
        },
        keyCodes: [KeyCodes.RIGHT],
      },

      /** Go to the next location to the left. */
      left: {
        name: Constants.SHORTCUT_NAMES.LEFT,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const toolbox = workspace.getToolbox() as Toolbox;
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && workspace) {
                if (!this.navigation.defaultCursorPositionIfNeeded(workspace)) {
                  workspace.getCursor()?.out();
                }
                isHandled = true;
              }
              return isHandled;
            case Constants.STATE.FLYOUT:
              this.navigation.focusToolbox(workspace);
              return true;
            case Constants.STATE.TOOLBOX:
              return toolbox && typeof toolbox.onShortcut === 'function'
                ? toolbox.onShortcut(shortcut)
                : false;
            default:
              return false;
          }
        },
        keyCodes: [KeyCodes.LEFT],
      },

      /** Go down to the next location. */
      down: {
        name: Constants.SHORTCUT_NAMES.DOWN,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const toolbox = workspace.getToolbox() as Toolbox;
          const flyout = workspace.getFlyout();
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && workspace) {
                if (!this.navigation.defaultCursorPositionIfNeeded(workspace)) {
                  workspace.getCursor()?.next();
                }
                isHandled = true;
              }
              return isHandled;
            case Constants.STATE.FLYOUT:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && flyout) {
                flyout.getWorkspace()?.getCursor()?.next();
                isHandled = true;
              }
              return isHandled;
            case Constants.STATE.TOOLBOX:
              return toolbox && typeof toolbox.onShortcut === 'function'
                ? toolbox.onShortcut(shortcut)
                : false;
            default:
              return false;
          }
        },
        keyCodes: [KeyCodes.DOWN],
      },
      /** Go up to the previous location. */
      up: {
        name: Constants.SHORTCUT_NAMES.UP,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const flyout = workspace.getFlyout();
          const toolbox = workspace.getToolbox() as Toolbox;
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled) {
                if (
                  !this.navigation.defaultCursorPositionIfNeeded(
                    workspace,
                    'last',
                  )
                ) {
                  workspace.getCursor()?.prev();
                }
                isHandled = true;
              }
              return isHandled;
            case Constants.STATE.FLYOUT:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && flyout) {
                flyout.getWorkspace()?.getCursor()?.prev();
                isHandled = true;
              }
              return isHandled;
            case Constants.STATE.TOOLBOX:
              return toolbox && typeof toolbox.onShortcut === 'function'
                ? toolbox.onShortcut(shortcut)
                : false;
            default:
              return false;
          }
        },
        keyCodes: [KeyCodes.UP],
      },
    };

    for (const shortcut of Object.values(shortcuts)) {
      ShortcutRegistry.registry.register(shortcut);
    }
  }

  /**
   * Removes all the arrow navigation shortcuts.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.LEFT);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.RIGHT);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.DOWN);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.UP);
  }
}
