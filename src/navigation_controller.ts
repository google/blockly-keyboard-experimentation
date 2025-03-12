/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Registers all of the keyboard shortcuts that are necessary for
 * navigating blockly using the keyboard.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

import './gesture_monkey_patch';
import './toolbox_monkey_patch';

import * as Blockly from 'blockly/core';
import {
  ASTNode,
  ShortcutRegistry,
  Toolbox,
  utils as BlocklyUtils,
  WorkspaceSvg,
} from 'blockly/core';

import * as Constants from './constants';
import {Navigation} from './navigation';
import {Announcer} from './announcer';
import {LineCursor} from './line_cursor';
import {ShortcutDialog} from './shortcut_dialog';
import {DeleteAction} from './actions/delete';
import {InsertAction} from './actions/insert';
import {Clipboard} from './actions/clipboard';
import {WorkspaceMovement} from './actions/ws_movement';
import {ExitAction} from './actions/exit';
import {EnterAction} from './actions/enter';
import {DisconnectAction} from './actions/disconnect';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/** Represents the current focus mode of the navigation controller. */
enum NAVIGATION_FOCUS_MODE {
  /** Indicates that no interactive elements of Blockly currently have focus. */
  NONE = 'none',
  /** Indicates that the toolbox currently has focus. */
  TOOLBOX = 'toolbox',
  /** Indicates that the main workspace currently has focus. */
  WORKSPACE = 'workspace',
}

/**
 * Class for registering shortcuts for keyboard navigation.
 */
export class NavigationController {
  navigation: Navigation = new Navigation();
  announcer: Announcer = new Announcer();
  shortcutDialog: ShortcutDialog = new ShortcutDialog();

