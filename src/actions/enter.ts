/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  ShortcutRegistry,
  utils as BlocklyUtils,
  dialog,
} from 'blockly/core';

import type {
  Block,
  BlockSvg,
  Field,
  FlyoutButton,
  WorkspaceSvg,
} from 'blockly/core';

import * as Constants from '../constants';
import type {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Class for registering a shortcut for the enter action.
 */
export class EnterAction {
  constructor(
    private navigation: Navigation,
    private canCurrentlyEdit: (ws: WorkspaceSvg) => boolean,
  ) {}

  /**
   * Adds the enter action shortcut to the registry.
   */
  install() {
    /**
     * Enter key:
     *
     * - On the flyout: press a button or choose a block to place.
     * - On a stack: open a block's context menu or field's editor.
     * - On the workspace: open the context menu.
     */
    ShortcutRegistry.registry.register({
      name: Constants.SHORTCUT_NAMES.EDIT_OR_CONFIRM,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace, event) => {
        event.preventDefault();

        let flyoutCursor;
        let curNode;
        let nodeType;

        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            this.handleEnterForWS(workspace);
            return true;
          case Constants.STATE.FLYOUT:
            flyoutCursor = this.navigation.getFlyoutCursor(workspace);
            if (!flyoutCursor) {
              return false;
            }
            curNode = flyoutCursor.getCurNode();
            nodeType = curNode?.getType();

            switch (nodeType) {
              case ASTNode.types.STACK:
                this.insertFromFlyout(workspace);
                break;
              case ASTNode.types.BUTTON:
                this.triggerButtonCallback(workspace);
                break;
            }

            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.ENTER, KeyCodes.SPACE],
    });
  }

  /**
   * Handles hitting the enter key on the workspace.
   *
   * @param workspace The workspace.
   */
  private handleEnterForWS(workspace: WorkspaceSvg) {
    const cursor = workspace.getCursor();
    if (!cursor) return;
    const curNode = cursor.getCurNode();
    if (!curNode) return;
    const nodeType = curNode.getType();
    if (nodeType === ASTNode.types.FIELD) {
      (curNode.getLocation() as Field).showEditor();
    } else if (nodeType === ASTNode.types.BLOCK) {
      const block = curNode.getLocation() as Block;
      if (!this.tryShowFullBlockFieldEditor(block)) {
        const metaKey = navigator.platform.startsWith('Mac') ? 'Cmd' : 'Ctrl';
        const canMoveInHint = `Press right arrow to move in or ${metaKey} + Enter for more options`;
        const genericHint = `Press ${metaKey} + Enter for options`;
        const hint =
          curNode.in()?.getSourceBlock() === block
            ? canMoveInHint
            : genericHint;
        dialog.alert(hint);
      }
    } else if (curNode.isConnection() || nodeType === ASTNode.types.WORKSPACE) {
      this.navigation.openToolboxOrFlyout(workspace);
    } else if (nodeType === ASTNode.types.STACK) {
      console.warn('Cannot mark a stack.');
    }
  }

  /**
   * Inserts a block from the flyout.
   * Tries to find a connection on the block to connect to the marked
   * location. If no connection has been marked, or there is not a compatible
   * connection then the block is placed on the workspace.
   *
   * @param workspace The main workspace. The workspace
   *     the block will be placed on.
   */
  private insertFromFlyout(workspace: WorkspaceSvg) {
    const stationaryNode = this.navigation.getStationaryNode(workspace);
    const newBlock = this.createNewBlock(workspace);
    if (!newBlock) return;
    if (stationaryNode) {
      if (
        !this.navigation.tryToConnectNodes(
          workspace,
          stationaryNode,
          ASTNode.createBlockNode(newBlock)!,
        )
      ) {
        console.warn(
          'Something went wrong while inserting a block from the flyout.',
        );
      }
    }

    this.navigation.focusWorkspace(workspace);
    workspace.getCursor()?.setCurNode(ASTNode.createBlockNode(newBlock)!);
  }

  /**
   * Triggers a flyout button's callback.
   *
   * @param workspace The main workspace. The workspace
   *     containing a flyout with a button.
   */
  private triggerButtonCallback(workspace: WorkspaceSvg) {
    const button = this.navigation
      .getFlyoutCursor(workspace)
      ?.getCurNode()
      ?.getLocation() as FlyoutButton | undefined;
    if (!button) return;

    const flyoutButtonCallbacks: Map<string, (p1: FlyoutButton) => void> =
      // @ts-expect-error private field access
      workspace.flyoutButtonCallbacks;

    const info = button.info;
    if ('callbackkey' in info) {
      const buttonCallback = flyoutButtonCallbacks.get(info.callbackkey);
      if (!buttonCallback) {
        throw new Error('No callback function found for flyout button.');
      }
      buttonCallback(button);
    }
  }

  /**
   * If this block has a full block field then show its editor.
   *
   * @param block A block.
   * @returns True if we showed the editor, false otherwise.
   */
  private tryShowFullBlockFieldEditor(block: Block): boolean {
    if (block.isSimpleReporter()) {
      for (const input of block.inputList) {
        for (const field of input.fieldRow) {
          // @ts-expect-error isFullBlockField is a protected method.
          if (field.isClickable() && field.isFullBlockField()) {
            field.showEditor();
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Creates a new block based on the current block the flyout cursor is on.
   *
   * @param workspace The main workspace. The workspace
   *     the block will be placed on.
   * @returns The newly created block.
   */
  private createNewBlock(workspace: WorkspaceSvg): BlockSvg | null {
    const flyout = workspace.getFlyout();
    if (!flyout || !flyout.isVisible()) {
      console.warn(
        'Trying to insert from the flyout when the flyout does not ' +
          ' exist or is not visible',
      );
      return null;
    }

    const curBlock = this.navigation
      .getFlyoutCursor(workspace)
      ?.getCurNode()
      ?.getLocation() as BlockSvg | undefined;
    if (!curBlock?.isEnabled()) {
      console.warn("Can't insert a disabled block.");
      return null;
    }

    const newBlock = flyout.createBlock(curBlock);
    // Render to get the sizing right.
    newBlock.render();
    // Connections are not tracked when the block is first created.  Normally
    // there's enough time for them to become tracked in the user's mouse
    // movements, but not here.
    newBlock.setConnectionTracking(true);
    return newBlock;
  }

  /**
   * Removes the enter action shortcut.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(
      Constants.SHORTCUT_NAMES.EDIT_OR_CONFIRM,
    );
  }
}
