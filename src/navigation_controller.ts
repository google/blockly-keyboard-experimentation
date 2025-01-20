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

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

/**
 * Class for registering shortcuts for keyboard navigation.
 */
export class NavigationController {
  /** Data copied by the copy or cut keyboard shortcuts. */
  copyData: ICopyData | null = null;

  /** The workspace a copy or cut keyboard shortcut happened in. */
  copyWorkspace: WorkspaceSvg | null = null;
  navigation: Navigation = new Navigation();
  announcer: Announcer = new Announcer();
  shortcutDialog: ShortcutDialog = new ShortcutDialog();

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
        return (this as any).selectPrevious_();
      case Constants.SHORTCUT_NAMES.OUT:
        return (this as any).selectParent_();
      case Constants.SHORTCUT_NAMES.NEXT:
        return (this as any).selectNext_();
      case Constants.SHORTCUT_NAMES.IN:
        return (this as any).selectChild_();
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
   * Precondition function for deleting a block from keyboard
   * navigation. This precondition is shared between keyboard shortcuts
   * and context menu items.
   *
   * FIXME: This should be better encapsulated.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @returns True iff `deleteCallbackFn` function should be called.
   */
  protected deletePreconditionFn(workspace: WorkspaceSvg) {
    if (!this.canCurrentlyEdit(workspace)) return false;
    const sourceBlock = workspace.getCursor()?.getCurNode().getSourceBlock();
    return !!(sourceBlock?.isDeletable());
  }