  /** Context menu and keyboard action for deletion. */
  deleteAction: DeleteAction = new DeleteAction(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  /** Context menu and keyboard action for insertion. */
  insertAction: InsertAction = new InsertAction(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  /** Keyboard shortcut for disconnection. */
  disconnectAction: DisconnectAction = new DisconnectAction(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  clipboard: Clipboard = new Clipboard(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  workspaceMovement: WorkspaceMovement = new WorkspaceMovement(
    this.canCurrentlyEdit.bind(this),
  );

  exitAction: ExitAction = new ExitAction(
    this.navigation,
    this.canCurrentlyNavigate.bind(this),

  enterAction: EnterAction = new EnterAction(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  navigationFocus: NAVIGATION_FOCUS_MODE = NAVIGATION_FOCUS_MODE.NONE;

  /**
   * Original Toolbox.prototype.onShortcut method, saved by
   * addShortcutHandlers.
   */
  private origToolboxOnShortcut:
    | typeof Blockly.Toolbox.prototype.onShortcut
    | null = null;

  /**
   * Registers the default keyboard shortcuts for keyboard navigation.
   */
  init() {
    this.addShortcutHandlers();
    this.registerDefaults();
  }

  /**
   * Monkeypatches core Blockly components to add methods that allow
   * them to handle keyboard shortcuts when in keyboard navigation
   * mode.
   */
  protected addShortcutHandlers() {
    this.origToolboxOnShortcut = Toolbox.prototype.onShortcut;
    Toolbox.prototype.onShortcut = this.toolboxHandler;
  }

  /**
   * Removes monkeypatches from core Blockly components.
   */
  protected removeShortcutHandlers() {
    if (!this.origToolboxOnShortcut) {
      throw new Error('no original onShortcut method recorded');
    }
    Blockly.Toolbox.prototype.onShortcut = this.origToolboxOnShortcut;
    this.origToolboxOnShortcut = null;
  }

  /**
   * Handles the given keyboard shortcut.
   * This is only triggered when keyboard accessibility mode is enabled.
   *
   * @param shortcut The shortcut to be handled.
   * @returns True if the toolbox handled the shortcut, false otherwise.
   */
  protected toolboxHandler(
    this: Blockly.Toolbox,
    shortcut: ShortcutRegistry.KeyboardShortcut,
  ): boolean {
    if (!this.selectedItem_) {
      return false;
    }
    switch (shortcut.name) {
      case Constants.SHORTCUT_NAMES.PREVIOUS:
        return (this as any).selectPrevious();
      case Constants.SHORTCUT_NAMES.OUT:
        return (this as any).selectParent();
      case Constants.SHORTCUT_NAMES.NEXT:
        return (this as any).selectNext();
      case Constants.SHORTCUT_NAMES.IN:
        return (this as any).selectChild();
      default:
        return false;
    }
  }

  /**
   * Adds all necessary event listeners and markers to a workspace for keyboard
   * navigation to work. This must be called for keyboard navigation to work
   * on a workspace.
   *
   * @param workspace The workspace to add keyboard
   *     navigation to.
   */
  addWorkspace(workspace: WorkspaceSvg) {
    this.navigation.addWorkspace(workspace);
  }

  /**
   * Removes all necessary event listeners and markers to a workspace for
   * keyboard navigation to work.
   *
   * @param workspace The workspace to remove keyboard
   *     navigation from.
   */
  removeWorkspace(workspace: WorkspaceSvg) {
    this.navigation.removeWorkspace(workspace);
  }

  /**
   * Sets whether the navigation controller has toolbox focus and will enable
   * keyboard navigation in the toolbox.
   *
   * If the workspace doesn't have a toolbox, this function is a no-op.
   *
   * @param workspace the workspace that now has toolbox input focus.
   * @param isFocused whether the environment has browser focus.
   */
  updateToolboxFocus(workspace: WorkspaceSvg, isFocused: boolean) {
    if (!workspace.getToolbox()) return;
    if (isFocused) {
      this.navigation.focusToolbox(workspace);
      this.navigationFocus = NAVIGATION_FOCUS_MODE.TOOLBOX;
    } else {
      this.navigation.blurToolbox(workspace);
      this.navigationFocus = NAVIGATION_FOCUS_MODE.NONE;
    }
  }

  /**
   * Sets whether the navigation controller has workspace focus. This will
   * enable keyboard navigation within the workspace. Additionally, the cursor
   * may be reset if it hasn't already been positioned in the workspace.
   *
   * @param workspace the workspace that now has workspace input focus.
   * @param isFocused whether the environment has browser focus.
   */
  updateWorkspaceFocus(workspace: WorkspaceSvg, isFocused: boolean) {
    if (isFocused) {
      this.navigation.focusWorkspace(workspace, true);
      this.navigationFocus = NAVIGATION_FOCUS_MODE.WORKSPACE;
    } else {
      this.navigationFocus = NAVIGATION_FOCUS_MODE.NONE;

      // Hide cursor to indicate lost focus. Also, mark the current node so that
      // it can be properly restored upon returning to the workspace.
      this.navigation.markAtCursor(workspace);
      workspace.getCursor()?.hide();
    }
  }

  /**
   * Determines whether keyboard navigation should be allowed based on the
   * current state of the workspace.
   *
   * A return value of 'true' generally indicates that either the workspace or
   * toolbox both has enabled keyboard navigation and is currently in a state
   * (e.g. focus) that can support keyboard navigation.
   *
   * @param workspace the workspace in which keyboard navigation may be allowed.
   * @returns whether keyboard navigation is currently allowed.
   */
  private canCurrentlyNavigate(workspace: WorkspaceSvg) {
    return this.canCurrentlyNavigateInToolbox(workspace) ||
      this.canCurrentlyNavigateInWorkspace(workspace);
  }

  private canCurrentlyNavigateInToolbox(workspace: WorkspaceSvg) {
    return workspace.keyboardAccessibilityMode &&
      this.navigationFocus == NAVIGATION_FOCUS_MODE.TOOLBOX;
  }

  private canCurrentlyNavigateInWorkspace(workspace: WorkspaceSvg) {
    return workspace.keyboardAccessibilityMode &&
      this.navigationFocus == NAVIGATION_FOCUS_MODE.WORKSPACE;
  }

  /**
   * Determines whether the provided workspace is currently keyboard navigable
   * and editable.
   *
   * For the navigability criteria, see canCurrentlyKeyboardNavigate.
   *
   * @param workspace the workspace in which keyboard editing may be allowed.
   * @returns whether keyboard navigation and editing is currently allowed.
   */
  private canCurrentlyEdit(workspace: WorkspaceSvg) {
    return this.canCurrentlyNavigate(workspace) && !workspace.options.readOnly;
  }

  /**
   * Turns on keyboard navigation.
   *
   * @param workspace The workspace to turn on keyboard
   *     navigation for.
   */
  enable(workspace: WorkspaceSvg) {
    this.navigation.enableKeyboardAccessibility(workspace);
  }

  /**
   * Turns off keyboard navigation.
   *
   * @param workspace The workspace to turn off keyboard
   *     navigation on.
   */
  disable(workspace: WorkspaceSvg) {
    this.navigation.disableKeyboardAccessibility(workspace);
  }

  /**
   * Gives the cursor to the field to handle if the cursor is on a field.
   *
   * @param workspace The workspace to check.
   * @param shortcut The shortcut
   *     to give to the field.
   * @returns True if the shortcut was handled by the field, false
   *     otherwise.
   */
  protected fieldShortcutHandler(
    workspace: WorkspaceSvg,
    shortcut: ShortcutRegistry.KeyboardShortcut,
  ): boolean {
    const cursor = workspace.getCursor();
    if (!cursor || !cursor.getCurNode()) {
      return false;
    }
    const curNode = cursor.getCurNode();
    if (curNode.getType() === ASTNode.types.FIELD) {
      return (curNode.getLocation() as Blockly.Field).onShortcut(shortcut);
    }
    return false;
  }

  /**
   * List all the currently registered shortcuts.
   */
  listShortcuts() {
    this.announcer.listShortcuts();
  }

  /**
   * Dictionary of KeyboardShortcuts.
   */
  protected shortcuts: {
    [name: string]: ShortcutRegistry.KeyboardShortcut;
  } = {
    /** Go to the previous location. */
    previous: {
      name: Constants.SHORTCUT_NAMES.PREVIOUS,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace, _, shortcut) => {
        const flyout = workspace.getFlyout();
        const toolbox = workspace.getToolbox() as Blockly.Toolbox;
        let isHandled = false;
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            isHandled = this.fieldShortcutHandler(workspace, shortcut);
            if (!isHandled) {
              workspace.getCursor()?.prev();
              isHandled = true;
            }
            return isHandled;
          case Constants.STATE.FLYOUT:
            isHandled = this.fieldShortcutHandler(workspace, shortcut);
            if (!isHandled && flyout) {
              flyout.getWorkspace()?.getCursor()?.prev();
              isHandled = true;
            }
            return isHandled;
          case Constants.STATE.TOOLBOX:
            return toolbox && typeof toolbox.onShortcut === 'function'
              ? toolbox.onShortcut(shortcut)
              : false;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.UP],
    },

    /** Go to the out location. */
    out: {
      name: Constants.SHORTCUT_NAMES.OUT,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace, _, shortcut) => {
        const toolbox = workspace.getToolbox() as Blockly.Toolbox;
        let isHandled = false;
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            isHandled = this.fieldShortcutHandler(workspace, shortcut);
            if (!isHandled && workspace) {
              workspace.getCursor()?.out();
              isHandled = true;
            }
            return isHandled;
          case Constants.STATE.FLYOUT:
            this.navigation.focusToolbox(workspace);
            return true;
          case Constants.STATE.TOOLBOX:
            return toolbox && typeof toolbox.onShortcut === 'function'
              ? toolbox.onShortcut(shortcut)
              : false;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.LEFT],
    },

    /** Go to the next location. */
    next: {
      name: Constants.SHORTCUT_NAMES.NEXT,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace, _, shortcut) => {
        const toolbox = workspace.getToolbox() as Blockly.Toolbox;
        const flyout = workspace.getFlyout();
        let isHandled = false;
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            isHandled = this.fieldShortcutHandler(workspace, shortcut);
            if (!isHandled && workspace) {
              workspace.getCursor()?.next();
              isHandled = true;
            }
            return isHandled;
          case Constants.STATE.FLYOUT:
            isHandled = this.fieldShortcutHandler(workspace, shortcut);
            if (!isHandled && flyout) {
              flyout.getWorkspace()?.getCursor()?.next();
              isHandled = true;
            }
            return isHandled;
          case Constants.STATE.TOOLBOX:
            return toolbox && typeof toolbox.onShortcut === 'function'
              ? toolbox.onShortcut(shortcut)
              : false;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.DOWN],
    },

    /** Go to the in location. */
    in: {
      name: Constants.SHORTCUT_NAMES.IN,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace, _, shortcut) => {
        const toolbox = workspace.getToolbox() as Blockly.Toolbox;
        let isHandled = false;
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            isHandled = this.fieldShortcutHandler(workspace, shortcut);
            if (!isHandled && workspace) {
              workspace.getCursor()?.in();
              isHandled = true;
            }
            return isHandled;
          case Constants.STATE.TOOLBOX:
            isHandled =
              toolbox && typeof toolbox.onShortcut === 'function'
                ? toolbox.onShortcut(shortcut)
                : false;
            if (!isHandled) {
              this.navigation.focusFlyout(workspace);
            }
            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.RIGHT],
    },

    /**
     * Cmd/Ctrl/Alt+Enter key:
     *
     * Shows the action menu.
     */
    menu: {
      name: Constants.SHORTCUT_NAMES.MENU,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            return this.navigation.openActionMenu(workspace);
          default:
            return false;
        }
      },
      keyCodes: [
        createSerializedKey(KeyCodes.ENTER, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.ENTER, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.ENTER, [KeyCodes.META]),
      ],
    },

    /** Move focus to or from the toolbox. */
    focusToolbox: {
      name: Constants.SHORTCUT_NAMES.TOOLBOX,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            if (!workspace.getToolbox()) {
              this.navigation.focusFlyout(workspace);
            } else {
              this.navigation.focusToolbox(workspace);
            }
            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.T],
    },

