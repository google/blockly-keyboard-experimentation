/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ContextMenuRegistry, Msg, ShortcutItems} from 'blockly';
import {getShortActionShortcut} from '../shortcut_formatting';

/**
 * Action to delete the block the cursor is currently on.
 */
export class DeleteAction {
  /**
   * Saved context menu item display text function, which is restored
   * when this action is uninstalled.
   */
  private oldDisplayText:
    | ((scope: ContextMenuRegistry.Scope) => string | HTMLElement)
    | string
    | HTMLElement
    | undefined = undefined;

  /**
   * Saved context menu item, which has its display text restored when
   * this action is uninstalled.
   */
  private oldContextMenuItem: ContextMenuRegistry.RegistryItem | null = null;

  constructor() {}

  /**
   * Install this action as both a keyboard shortcut and a context menu item.
   */
  install() {
    this.registerContextMenuAction();
  }

  /**
   * Reinstall the original context menu display text if possible.
   */
  uninstall() {
    if (this.oldContextMenuItem && this.oldDisplayText) {
      this.oldContextMenuItem.displayText = this.oldDisplayText;
    }
  }

  /**
   * Updates the text of the context menu delete action to include
   * the keyboard shortcut.
   */
  private registerContextMenuAction() {
    this.oldContextMenuItem =
      ContextMenuRegistry.registry.getItem('blockDelete');

    if (!this.oldContextMenuItem) return;

    this.oldDisplayText = this.oldContextMenuItem.displayText;

    const displayText = (scope: ContextMenuRegistry.Scope) => {
      const shortcut = getShortActionShortcut(ShortcutItems.names.DELETE);

      // Use the original item's text, which is dynamic based on the number
      // of blocks that will be deleted.
      if (typeof this.oldDisplayText === 'function') {
        return this.oldDisplayText(scope) + ` (${shortcut})`;
      } else if (typeof this.oldDisplayText === 'string') {
        return this.oldDisplayText + ` (${shortcut})`;
      }

      return Msg['DELETE_BLOCK'].replace('%1', shortcut);
    };

    this.oldContextMenuItem.displayText = displayText;
  }
}
