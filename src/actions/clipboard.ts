/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextMenuRegistry,
  Gesture,
  ShortcutRegistry,
  utils as blocklyUtils,
  ICopyData,
} from 'blockly';
import * as Constants from '../constants';
import type {BlockSvg, Workspace, WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';

const KeyCodes = blocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);


/**
 * Weight for the first of these three items in the context menu.
 * Changing base weight will change where this group goes in the context
 * menu; changing individual weights relative to base weight can change
 * the order within the clipboard group.
 */
const BASE_WEIGHT = 11;

/**
 * Logic and state for cut/copy/paste actions as both keyboard shortcuts
 * and context menu items.
 * In the long term, this will likely merge with the clipboard code in core.
 */
export class Clipboard {
  /** Data copied by the copy or cut keyboard shortcuts. */
  private copyData: ICopyData | null = null;

  /** The workspace a copy or cut keyboard shortcut happened in. */
  private copyWorkspace: WorkspaceSvg | null = null;

  /**
   * Function provided by the navigation controller to say whether editing
   * is allowed.
   */
  private canCurrentlyEdit: (ws: WorkspaceSvg) => boolean;

  constructor(
    private navigation: Navigation,
    canEdit: (ws: WorkspaceSvg) => boolean,
  ) {
    this.canCurrentlyEdit = canEdit;
  }

  /**
   * Install these actions as both keyboard shortcuts and context menu items.
   */
  install() {
    this.registerCopyShortcut();
    this.registerCopyContextMenuAction();

    this.registerPasteShortcut();
    this.registerPasteContextMenuAction();

    this.registerCutShortcut();
    this.registerCutContextMenuAction();
  }

