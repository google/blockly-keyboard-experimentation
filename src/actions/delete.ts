/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextMenuRegistry,
  Gesture,
  ShortcutRegistry,
  utils as BlocklyUtils,
} from 'blockly';
import * as Constants from '../constants';
import type {BlockSvg, WorkspaceSvg} from 'blockly';
import {LineCursor} from '../line_cursor';
import {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Action to delete the block the cursor is currently on.
 * Registers itself as both a keyboard shortcut and a context menu item.
 */
export class DeleteAction {
  /**
   * Saved context menu item, which is re-registered when this action
   * is uninstalled.
   */
  private oldContextMenuItem: ContextMenuRegistry.RegistryItem | null = null;

  /**
   * Function provided by the navigation controller to say whether editing
   * is allowed.
   */
  private canCurrentlyEdit: (ws: WorkspaceSvg) => boolean;

  /**
   * Registration name for the keyboard shortcut.
   */
  private deleteShortcutName = Constants.SHORTCUT_NAMES.DELETE;

  constructor(
    private navigation: Navigation,
    canEdit: (ws: WorkspaceSvg) => boolean,
  ) {
    this.canCurrentlyEdit = canEdit;
  }

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
    ContextMenuRegistry.registry.unregister('blockDeleteFromContextMenu');
    if (this.oldContextMenuItem) {
      ContextMenuRegistry.registry.register(this.oldContextMenuItem);
    }
    ShortcutRegistry.registry.unregister(this.deleteShortcutName);
  }

  /**
   * Create and register the keyboard shortcut for this action.
   */
  private registerShortcut() {
    const deleteShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: this.deleteShortcutName,
      preconditionFn: this.deletePrecondition.bind(this),
      callback: this.deleteCallback.bind(this),
      keyCodes: [KeyCodes.DELETE, KeyCodes.BACKSPACE],
      allowCollision: true,
    };
    ShortcutRegistry.registry.register(deleteShortcut);
  }

  /**
   * Register the delete block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerContextMenuAction() {
    this.oldContextMenuItem =
      ContextMenuRegistry.registry.getItem('blockDelete');

    if (!this.oldContextMenuItem) return;

    // Unregister the original item.
    ContextMenuRegistry.registry.unregister(this.oldContextMenuItem.id);

    const deleteItem: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => {
        if (!this.oldContextMenuItem) {
          return 'Delete block (Del)';
        }

        type DisplayTextFn = (p1: ContextMenuRegistry.Scope) => string;
        // Use the original item's text, which is dynamic based on the number
        // of blocks that will be deleted.
        const oldDisplayText = this.oldContextMenuItem
          .displayText as DisplayTextFn;
        return oldDisplayText(scope) + ' (Del)';
      },
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;

        // Run the original precondition code, from the context menu option.
        // If the item would be hidden or disabled, respect it.
        const originalPreconditionResult =
          this.oldContextMenuItem?.preconditionFn?.(scope) ?? 'enabled';
        if (!ws || originalPreconditionResult !== 'enabled') {
          return originalPreconditionResult;
        }

        // Return enabled if the keyboard shortcut precondition is allowed,
        // and disabled if the context menu precondition is met but the keyboard
        // shortcut precondition is not met.
        return this.deletePrecondition(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;

        // Delete the block(s), and put the cursor back in a sane location.
        return this.deleteCallback(ws, null);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockDeleteFromContextMenu',
      weight: 11,
    };

    ContextMenuRegistry.registry.register(deleteItem);
  }

  /**
   * Precondition function for deleting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `deleteCallback` function should be called.
   */
  private deletePrecondition(workspace: WorkspaceSvg) {
    if (!this.canCurrentlyEdit(workspace)) return false;

    const sourceBlock = workspace.getCursor()?.getCurNode()?.getSourceBlock();
    return !!sourceBlock?.isDeletable();
  }

  /**
   * Callback function for deleting a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @param e The originating event for a keyboard shortcut, or null
   *     if called from a context menu.
   * @returns True if this function successfully handled deletion.
   */
  private deleteCallback(workspace: WorkspaceSvg, e: Event | null) {
    const cursor = workspace.getCursor();
    if (!cursor) return false;

    const sourceBlock = cursor
      .getCurNode()
      ?.getSourceBlock() as BlockSvg | null;
    if (!sourceBlock) return false;
    // Delete or backspace.
    // There is an event if this is triggered from a keyboard shortcut,
    // but not if it's triggered from a context menu.
    if (e) {
      // Stop the browser from going back to the previous page.
      // Do this first to prevent an error in the delete code from resulting
      // in data loss.
      e.preventDefault();
    }
    // Don't delete while dragging.  Jeez.
    if (Gesture.inProgress()) false;

    if (cursor instanceof LineCursor) cursor.preDelete(sourceBlock);
    sourceBlock.checkAndDelete();
    if (cursor instanceof LineCursor) cursor.postDelete();
    return true;
  }
}