    /** Announce the current location of the cursor. */
    announceLocation: {
      name: Constants.SHORTCUT_NAMES.ANNOUNCE,
      callback: (workspace) => {
        const cursor = workspace.getCursor();
        if (!cursor) return false;
        // Print out the type of the current node.
        this.announcer.setText(cursor.getCurNode().getType());
        return true;
      },
      keyCodes: [KeyCodes.A],
    },
    /** Clean up the workspace. */
    cleanup: {
      name: Constants.SHORTCUT_NAMES.CLEAN_UP,
      preconditionFn: (workspace) => workspace.getTopBlocks(false).length > 0,
      callback: (workspace) => {
        workspace.cleanUp();
        this.announcer.setText('clean up');
        return true;
      },
      keyCodes: [KeyCodes.C],
    },
  };

  /**
   * Registers all default keyboard shortcut items for keyboard
   * navigation. This should be called once per instance of
   * KeyboardShortcutRegistry.
   */
  protected registerDefaults() {
    for (const shortcut of Object.values(this.shortcuts)) {
      ShortcutRegistry.registry.register(shortcut);
    }
    this.deleteAction.install();
    this.insertAction.install();
    this.workspaceMovement.install();
    this.exitAction.install();
    this.enterAction.install();
    this.disconnectAction.install();

    this.clipboard.install();
    this.shortcutDialog.install();

    // Initialize the shortcut modal with available shortcuts.  Needs
    // to be done separately rather at construction, as many shortcuts
    // are not registered at that point.
    this.shortcutDialog.createModalContent();
  }

  /**
   * Removes all the keyboard navigation shortcuts.
   */
  dispose() {
    for (const shortcut of Object.values(this.shortcuts)) {
      ShortcutRegistry.registry.unregister(shortcut.name);
    }

    this.deleteAction.uninstall();
    this.insertAction.uninstall();
    this.disconnectAction.uninstall();
    this.clipboard.uninstall();
    this.workspaceMovement.uninstall();
    this.exitAction.uninstall();
    this.enterAction.uninstall();
    this.shortcutDialog.uninstall();

    this.removeShortcutHandlers();
    this.navigation.dispose();
  }
}
