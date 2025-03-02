/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Connection,
  ContextMenuRegistry,
  ShortcutRegistry,
  comments,
  utils as BlocklyUtils,
} from 'blockly';
import * as Constants from '../constants';
import type {BlockSvg, WorkspaceSvg} from 'blockly';
import {NavigationController} from '../navigation_controller';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Action to edit a block—this just moves the cursor to the first
 * field or input (if there is one), as an aid to navigational
 * discoverability.
 *
 * This action registers itself only as a context menu item, as there
 * is already a corresponding "right" shortcut item.  context menu
 * item.
 */
export class EditAction {
  constructor(private canCurrentlyNavigate: (ws: WorkspaceSvg) => boolean) {}

  /**
   * Install this action as a context menu item.
   */
  install() {
    this.registerContextMenuAction();
  }

  /**
   * Uninstall this action as both a keyboard shortcut and a context menu item.
   * Reinstall the original context menu action if possible.
   */
  uninstall() {
    ContextMenuRegistry.registry.unregister('edit');
  }

  /**
   * Register the edit block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerContextMenuAction() {
    const editAboveItem: ContextMenuRegistry.RegistryItem = {
      displayText: 'Edit Block contents (→︎)',
      preconditionFn: (scope: ContextMenuRegistry.Scope) => {
        const workspace = scope.block?.workspace;
        if (!workspace) return 'hidden';
        // TODO: be smarter.
        return this.canCurrentlyNavigate(workspace)
          ? 'enabled'
          : 'disabled';
      },
      callback: (scope: ContextMenuRegistry.Scope) => {
        const workspace = scope.block?.workspace;
        if (!workspace) return false;
        workspace.getCursor()?.in();
        return true;
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'edit',
      weight: 9,
    };

    ContextMenuRegistry.registry.register(editAboveItem);
  }
}