  /**
   * Uninstall this action as both a keyboard shortcut and a context menu item.
   * Reinstall the original context menu action if possible.
   */
  uninstall() {
    ContextMenuRegistry.registry.unregister('blockCutFromContextMenu');
    ContextMenuRegistry.registry.unregister('blockCopyFromContextMenu');
    ContextMenuRegistry.registry.unregister('blockPasteFromContextMenu');

    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.CUT);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.COPY);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.PASTE);
  }


  /**
   * Create and register the keyboard shortcut for the cut action.
   */
  private registerCutShortcut() {
    const cutShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
      preconditionFn: this.cutPrecondition.bind(this),
      callback: this.cutCallback.bind(this),
      keyCodes: [
        createSerializedKey(KeyCodes.X, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.X, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.X, [KeyCodes.META]),
      ],
      allowCollision: true,
    };

    ShortcutRegistry.registry.register(cutShortcut);
  }

  /**
   * Register the cut block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerCutContextMenuAction() {
    const cutAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => `Cut (${this.getPlatformPrefix()}X)`,
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return 'hidden';

        return this.cutPrecondition(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;
        return this.cutCallback(ws);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockCutFromContextMenu',
      weight: BASE_WEIGHT,
    };

    ContextMenuRegistry.registry.register(cutAction);
  }

  /**
   * Precondition function for cutting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `cutCallback` function should be called.
   */
  private cutPrecondition(workspace: WorkspaceSvg) {
    if (this.canCurrentlyEdit(workspace)) {
      const curNode = workspace.getCursor()?.getCurNode();
      if (curNode && curNode.getSourceBlock()) {
        const sourceBlock = curNode.getSourceBlock();
        return !!(
          !Gesture.inProgress() &&
          sourceBlock &&
          sourceBlock.isDeletable() &&
          sourceBlock.isMovable() &&
          !sourceBlock.workspace.isFlyout
        );
      }
    }
    return false;
  }

  /**
   * Callback function for cutting a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True if this function successfully handled cutting.
   */
  private cutCallback(workspace: WorkspaceSvg) {
    const sourceBlock = workspace
      .getCursor()
      ?.getCurNode()
      .getSourceBlock() as BlockSvg;
    this.copyData = sourceBlock.toCopyData();
    this.copyWorkspace = sourceBlock.workspace;
    this.navigation.moveCursorOnBlockDelete(workspace, sourceBlock);
    sourceBlock.checkAndDelete();
    return true;
  }

  /**
   * Create and register the keyboard shortcut for the copy action.
   */
  private registerCopyShortcut() {
    const copyShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.COPY,
      preconditionFn: this.copyPrecondition.bind(this),
      callback: this.copyCallback.bind(this),
      keyCodes: [
        createSerializedKey(KeyCodes.C, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.C, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.C, [KeyCodes.META]),
      ],
      allowCollision: true,
    };
    ShortcutRegistry.registry.register(copyShortcut);
  }

  /**
   * Register the copy block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerCopyContextMenuAction() {
    const copyAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => `Copy (${this.getPlatformPrefix()}C)`,
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return 'hidden';

        return this.copyPrecondition(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;
        return this.copyCallback(ws);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockCopyFromContextMenu',
      weight: BASE_WEIGHT + 1,
    };

    ContextMenuRegistry.registry.register(copyAction);
  }

  /**
   * Precondition function for copying a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `copyCallback` function should be called.
   */
  private copyPrecondition(workspace: WorkspaceSvg) {
    if (!this.canCurrentlyEdit(workspace)) return false;
    switch (this.navigation.getState(workspace)) {
      case Constants.STATE.WORKSPACE:
        const curNode = workspace?.getCursor()?.getCurNode();
        const source = curNode?.getSourceBlock();
        return !!(
          source?.isDeletable() &&
          source?.isMovable() &&
          !Gesture.inProgress()
        );
      case Constants.STATE.FLYOUT:
        const flyoutWorkspace = workspace.getFlyout()?.getWorkspace();
        const sourceBlock = flyoutWorkspace
          ?.getCursor()
          ?.getCurNode()
          ?.getSourceBlock();
        return !!(sourceBlock && !Gesture.inProgress());
      default:
        return false;
    }
  }

  /**
   * Callback function for copying a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True if this function successfully handled copying.
   */
  private copyCallback(workspace: WorkspaceSvg) {
    const navigationState = this.navigation.getState(workspace);
    let activeWorkspace: WorkspaceSvg | undefined = workspace;
    if (navigationState === Constants.STATE.FLYOUT) {
      activeWorkspace = workspace.getFlyout()?.getWorkspace();
    }
    const sourceBlock = activeWorkspace
      ?.getCursor()
      ?.getCurNode()
      .getSourceBlock() as BlockSvg;
    workspace.hideChaff();
    this.copyData = sourceBlock.toCopyData();
    this.copyWorkspace = sourceBlock.workspace;
    return !!this.copyData;
  }

  /**
   * Create and register the keyboard shortcut for the paste action.
   */
  private registerPasteShortcut() {
    const pasteShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.PASTE,
      preconditionFn: this.pastePrecondition.bind(this),
      callback: this.pasteCallback.bind(this),
      keyCodes: [
        createSerializedKey(KeyCodes.V, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.V, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.V, [KeyCodes.META]),
      ],
      allowCollision: true,
    };
    ShortcutRegistry.registry.register(pasteShortcut);
  }

  /**
   * Register the paste block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerPasteContextMenuAction() {
    const pasteAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => `Paste (${this.getPlatformPrefix()}V)`,
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return 'hidden';

        return this.pastePrecondition(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;
        return this.pasteCallback(ws);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockPasteFromContextMenu',
      weight: BASE_WEIGHT + 2,
    };

    ContextMenuRegistry.registry.register(pasteAction);
  }

  /**
   * Precondition function for pasting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `pasteCallback` function should be called.
   */
  private pastePrecondition(workspace: WorkspaceSvg) {
    if (!this.copyData || !this.copyWorkspace) return false;
  
    return this.canCurrentlyEdit(workspace) && !Gesture.inProgress();
  }

  /**
   * Callback function for pasting a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True if this function successfully handled pasting.
   */
  private pasteCallback(workspace: WorkspaceSvg) {
    if (!this.copyData || !this.copyWorkspace) return false;
    const pasteWorkspace = this.copyWorkspace.isFlyout
      ? workspace
      : this.copyWorkspace;
    return this.navigation.paste(this.copyData, pasteWorkspace);
  }

  /**
   * Check the platform and return a prefix for the keyboard shortcut.
   * TODO: https://github.com/google/blockly-keyboard-experimentation/issues/155
   * This will eventually be the responsibility of the action code ib
   * Blockly core.
   *
   * @returns A platform-appropriate string for the meta key.
   */
  private getPlatformPrefix() {
    return navigator.platform.startsWith('Mac') ? '⌘' : 'Ctrl + ';
  }
}
