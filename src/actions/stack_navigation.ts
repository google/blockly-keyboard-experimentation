/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ShortcutRegistry, WorkspaceSvg, utils} from 'blockly/core';
import * as Constants from '../constants';

/**
 * Class for registering a shortcut for quick movement between top level bounds
 * in the workspace.
 */
export class StackNavigationAction {
  private stackShortcuts: ShortcutRegistry.KeyboardShortcut[] = [];

  install() {
    const preconditionFn = (workspace: WorkspaceSvg) =>
      !!getCurNodeRoot(workspace);

    function getCurNodeRoot(workspace: WorkspaceSvg) {
      const cursor = workspace.getCursor();
      // The fallback case includes workspace comments.
      return cursor.getSourceBlock()?.getRootBlock() ?? cursor.getCurNode();
    }

    const previousStackShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.PREVIOUS_STACK,
      preconditionFn,
      callback: (workspace) => {
        const curNodeRoot = getCurNodeRoot(workspace);
        if (!curNodeRoot) return false;
        const prevRoot = workspace
          .getNavigator()
          .getPreviousSibling(curNodeRoot);
        if (!prevRoot) return false;
        workspace.getCursor().setCurNode(prevRoot);
        return true;
      },
      keyCodes: [utils.KeyCodes.B],
    };

    const nextStackShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.NEXT_STACK,
      preconditionFn,
      callback: (workspace) => {
        const curNodeRoot = getCurNodeRoot(workspace);
        if (!curNodeRoot) return false;
        const nextRoot = workspace.getNavigator().getNextSibling(curNodeRoot);
        if (!nextRoot) return false;
        workspace.getCursor().setCurNode(nextRoot);
        return true;
      },
      keyCodes: [utils.KeyCodes.N],
    };

    ShortcutRegistry.registry.register(previousStackShortcut);
    this.stackShortcuts.push(previousStackShortcut);
    ShortcutRegistry.registry.register(nextStackShortcut);
    this.stackShortcuts.push(nextStackShortcut);
  }

  /**
   * Unregisters the shortcut.
   */
  uninstall() {
    this.stackShortcuts.forEach((shortcut) =>
      ShortcutRegistry.registry.unregister(shortcut.name),
    );
    this.stackShortcuts.length = 0;
  }
}
