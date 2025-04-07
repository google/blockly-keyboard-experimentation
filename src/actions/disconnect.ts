/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  BlockSvg,
  RenderedConnection,
  ShortcutRegistry,
  utils as BlocklyUtils,
} from 'blockly';
import * as Constants from '../constants';
import type {WorkspaceSvg} from 'blockly';
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
    let curNode: ASTNode | null = cursor.getCurNode();
    let wasVisitingConnection = true;
    while (curNode && !curNode.isConnection()) {
      const location = curNode.getLocation();
      if (location instanceof BlockSvg) {
        const previous = location.previousConnection;
        const output = location.outputConnection;
        if (previous?.isConnected()) {
          curNode = ASTNode.createConnectionNode(previous);
          break;
        } else if (output?.isConnected()) {
          curNode = ASTNode.createConnectionNode(output);
          break;
        }
      }

      curNode = curNode.out();
      wasVisitingConnection = false;
    }
    if (!curNode) {
      console.log('Unable to find a connection to disconnect');
      return;
    }
    const curConnection = curNode.getLocation() as RenderedConnection;
    if (!curConnection.isConnected()) {
      return;
    }
    const targetConnection = curConnection.targetConnection;
    if (!targetConnection) {
      throw new Error('Must have target if connected');
    }

    const superiorConnection = curConnection.isSuperior()
      ? curConnection
      : targetConnection;

    const inferiorConnection = curConnection.isSuperior()
      ? targetConnection
      : curConnection;

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
      const connectionNode = ASTNode.createConnectionNode(superiorConnection);
      workspace.getCursor()?.setCurNode(connectionNode);
    }
  }
}
