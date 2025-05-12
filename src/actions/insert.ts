/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextMenuRegistry,
  ShortcutRegistry,
  utils as BlocklyUtils,
} from 'blockly';
import * as Constants from '../constants';
import type {WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';

import * as Blockly from 'blockly/core';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Action to insert a block into the workspace.
 *
 * This action registers itself as both a keyboard shortcut and a context menu
 * item.
 */
export class InsertAction {
  /**
   * Registration name for the keyboard shortcut.
   */
  private insertShortcutName = Constants.SHORTCUT_NAMES.INSERT;

  constructor(private navigation: Navigation) {}

  /**
   * Install this action as both a keyboard shortcut and a context menu item.
   */
  install() {
    this.registerShortcut();
    this.registerContextMenuAction();
  }

  /**
   * Uninstall this action as both a keyboard shortcut and a context menu item.
   * Reinstall the original context menu action if possible.
   */
  uninstall() {
    ContextMenuRegistry.registry.unregister('insert');
    ShortcutRegistry.registry.unregister(this.insertShortcutName);
  }

  /**
   * Create and register the keyboard shortcut for this action.
   */
  private registerShortcut() {
    const insertShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: this.insertShortcutName,
      preconditionFn: this.insertPrecondition.bind(this),
      callback: this.insertCallback.bind(this),
      keyCodes: [KeyCodes.I],
    };
    ShortcutRegistry.registry.register(insertShortcut);
  }

  /**
   * Register the insert block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerContextMenuAction() {
    const insertAboveItem: ContextMenuRegistry.RegistryItem = {
      displayText: () => {
        return 'Insert Block (I)';
      },
      preconditionFn: (
        scope: ContextMenuRegistry.Scope,
        menuOpenEvent: Event,
      ) => {
        if (menuOpenEvent instanceof PointerEvent) return 'hidden';
        let block;
        if (scope.focusedNode instanceof Blockly.Block) {
          block = scope.focusedNode;
        } else if (scope.focusedNode instanceof Blockly.Connection) {
          block = scope.focusedNode.getSourceBlock();
        }
        const ws = block?.workspace as WorkspaceSvg | null;
        if (!ws) return 'hidden';

        return this.insertPrecondition(ws) ? 'enabled' : 'hidden';
      },
      callback: (scope: ContextMenuRegistry.Scope) => {
        let ws;
        if (scope.focusedNode instanceof Blockly.Block) {
          ws = scope.focusedNode.workspace as WorkspaceSvg;
        } else if (scope.focusedNode instanceof Blockly.Connection) {
          ws = scope.focusedNode.getSourceBlock()?.workspace as WorkspaceSvg;
        }
        if (!ws) return false;
        this.insertCallback(ws);
      },
      id: 'insert',
      weight: 9,
    };

    ContextMenuRegistry.registry.register(insertAboveItem);
  }

  /**
   * Precondition function for inserting a block from keyboard navigation. This
   * precondition is shared between keyboard shortcuts and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `insertCallback` function should be called.
   */
  private insertPrecondition(workspace: WorkspaceSvg): boolean {
    return (
      !workspace.isDragging() && this.navigation.canCurrentlyEdit(workspace)
    );
  }

  /**
   * Callback function for inserting a block from keyboard navigation. This
   * callback is shared between keyboard shortcuts and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was invoked.
   * @returns Whether the toolbox or flyout is successfully opened.
   */
  private insertCallback(workspace: WorkspaceSvg): boolean {
    if (this.navigation.getState(workspace) === Constants.STATE.WORKSPACE) {
      this.navigation.openToolboxOrFlyout(workspace);
      return true;
    }
    return false;
  }
}
