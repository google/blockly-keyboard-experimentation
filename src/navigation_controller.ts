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

import * as Blockly from 'blockly/core';
import {
  ASTNode,
  BlockSvg,
  comments,
  Connection,
  ConnectionType,
  ContextMenuRegistry,
  ICopyData,
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
import {Clipboard} from './actions/clipboard';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

interface Scope {
  block?: BlockSvg;
  workspace?: WorkspaceSvg;
  comment?: comments.RenderedWorkspaceComment;
  connection?: Connection;
}

/**
 * Class for registering shortcuts for keyboard navigation.
 */
export class NavigationController {
  navigation: Navigation = new Navigation();
  announcer: Announcer = new Announcer();
  shortcutDialog: ShortcutDialog = new ShortcutDialog();

  /** Context menu and keyboard action for delete. */
  deleteAction: DeleteAction = new DeleteAction(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  clipboard: Clipboard = new Clipboard(
    this.navigation,
    this.canCurrentlyEdit.bind(this),
  );

  hasNavigationFocus: boolean = false;

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
   * Sets whether the navigation controller has focus. This will enable keyboard
   * navigation if focus is now gained. Additionally, the cursor may be reset if
   * it hasn't already been positioned in the workspace.
   *
   * @param workspace the workspace that now has input focus.
   * @param isFocused whether the environment has browser focus.
   */
  setHasFocus(workspace: WorkspaceSvg, isFocused: boolean) {
    this.hasNavigationFocus = isFocused;
    if (isFocused) {
      this.navigation.focusWorkspace(workspace, true);
    }
  }

  /**
   * Determines whether keyboard navigation should be allowed based on the
   * current state of the workspace.
   *
   * A return value of 'true' generally indicates that the workspace both has
   * enabled keyboard navigation and is currently in a state (e.g. focus) that
   * can support keyboard navigation.
   *
   * @param workspace the workspace in which keyboard navigation may be allowed.
   * @returns whether keyboard navigation is currently allowed.
   */
  private canCurrentlyNavigate(workspace: WorkspaceSvg) {
    return workspace.keyboardAccessibilityMode && this.hasNavigationFocus;
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

    /** Turn keyboard navigation on or off. */
    toggleKeyboardNav: {
      name: Constants.SHORTCUT_NAMES.TOGGLE_KEYBOARD_NAV,
      callback: (workspace) => {
        if (workspace.keyboardAccessibilityMode) {
          this.navigation.disableKeyboardAccessibility(workspace);
        } else {
          this.navigation.enableKeyboardAccessibility(workspace);
        }
        return true;
      },
      keyCodes: [
        createSerializedKey(KeyCodes.K, [KeyCodes.CTRL, KeyCodes.SHIFT]),
      ],
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

    /** Connect a block to a marked location. */
    insert: {
      name: Constants.SHORTCUT_NAMES.INSERT,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            return this.navigation.connectMarkerAndCursor(workspace);
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.I],
    },

    /**
     * Enter key:
     *
     * - On the flyout: press a button or choose a block to place.
     * - On a stack: open a block's context menu or field's editor.
     * - On the workspace: open the context menu.
     */
    enter: {
      name: Constants.SHORTCUT_NAMES.MARK, // FIXME
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        let flyoutCursor;
        let curNode;
        let nodeType;

        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            this.navigation.handleEnterForWS(workspace);
            return true;
          case Constants.STATE.FLYOUT:
            flyoutCursor = this.navigation.getFlyoutCursor(workspace);
            if (!flyoutCursor) {
              return false;
            }
            curNode = flyoutCursor.getCurNode();
            nodeType = curNode.getType();

            switch (nodeType) {
              case ASTNode.types.STACK:
                this.navigation.insertFromFlyout(workspace);
                break;
              case ASTNode.types.BUTTON:
                this.navigation.triggerButtonCallback(workspace);
                break;
            }

            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.ENTER],
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

    /** Disconnect two blocks. */
    disconnect: {
      name: Constants.SHORTCUT_NAMES.DISCONNECT,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            this.navigation.disconnectBlocks(workspace);
            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.X],
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

    /** Exit the current location and focus on the workspace. */
    exit: {
      name: Constants.SHORTCUT_NAMES.EXIT,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.FLYOUT:
            this.navigation.focusWorkspace(workspace);
            return true;
          case Constants.STATE.TOOLBOX:
            this.navigation.focusWorkspace(workspace);
            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.ESC, KeyCodes.E],
      allowCollision: true,
    },

    /** Move the cursor on the workspace to the left. */
    wsMoveLeft: {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_LEFT,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, -1, 0);
      },
      keyCodes: [createSerializedKey(KeyCodes.A, [KeyCodes.SHIFT])],
    },

    /** Move the cursor on the workspace to the right. */
    wsMoveRight: {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_RIGHT,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, 1, 0);
      },
      keyCodes: [createSerializedKey(KeyCodes.D, [KeyCodes.SHIFT])],
    },

    /** Move the cursor on the workspace up. */
    wsMoveUp: {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_UP,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, 0, -1);
      },
      keyCodes: [createSerializedKey(KeyCodes.W, [KeyCodes.SHIFT])],
    },

    /** Move the cursor on the workspace down. */
    wsMoveDown: {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_DOWN,
      preconditionFn: (workspace) => this.canCurrentlyEdit(workspace),
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, 0, 1);
      },
      keyCodes: [createSerializedKey(KeyCodes.S, [KeyCodes.SHIFT])],
    },

    /** List all of the currently registered shortcuts. */
    announceShortcuts: {
      name: Constants.SHORTCUT_NAMES.LIST_SHORTCUTS,
      callback: () => {
        this.shortcutDialog.toggle();
        return true;
      },
      keyCodes: [KeyCodes.SLASH],
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

    /** Go to the next sibling of the cursor's current location. */
    nextSibling: {
      name: Constants.SHORTCUT_NAMES.GO_TO_NEXT_SIBLING,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      // Jump to the next node at the same level, when in the workspace.
      callback: (workspace, e, shortcut) => {
        const cursor = workspace.getCursor() as LineCursor;

        if (this.navigation.getState(workspace) === Constants.STATE.WORKSPACE) {
          if (this.fieldShortcutHandler(workspace, shortcut)) {
            this.announcer.setText('next sibling (handled by field)');
            return true;
          }
          if (cursor.nextSibling()) {
            this.announcer.setText('next sibling (success)');
            return true;
          }
        }
        this.announcer.setText('next sibling (no-op)');
        return false;
      },
      keyCodes: [KeyCodes.N],
    },

    /** Go to the previous sibling of the cursor's current location. */
    previousSibling: {
      name: Constants.SHORTCUT_NAMES.GO_TO_PREVIOUS_SIBLING,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      // Jump to the previous node at the same level, when in the workspace.
      callback: (workspace, e, shortcut) => {
        const cursor = workspace.getCursor() as LineCursor;

        if (this.navigation.getState(workspace) === Constants.STATE.WORKSPACE) {
          if (this.fieldShortcutHandler(workspace, shortcut)) {
            this.announcer.setText('previous sibling (handled by field)');
            return true;
          }
          if (cursor.previousSibling()) {
            this.announcer.setText('previous sibling (success)');
            return true;
          }
        }
        this.announcer.setText('previous sibling (no-op)');
        return false;
      },
      keyCodes: [KeyCodes.M],
    },

    /** Jump to the root of the current stack. */
    jumpToRoot: {
      name: Constants.SHORTCUT_NAMES.JUMP_TO_ROOT,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      // Jump to the root of the current stack.
      callback: (workspace) => {
        const cursor = workspace.getCursor();
        if (!cursor) return false;
        const curNode = cursor.getCurNode();
        const curBlock = curNode.getSourceBlock();
        if (curBlock) {
          const rootBlock = curBlock.getRootBlock();
          const stackNode = ASTNode.createStackNode(rootBlock) as ASTNode;
          cursor.setCurNode(stackNode);
          this.announcer.setText('jumped to root');
          return true;
        }
        this.announcer.setText('could not jump to root');
        return false;
      },
      keyCodes: [KeyCodes.R],
    },

    /** Move the cursor out of its current context, such as a loop block. */
    contextOut: {
      name: Constants.SHORTCUT_NAMES.CONTEXT_OUT,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace) => {
        if (this.navigation.getState(workspace) === Constants.STATE.WORKSPACE) {
          this.announcer.setText('context out');
          const cursor = workspace.getCursor() as LineCursor;
          if (cursor.contextOut()) {
            return true;
          }
        }
        this.announcer.setText('context out (no-op)');
        return false;
      },
      keyCodes: [createSerializedKey(KeyCodes.O, [KeyCodes.SHIFT])],
    },

    /** Move the cursor in a level of context, such as into a loop. */
    contextIn: {
      name: Constants.SHORTCUT_NAMES.CONTEXT_IN,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      // Print out the type of the current node.
      callback: (workspace) => {
        if (this.navigation.getState(workspace) === Constants.STATE.WORKSPACE) {
          const cursor = workspace.getCursor() as LineCursor;
          if (cursor.contextIn()) {
            this.announcer.setText('context in');
            return true;
          }
        }
        this.announcer.setText('context in (no-op)');
        return false;
      },
      keyCodes: [createSerializedKey(KeyCodes.I, [KeyCodes.SHIFT])],
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
   * Register the action for inserting above a block.
   */
  protected registerInsertAction() {
    const insertAboveAction: ContextMenuRegistry.RegistryItem = {
      displayText: (scope: Scope) =>
        scope.block?.previousConnection ? 'Insert Block Above' : 'Insert Block',
      preconditionFn: (scope: Scope) => {
        const block = scope.block ?? scope.connection?.getSourceBlock();
        const ws = block?.workspace as WorkspaceSvg | null;
        if (!ws) return 'hidden';

        return this.canCurrentlyEdit(ws) ? 'enabled' : 'hidden';
      },
      callback: (scope: Scope) => {
        let ws =
          scope.block?.workspace ??
          (scope.connection?.getSourceBlock().workspace as WorkspaceSvg);
        if (!ws) return false;

        if (this.navigation.getState(ws) === Constants.STATE.WORKSPACE) {
          this.navigation.openToolboxOrFlyout(ws);
          return true;
        }
        return false;
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'insert',
      weight: 9,
    };
    ContextMenuRegistry.registry.register(insertAboveAction);
  }

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

    this.clipboard.install();

    this.registerInsertAction();

    // Initalise the shortcut modal with available shortcuts.  Needs
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
    this.clipboard.uninstall();

    this.removeShortcutHandlers();
    this.navigation.dispose();
  }
}