  /**
   * Callback function for deleting a block from keyboard
   * navigation. This callback is shared between keyboard shortcuts
   * and context menu items.
   *
   * FIXME: This should be better encapsulated.
   *
   * @param workspace The `WorkspaceSvg` where the shortcut was
   *     invoked.
   * @param e The originating event for a keyboard shortcut, or null
   *     if called from a context menu.
   * @returns True if this function successfully handled deletion.
   */
  protected deleteCallbackFn(workspace: WorkspaceSvg, e: Event | null) {
    const cursor = workspace.getCursor();
    if (!cursor) return false;
    const sourceBlock = cursor.getCurNode().getSourceBlock() as BlockSvg;
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
    if (Blockly.Gesture.inProgress()) false;
    this.navigation.moveCursorOnBlockDelete(workspace, sourceBlock);
    sourceBlock.checkAndDelete();
    return true;
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
            return toolbox && typeof toolbox.onShortcut == 'function'
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
            return toolbox && typeof toolbox.onShortcut == 'function'
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
            return toolbox && typeof toolbox.onShortcut == 'function'
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
              toolbox && typeof toolbox.onShortcut == 'function'
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

    /** Copy the block the cursor is currently on. */
    copy: {
      name: Constants.SHORTCUT_NAMES.COPY,
      preconditionFn: (workspace) => {
        if (this.canCurrentlyEdit(workspace)) {
          switch (this.navigation.getState(workspace)) {
            case Constants.STATE.WORKSPACE:
              const curNode = workspace?.getCursor()?.getCurNode();
              const source = curNode?.getSourceBlock();
              return !!(
                source?.isDeletable() &&
                source?.isMovable() &&
                !Blockly.Gesture.inProgress()
              );
            case Constants.STATE.FLYOUT:
              const flyoutWorkspace = workspace.getFlyout()?.getWorkspace();
              const sourceBlock = flyoutWorkspace
                ?.getCursor()
                ?.getCurNode()
                ?.getSourceBlock();
              return !!(sourceBlock && !Blockly.Gesture.inProgress());
            default:
              return false;
          }
        }
        return false;
      },
      callback: (workspace) => {
        const navigationState = this.navigation.getState(workspace);
        let activeWorkspace: Blockly.WorkspaceSvg | undefined = workspace;
        if (navigationState == Constants.STATE.FLYOUT) {
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
      },
      keyCodes: [
        createSerializedKey(KeyCodes.C, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.C, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.C, [KeyCodes.META]),
      ],
      allowCollision: true,
    },

    /**
     * Paste the copied block, to the marked location if possible or
     * onto the workspace otherwise.
     */
    paste: {
      name: Constants.SHORTCUT_NAMES.PASTE,
      preconditionFn: (workspace) =>
        this.canCurrentlyEdit(workspace) && !Blockly.Gesture.inProgress(),
      callback: (workspace) => {
        if (!this.copyData || !this.copyWorkspace) return false;
        const pasteWorkspace = this.copyWorkspace.isFlyout
          ? workspace
          : this.copyWorkspace;
        return this.navigation.paste(this.copyData, pasteWorkspace);
      },
      keyCodes: [
        createSerializedKey(KeyCodes.V, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.V, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.V, [KeyCodes.META]),
      ],
      allowCollision: true,
    },

    /** Copy and delete the block the cursor is currently on. */
    cut: {
      name: Constants.SHORTCUT_NAMES.CUT,
      preconditionFn: (workspace) => {
        if (this.canCurrentlyEdit(workspace)) {
          const curNode = workspace.getCursor()?.getCurNode();
          if (curNode && curNode.getSourceBlock()) {
            const sourceBlock = curNode.getSourceBlock();
            return !!(
              !Blockly.Gesture.inProgress() &&
              sourceBlock &&
              sourceBlock.isDeletable() &&
              sourceBlock.isMovable() &&
              !sourceBlock.workspace.isFlyout
            );
          }
        }
        return false;
      },
      callback: (workspace) => {
        const sourceBlock = workspace
          .getCursor()
          ?.getCurNode()
          .getSourceBlock() as BlockSvg;
        this.copyData = sourceBlock.toCopyData();
        this.copyWorkspace = sourceBlock.workspace;
        this.navigation.moveCursorOnBlockDelete(workspace, sourceBlock);
        sourceBlock.checkAndDelete();
        return true;
      },
      keyCodes: [
        createSerializedKey(KeyCodes.X, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.X, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.X, [KeyCodes.META]),
      ],
      allowCollision: true,
    },

    /** Keyboard shortcut to delete the block the cursor is currently on. */
    delete: {
      name: Constants.SHORTCUT_NAMES.DELETE,
      preconditionFn: this.deletePreconditionFn,
      callback: this.deleteCallbackFn,
      keyCodes: [KeyCodes.DELETE, KeyCodes.BACKSPACE],
      allowCollision: true,
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

        if (this.navigation.getState(workspace) == Constants.STATE.WORKSPACE) {
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

        if (this.navigation.getState(workspace) == Constants.STATE.WORKSPACE) {
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
        if (this.navigation.getState(workspace) == Constants.STATE.WORKSPACE) {
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
        if (this.navigation.getState(workspace) == Constants.STATE.WORKSPACE) {
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
   * Register the delete block action as a context menu item on blocks.
   * This function mixes together the keyboard and context menu preconditions
   * but only calls the keyboard callback.
   */
  protected registerDeleteAction() {
    const originalDeleteItem =
      ContextMenuRegistry.registry.getItem('blockDelete');
    if (!originalDeleteItem) return;

    const deleteItem: ContextMenuRegistry.RegistryItem = {
      displayText: (scope) => {
        // FIXME: Consider using the original delete item's display text,
        // which is dynamic based on the nubmer of blocks to delete.
        return 'Keyboard Navigation: delete';
      },
      preconditionFn: (scope) => {
        // FIXME: Find a better way to get the workspace, or use `as WorkspaceSvg`.
        const ws = scope.block?.workspace;

        // Run the original precondition code, from the context menu option.
        // If the item would be hidden or disabled, respect it.
        const originalPreconditionResult =
          originalDeleteItem.preconditionFn(scope);
        if (!ws || originalPreconditionResult != 'enabled') {
          return originalPreconditionResult;
        }

        // Return enabled if the keyboard shortcut precondition is allowed,
        // and disabled if the context menu precondition is met but the keyboard
        // shortcut precondition is not met.
        return this.deletePreconditionFn(ws) ? 'enabled' : 'disabled';
      },
      callback: (scope) => {
        // FIXME: Find a better way to get the workspace, or use `as WorkspaceSvg`.
        const ws = scope.block?.workspace;
        if (!ws) return;

        // Delete the block(s), and put the cursor back in a sane location.
        return this.deleteCallbackFn(ws, null);
      },
      scopeType: ContextMenuRegistry.ScopeType.BLOCK,
      id: 'blockDeleteFromContextMenu',
      weight: 10,
    };

    // FIXME: Decide whether to unregister the original item.
    ContextMenuRegistry.registry.register(deleteItem);
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

    this.registerDeleteAction();

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

    this.removeShortcutHandlers();
    this.navigation.dispose();
  }
}
