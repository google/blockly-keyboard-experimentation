/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BlockSvg,
  RenderedConnection,
  ShortcutRegistry,
  utils as BlocklyUtils,
} from 'blockly';
import * as Constants from '../constants';
import type {WorkspaceSvg, INavigable} from 'blockly';
import {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Action to insert a block into the workspace.
 *
 * This action registers itself as both a keyboard shortcut and a context menu
 * item.
 */
export class DisconnectAction {
  /**
   * Registration name for the keyboard shortcut.
   */
  private shortcutName = Constants.SHORTCUT_NAMES.DISCONNECT;

  constructor(private navigation: Navigation) {}

  /**
   * Install this action as both a keyboard shortcut and a context menu item.
   */
  install() {
    this.registerShortcut();
  }

  /**
   * Uninstall this action as both a keyboard shortcut and a context menu item.
   * Reinstall the original context menu action if possible.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(this.shortcutName);
  }

  /**
   * Create and register the keyboard shortcut for this action.
   */
  private registerShortcut() {
    const disconnectShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: this.shortcutName,
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            this.disconnectBlocks(workspace);
            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.X],
    };
    ShortcutRegistry.registry.register(disconnectShortcut);
  }

  /**
   * Disconnects the connection that the cursor is pointing to, and bump blocks.
   * This is a no-op if the connection cannot be broken or if the cursor is not
   * pointing to a connection.
   *
   * @param workspace The workspace.
   */
  disconnectBlocks(workspace: WorkspaceSvg) {
    const cursor = workspace.getCursor();
    if (!cursor) {
      return;
    }
    let curNode: INavigable<any> | null = cursor.getCurNode();
    let wasVisitingConnection = true;
    while (
      curNode &&
      !(curNode instanceof RenderedConnection && curNode.isConnected())
    ) {
      if (curNode instanceof BlockSvg) {
        const previous = curNode.previousConnection;
        const output = curNode.outputConnection;
        if (previous?.isConnected()) {
          curNode = previous;
          break;
        } else if (output?.isConnected()) {
          curNode = output;
          break;
        }
      }

      curNode = workspace.getNavigator().getParent(curNode);
      wasVisitingConnection = false;
    }
    if (!curNode) {
      console.log('Unable to find a connection to disconnect');
      return;
    }
    if (!(curNode instanceof RenderedConnection && curNode.isConnected())) {
      return;
    }
    const targetConnection = curNode.targetConnection;
    if (!targetConnection) {
      throw new Error('Must have target if connected');
    }

    const superiorConnection = curNode.isSuperior()
      ? curNode
      : targetConnection;

    const inferiorConnection = curNode.isSuperior()
      ? targetConnection
      : curNode;

    if (inferiorConnection.getSourceBlock().isShadow()) {
      return;
    }

    if (!inferiorConnection.getSourceBlock().isMovable()) {
      return;
    }

    superiorConnection.disconnect();
    inferiorConnection.bumpAwayFrom(superiorConnection);

    const rootBlock = superiorConnection.getSourceBlock().getRootBlock();
    rootBlock.bringToFront();

    if (wasVisitingConnection) {
      workspace.getCursor()?.setCurNode(superiorConnection);
    }
  }
}
