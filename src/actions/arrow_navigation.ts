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
    if (curNode.getType() === ASTNode.types.FIELD) {
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
      /** Go to the in location. */
      in: {
        name: Constants.SHORTCUT_NAMES.IN,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const toolbox = workspace.getToolbox() as Toolbox;
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && workspace) {
                workspace.getCursor()?.in();
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

      /** Go to the out location. */
      out: {
        name: Constants.SHORTCUT_NAMES.OUT,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const toolbox = workspace.getToolbox() as Toolbox;
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && workspace) {
                workspace.getCursor()?.out();
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

      /** Go to the next location. */
      next: {
        name: Constants.SHORTCUT_NAMES.NEXT,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const toolbox = workspace.getToolbox() as Toolbox;
          const flyout = workspace.getFlyout();
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled && workspace) {
                workspace.getCursor()?.next();
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
      /** Go to the previous location. */
      previous: {
        name: Constants.SHORTCUT_NAMES.PREVIOUS,
        preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
        callback: (workspace, _, shortcut) => {
          const flyout = workspace.getFlyout();
          const toolbox = workspace.getToolbox() as Toolbox;
          let isHandled = false;
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              isHandled = this.fieldShortcutHandler(workspace, shortcut);
              if (!isHandled) {
                workspace.getCursor()?.prev();
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
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.IN);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.OUT);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.NEXT);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.PREVIOUS);
  }
}
