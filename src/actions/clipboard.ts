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
  ICopyData,
} from 'blockly';
import * as Constants from '../constants';
import type {BlockSvg, Workspace, WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

export class Clipboard {
  /** Data copied by the copy or cut keyboard shortcuts. */
  private copyData: ICopyData | null = null;

  /** The workspace a copy or cut keyboard shortcut happened in. */
  private copyWorkspace: WorkspaceSvg | null = null;

  /**
   * Function provided by the navigation controller to say whether editing
   * is allowed.
   */
  private canCurrentlyEditFn: (ws: WorkspaceSvg) => boolean;

  constructor(
    private navigation: Navigation,
    canEditFn: (ws: WorkspaceSvg) => boolean,
  ) {
    this.canCurrentlyEditFn = canEditFn;
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
    ContextMenuRegistry.registry.unregister('blockCopyFromContextMenu');
    ContextMenuRegistry.registry.unregister('blockPasteFromContextMenu');
    ContextMenuRegistry.registry.unregister('blockCutFromContextMenu');

    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.COPY);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.CUT);
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.PASTE);
  }

  /**
   * Create and register the keyboard shortcut for the copy action.
   */
  private registerCopyShortcut() {
    const copyShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.COPY,
      preconditionFn: this.copyPreconditionFn.bind(this),
      callback: this.copyCallbackFn.bind(this),
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
   * Paste the copied block, to the marked location if possible or
   * onto the workspace otherwise.
   */
  private registerPasteShortcut() {
    const pasteShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.PASTE,
      preconditionFn: this.pastePreconditionFn.bind(this),
      callback: this.pasteCallbackFn.bind(this),
      keyCodes: [
        createSerializedKey(KeyCodes.V, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.V, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.V, [KeyCodes.META]),
      ],
      allowCollision: true,
    };
    ShortcutRegistry.registry.register(pasteShortcut);
  }

  private registerCutShortcut() {
    const cutShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
      preconditionFn: this.cutPreconditionFn.bind(this),
      callback: this.cutCallbackFn.bind(this),
      keyCodes: [
        createSerializedKey(KeyCodes.X, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.X, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.X, [KeyCodes.META]),
      ],
      allowCollision: true,
    };

    ShortcutRegistry.registry.register(cutShortcut);
  }

  private registerPasteContextMenuAction() {
    const pasteAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => {
        return 'Paste (' + this.getPlatformPrefix() + ' + V)';
      },
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return 'hidden';

        return this.pastePreconditionFn(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;
        return this.pasteCallbackFn(ws);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockPasteFromContextMenu',
      weight: 11,
    };

    ContextMenuRegistry.registry.register(pasteAction);
  }

  private registerCutContextMenuAction() {
    const cutAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => {
        return 'Cut (' + this.getPlatformPrefix() + ' + X)';
      },
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return 'hidden';

        return this.cutPreconditionFn(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;
        return this.cutCallbackFn(ws);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockCutFromContextMenu',
      weight: 11,
    };

    ContextMenuRegistry.registry.register(cutAction);
  }

  /**
   * Register the delete block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  private registerCopyContextMenuAction() {
    const copyAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => {
        return 'Copy (' + this.getPlatformPrefix() + ' + C)';
      },
      preconditionFn: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return 'hidden';

        return this.copyPreconditionFn(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        const ws = scope.block?.workspace;
        if (!ws) return;
        return this.copyCallbackFn(ws);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockCopyFromContextMenu',
      weight: 11,
    };

    ContextMenuRegistry.registry.register(copyAction);
  }

  /**
   * Precondition function for deleting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `deleteCallbackFn` function should be called.
   */
  private copyPreconditionFn(workspace: WorkspaceSvg) {
    if (!this.canCurrentlyEditFn(workspace)) return false;
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
   * FIXME: This should be better encapsulated.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True if this function successfully handled copying.
   */
  private copyCallbackFn(workspace: WorkspaceSvg) {
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
   * Callback function for pasting a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * FIXME: This should be better encapsulated.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True if this function successfully handled pasting.
   */
  private pasteCallbackFn(workspace: WorkspaceSvg) {
    if (!this.copyData || !this.copyWorkspace) return false;
    const pasteWorkspace = this.copyWorkspace.isFlyout
      ? workspace
      : this.copyWorkspace;
    return this.navigation.paste(this.copyData, pasteWorkspace);
  }

  /**
   * Precondition function for pasting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `blockPasteCallbackFn` function should be called.
   */
  private pastePreconditionFn(workspace: WorkspaceSvg) {
    return this.canCurrentlyEditFn(workspace) && !Gesture.inProgress();
  }

  /**
   * Callback function for cutting a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * FIXME: This should be better encapsulated.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True if this function successfully handled cutting.
   */
  private cutCallbackFn(workspace: WorkspaceSvg) {
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
   * Precondition function for cutting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `blockCutCallbackFn` function should be called.
   */
  private cutPreconditionFn(workspace: WorkspaceSvg) {
    if (this.canCurrentlyEditFn(workspace)) {
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

  // TODO: This belongs in the action menu/keyboard shortcut/context menu code.
  private getPlatformPrefix() {
    return navigator.platform.startsWith('Mac') ? 'Cmd' : 'Ctrl';
  }
}
