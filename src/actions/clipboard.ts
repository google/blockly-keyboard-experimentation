/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ContextMenuRegistry,
  ShortcutRegistry,
  ICopyData,
  isCopyable,
  isDeletable,
  isDraggable,
  Msg,
  ShortcutItems,
  Flyout,
  getMainWorkspace,
} from 'blockly';
import * as Constants from '../constants';
import {WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';
import {getShortActionShortcut} from '../shortcut_formatting';
import {clearPasteHints, showCopiedHint, showCutHint} from '../hints';
import {IFocusableNode} from 'blockly/core';

/**
 * Weight for the first of these three items in the context menu.
 * Changing base weight will change where this group goes in the context
 * menu; changing individual weights relative to base weight can change
 * the order within the clipboard group.
 */
const BASE_WEIGHT = 12;

/** Type of the callback function for keyboard shortcuts. */
type ShortcutCallback = (
  workspace: WorkspaceSvg,
  e: Event,
  shortcut: ShortcutRegistry.KeyboardShortcut,
  scope: ContextMenuRegistry.Scope,
) => boolean;

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

  private oldCutCallback: ShortcutCallback | undefined;
  private oldCopyCallback: ShortcutCallback | undefined;
  private oldPasteCallback: ShortcutCallback | undefined;

  constructor(private navigation: Navigation) {}

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
   * N. B. This does *not* currently reinstall the original keyboard shortcuts.
   * You should manually reinstall the previously registered shortcuts (either
   * from core or from another plugin you may be using).
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
   * Identical to the one in core but adds a toast after successful cut.
   */
  private registerCutShortcut() {
    const oldCutShortcut =
      ShortcutRegistry.registry.getRegistry()[ShortcutItems.names.CUT];
    if (!oldCutShortcut)
      throw new Error('No cut keyboard shortcut registered initially');

    this.oldCutCallback = oldCutShortcut.callback;

    const cutShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
      preconditionFn: oldCutShortcut.preconditionFn,
      callback: this.cutCallback.bind(this),
      // The registry gives back keycodes as an object instead of an array
      // See https://github.com/google/blockly/issues/9008
      keyCodes: oldCutShortcut.keyCodes,
      allowCollision: false,
    };

    ShortcutRegistry.registry.unregister(ShortcutItems.names.CUT);
    ShortcutRegistry.registry.register(cutShortcut);
  }

  /**
   * Register the cut block action as a context menu item.
   * The context menu uses its own preconditionFn (that doesn't check
   * if a gesture is in progress, because one always is in the context
   * menu). It calls the cut callback that is shared between keyboard
   * and context menu.
   */
  private registerCutContextMenuAction() {
    const cutAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) =>
        Msg['CUT_SHORTCUT'].replace(
          '%1',
          getShortActionShortcut(Constants.SHORTCUT_NAMES.CUT),
        ),
      preconditionFn: (scope) => this.cutCopyPrecondition(scope),
      callback: (scope, menuOpenEvent) => {
        if (!isCopyable(scope.focusedNode)) return false;
        const ws = scope.focusedNode.workspace;
        if (!(ws instanceof WorkspaceSvg)) return false;

        return this.cutCallback(ws, menuOpenEvent, undefined, scope);
      },
      id: 'blockCutFromContextMenu',
      weight: BASE_WEIGHT,
    };

    ContextMenuRegistry.registry.register(cutAction);
  }

  /**
   * Precondition for cut and copy context menus. These are similar to the
   * ones in core but they don't check if a gesture is in progress,
   * because a gesture will always be in progress if the context menu
   * is open.
   *
   * @param scope scope on which the menu was opened.
   * @returns 'enabled', 'disabled', or 'hidden' as appropriate
   */
  private cutCopyPrecondition(scope: ContextMenuRegistry.Scope): string {
    const focused = scope.focusedNode;

    if (!focused || !isCopyable(focused)) return 'hidden';

    const workspace = focused.workspace;
    if (
      !workspace.isReadOnly() &&
      isDeletable(focused) &&
      focused.isDeletable() &&
      isDraggable(focused) &&
      focused.isMovable() &&
      !focused.workspace.isFlyout
    )
      return 'enabled';

    return 'disabled';
  }

  /**
   * The callback for the cut action. Uses the registered version of the cut callback
   * to perform the cut logic, then pops a toast if cut happened.
   *
   * @param workspace Workspace where shortcut happened.
   * @param e menu open event or keyboard event
   * @param shortcut keyboard shortcut or undefined for context menus
   * @param scope scope of the shortcut or context menu item
   * @returns true if a cut happened, false otherwise
   */
  private cutCallback(
    workspace: WorkspaceSvg,
    e: Event,
    shortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
    },
    scope: ContextMenuRegistry.Scope,
  ) {
    const didCut =
      !!this.oldCutCallback &&
      this.oldCutCallback(workspace, e, shortcut, scope);
    if (didCut) {
      showCutHint(workspace);
    }
    return didCut;
  }

  /**
   * Create and register the keyboard shortcut for the copy action.
   * Identical to the one in core but pops a toast after succesful copy.
   */
  private registerCopyShortcut() {
    const oldCopyShortcut =
      ShortcutRegistry.registry.getRegistry()[ShortcutItems.names.COPY];
    if (!oldCopyShortcut)
      throw new Error('No copy keyboard shortcut registered initially');

    this.oldCopyCallback = oldCopyShortcut.callback;

    const copyShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.COPY,
      preconditionFn: oldCopyShortcut.preconditionFn,
      callback: this.copyCallback.bind(this),
      // The registry gives back keycodes as an object instead of an array
      // See https://github.com/google/blockly/issues/9008
      keyCodes: oldCopyShortcut.keyCodes,
      allowCollision: false,
    };

    ShortcutRegistry.registry.unregister(ShortcutItems.names.COPY);
    ShortcutRegistry.registry.register(copyShortcut);
  }

  /**
   * Register the copy block action as a context menu item.
   * The context menu uses its own preconditionFn (that doesn't check
   * if a gesture is in progress, because one always is in the context
   * menu). It calls the copy callback that is shared between keyboard
   * and context menu.
   */
  private registerCopyContextMenuAction() {
    const copyAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) =>
        Msg['COPY_SHORTCUT'].replace(
          '%1',
          getShortActionShortcut(Constants.SHORTCUT_NAMES.COPY),
        ),
      preconditionFn: (scope) => this.cutCopyPrecondition(scope),
      callback: (scope, menuOpenEvent) => {
        if (!isCopyable(scope.focusedNode)) return false;
        const ws = scope.focusedNode.workspace;
        if (!(ws instanceof WorkspaceSvg)) return false;

        return this.copyCallback(ws, menuOpenEvent, undefined, scope);
      },
      id: 'blockCopyFromContextMenu',
      weight: BASE_WEIGHT + 1,
    };

    ContextMenuRegistry.registry.register(copyAction);
  }

  /**
   * The callback for the copy action. Uses the registered version of the copy callback
   * to perform the copy logic, then pops a toast if copy happened.
   *
   * @param workspace Workspace where shortcut happened.
   * @param e menu open event or keyboard event
   * @param shortcut keyboard shortcut or undefined for context menus
   * @param scope scope of the shortcut or context menu item
   * @returns true if a copy happened, false otherwise
   */
  private copyCallback(
    workspace: WorkspaceSvg,
    e: Event,
    shortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
    },
    scope: ContextMenuRegistry.Scope,
  ) {
    const didCopy =
      !!this.oldCopyCallback &&
      this.oldCopyCallback(workspace, e, shortcut, scope);
    if (didCopy) {
      showCopiedHint(workspace);
    }
    return didCopy;
  }

  /**
   * Create and register the keyboard shortcut for the paste action.
   * Identical to the one in core but clears any paste toasts after.
   */
  private registerPasteShortcut() {
    const oldPasteShortcut =
      ShortcutRegistry.registry.getRegistry()[ShortcutItems.names.PASTE];
    if (!oldPasteShortcut)
      throw new Error('No paste keyboard shortcut registered initially');

    this.oldPasteCallback = oldPasteShortcut.callback;

    const pasteShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.PASTE,
      preconditionFn: (
        workspace: WorkspaceSvg,
        scope: ContextMenuRegistry.Scope,
      ) => {
        // Don't use the workspace given as we don't want to paste in the flyout, for example
        const pasteWorkspace = this.getPasteWorkspace(scope);
        if (!pasteWorkspace || pasteWorkspace.isReadOnly()) return false;
        return true;
      },
      callback: (
        workspace: WorkspaceSvg,
        e: Event,
        shortcut: ShortcutRegistry.KeyboardShortcut,
        scope: ContextMenuRegistry.Scope,
      ) => {
        // Don't use the workspace given as we don't want to paste in the flyout, for example
        const pasteWorkspace = this.getPasteWorkspace(scope);
        if (!pasteWorkspace) return false;
        return this.pasteCallback(pasteWorkspace, e, shortcut, scope);
      },
      // The registry gives back keycodes as an object instead of an array
      // See https://github.com/google/blockly/issues/9008
      keyCodes: oldPasteShortcut.keyCodes,
      allowCollision: false,
    };

    ShortcutRegistry.registry.unregister(ShortcutItems.names.PASTE);
    ShortcutRegistry.registry.register(pasteShortcut);
  }

  /**
   * Register the paste block action as a context menu item.
   * The context menu uses its own preconditionFn (that doesn't check
   * if a gesture is in progress, because one always is in the context
   * menu). It calls the paste callback that is shared between keyboard
   * and context menu.
   */
  private registerPasteContextMenuAction() {
    const pasteAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) =>
        Msg['PASTE_SHORTCUT'].replace(
          '%1',
          getShortActionShortcut(Constants.SHORTCUT_NAMES.PASTE),
        ),
      preconditionFn: (scope: ContextMenuRegistry.Scope) => {
        const workspace = this.getPasteWorkspace(scope);
        if (!workspace) return 'hidden';

        // Unfortunately, this will return enabled even if nothing is in the clipboard
        // This is because the clipboard data is not actually exposed in core
        // so there's no way to check
        return workspace.isReadOnly() ? 'disabled' : 'enabled';
      },
      callback: (scope: ContextMenuRegistry.Scope, menuOpenEvent: Event) => {
        const workspace = this.getPasteWorkspace(scope);
        if (!workspace) return;
        return this.pasteCallback(workspace, menuOpenEvent, undefined, scope);
      },
      id: 'blockPasteFromContextMenu',
      weight: BASE_WEIGHT + 2,
    };

    ContextMenuRegistry.registry.register(pasteAction);
  }

  /**
   * Gets the workspace where something should be pasted.
   * Tries to get the workspace the focusable item is on,
   * or the target workspace if the focusable item is in a flyout,
   * or falls back to the main workspace.
   *
   * @param scope scope from the action that initiated the paste
   * @returns a workspace to paste into if possible, otherwise null
   */
  private getPasteWorkspace(scope: ContextMenuRegistry.Scope) {
    const focusTree = (scope.focusedNode as IFocusableNode).getFocusableTree();
    let workspace;
    if (focusTree instanceof WorkspaceSvg) {
      workspace = focusTree;
    } else if (focusTree instanceof Flyout) {
      // Seems like this case doesn't actually happen and a
      // (flyout) Workspace is returned instead, but it's possible
      workspace = focusTree.targetWorkspace;
    } else {
      // Give up and just paste in the main workspace
      workspace = getMainWorkspace() as WorkspaceSvg;
    }

    if (!workspace) return null;
    // If we're trying to paste in a flyout, paste in the target workspace instead
    if (workspace.isFlyout)
      workspace = workspace.targetWorkspace as WorkspaceSvg;

    return workspace;
  }

  /**
   * The callback for the paste action. Uses the registered version of the paste callback
   * to perform the paste logic, then clears any toasts about pasting.
   *
   * @param workspace Workspace where shortcut happened.
   * @param e menu open event or keyboard event
   * @param shortcut keyboard shortcut or undefined for context menus
   * @param scope scope of the shortcut or context menu item
   * @returns true if a paste happened, false otherwise
   */
  private pasteCallback(
    workspace: WorkspaceSvg,
    e: Event,
    shortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
    },
    scope: ContextMenuRegistry.Scope,
  ) {
    const didPaste =
      !!this.oldPasteCallback &&
      this.oldPasteCallback(workspace, e, shortcut, scope);

    // Clear the paste hints regardless of whether something was pasted
    // Some implementations of paste are async and we should clear the hint
    // once the user initiates the paste action.
    clearPasteHints(workspace);
    return didPaste;
  }
}
