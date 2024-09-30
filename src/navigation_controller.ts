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
   * Keyboard shortcut to go to the previous location when in keyboard
   * navigation mode.
   */
  protected registerPrevious() {
    const previousShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.PREVIOUS,
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
      callback: (workspace, e, shortcut) => {
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
    };

    ShortcutRegistry.registry.register(previousShortcut);
  }

  /**
   * Keyboard shortcut to turn keyboard navigation on or off.
   */
  protected registerToggleKeyboardNav() {
    const toggleKeyboardNavShortcut: ShortcutRegistry.KeyboardShortcut = {
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
    };

    ShortcutRegistry.registry.register(toggleKeyboardNavShortcut);
  }

  /**
   * Keyboard shortcut to go to the out location when in keyboard navigation
   * mode.
   */
  protected registerOut() {
    const outShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.OUT,
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
      callback: (workspace, e, shortcut) => {
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
    };

    ShortcutRegistry.registry.register(outShortcut);
  }

  /**
   * Keyboard shortcut to go to the next location when in keyboard navigation
   * mode.
   */
  protected registerNext() {
    const nextShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.NEXT,
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
      callback: (workspace, e, shortcut) => {
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
    };

    ShortcutRegistry.registry.register(nextShortcut);
  }

  /**
   * Keyboard shortcut to go to the in location when in keyboard navigation
   * mode.
   */
  protected registerIn() {
    const inShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.IN,
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
      callback: (workspace, e, shortcut) => {
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
    };

    ShortcutRegistry.registry.register(inShortcut);
  }

  /**
   * Keyboard shortcut to connect a block to a marked location when in keyboard
   * navigation mode.
   */
  protected registerInsert() {
    const insertShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.INSERT,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            return this.navigation.connectMarkerAndCursor(workspace);
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.I],
    };

    ShortcutRegistry.registry.register(insertShortcut);
  }

  /**
   * Keyboard shortcut to mark a location when in keyboard navigation mode.
   */
  protected registerMark() {
    const markShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.MARK,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
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
    };

    ShortcutRegistry.registry.register(markShortcut);
  }

  /**
   * Keyboard shortcut to disconnect two blocks when in keyboard navigation
   * mode.
   */
  protected registerDisconnect() {
    const disconnectShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.DISCONNECT,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
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
    };

    ShortcutRegistry.registry.register(disconnectShortcut);
  }

  /**
   * Keyboard shortcut to focus on the toolbox when in keyboard navigation
   * mode.
   */
  protected registerToolboxFocus() {
    const focusToolboxShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.TOOLBOX,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
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
    };

    ShortcutRegistry.registry.register(focusToolboxShortcut);
  }

  /**
   * Keyboard shortcut to exit the current location and focus on the workspace
   * when in keyboard navigation mode.
   */
  protected registerExit() {
    const exitShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.EXIT,
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
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
    };

    ShortcutRegistry.registry.register(exitShortcut, true);
  }

  /**
   * Keyboard shortcut to move the cursor on the workspace to the left when in
   * keyboard navigation mode.
   */
  protected registerWorkspaceMoveLeft() {
    const wsMoveLeftShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_LEFT,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, -1, 0);
      },
      keyCodes: [createSerializedKey(KeyCodes.A, [KeyCodes.SHIFT])],
    };

    ShortcutRegistry.registry.register(wsMoveLeftShortcut);
  }

  /**
   * Keyboard shortcut to move the cursor on the workspace to the right when in
   * keyboard navigation mode.
   */
  protected registerWorkspaceMoveRight() {
    const wsMoveRightShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_RIGHT,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, 1, 0);
      },
      keyCodes: [createSerializedKey(KeyCodes.D, [KeyCodes.SHIFT])],
    };

    ShortcutRegistry.registry.register(wsMoveRightShortcut);
  }

  /**
   * Keyboard shortcut to move the cursor on the workspace up when in keyboard
   * navigation mode.
   */
  protected registerWorkspaceMoveUp() {
    const wsMoveUpShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_UP,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, 0, -1);
      },
      keyCodes: [createSerializedKey(KeyCodes.W, [KeyCodes.SHIFT])],
    };

    ShortcutRegistry.registry.register(wsMoveUpShortcut);
  }

  /**
   * Keyboard shortcut to move the cursor on the workspace down when in
   * keyboard navigation mode.
   */
  protected registerWorkspaceMoveDown() {
    const wsMoveDownShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.MOVE_WS_CURSOR_DOWN,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode && !workspace.options.readOnly
        );
      },
      callback: (workspace) => {
        return this.navigation.moveWSCursor(workspace, 0, 1);
      },
      keyCodes: [createSerializedKey(KeyCodes.S, [KeyCodes.SHIFT])],
    };

    ShortcutRegistry.registry.register(wsMoveDownShortcut);
  }

  /**
   * Keyboard shortcut to copy the block the cursor is currently on.
   */
  protected registerCopy() {
    const copyShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.COPY,
      preconditionFn: (workspace) => {
        if (
          workspace.keyboardAccessibilityMode &&
          !workspace.options.readOnly
        ) {
          const curNode = workspace.getCursor()?.getCurNode();
          if (curNode && curNode.getSourceBlock()) {
            const sourceBlock = curNode.getSourceBlock();
            return !!(
              !Blockly.Gesture.inProgress() &&
              sourceBlock &&
              sourceBlock.isDeletable() &&
              sourceBlock.isMovable()
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
    };

    ShortcutRegistry.registry.register(copyShortcut);
  }

  /**
   * Register shortcut to paste the copied block to the marked location.
   */
  protected registerPaste() {
    const pasteShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.PASTE,
      preconditionFn: (workspace) => {
        return (
          workspace.keyboardAccessibilityMode &&
          !workspace.options.readOnly &&
          !Blockly.Gesture.inProgress()
        );
      },
      callback: () => {
        if (!this.copyData || !this.copyWorkspace) return false;
        return this.navigation.paste(this.copyData, this.copyWorkspace);
      },
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
   * Keyboard shortcut to copy and delete the block the cursor is on using
   * ctrl+x, cmd+x, or alt+x.
   */
  protected registerCut() {
    const cutShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.CUT,
      preconditionFn: (workspace) => {
        if (
          workspace.keyboardAccessibilityMode &&
          !workspace.options.readOnly
        ) {
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
    };

    ShortcutRegistry.registry.register(cutShortcut);
  }

  /**
   * Registers shortcut to delete the block the cursor is on using delete or
   * backspace.
   */
  protected registerDelete() {
    const deleteShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.DELETE,
      preconditionFn: function (workspace) {
        if (
          workspace.keyboardAccessibilityMode &&
          !workspace.options.readOnly
        ) {
          const curNode = workspace.getCursor()?.getCurNode();
          if (curNode && curNode.getSourceBlock()) {
            const sourceBlock = curNode.getSourceBlock();
            return !!(sourceBlock && sourceBlock.isDeletable());
          }
        }
        return false;
      },
      callback: (workspace, e) => {
        const cursor = workspace.getCursor();
        if (!cursor) {
          return false;
        }
        const sourceBlock = cursor.getCurNode().getSourceBlock() as BlockSvg;
        // Delete or backspace.
        // Stop the browser from going back to the previous page.
        // Do this first to prevent an error in the delete code from resulting
        // in data loss.
        e.preventDefault();
        // Don't delete while dragging.  Jeez.
        if (Blockly.Gesture.inProgress()) {
          return false;
        }
        this.navigation.moveCursorOnBlockDelete(workspace, sourceBlock);
        sourceBlock.checkAndDelete();
        return true;
      },
      keyCodes: [KeyCodes.DELETE, KeyCodes.BACKSPACE],
      allowCollision: true,
    };

    ShortcutRegistry.registry.register(deleteShortcut);
  }

  /**
   * List all of the currently registered shortcuts.
   */
  listShortcuts() {
    this.announcer.listShortcuts();
  }

  /**
   * Register a keyboard shortcut to list all current shortcuts.
   */
  registerListShortcuts() {
    const listShortcuts: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'List shortcuts',
      preconditionFn: (workspace) => {
        return true;
      },
      callback: (workspace) => {
        this.announcer.listShortcuts();
        return true;
      },
      keyCodes: [KeyCodes.SLASH],
    };

    ShortcutRegistry.registry.register(listShortcuts);
  }

  /**
   * Register a keyboard shortcut to announce the current location
   * of the cursor.
   */
  registerAnnounce() {
    const announceShortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Announce',
      preconditionFn: (workspace) => {
        return true;
      },
      // Print out the type of the current node.
      callback: (workspace) => {
        const cursor = workspace.getCursor();
        if (!cursor) {
          return false;
        }
        this.announcer.setText(cursor.getCurNode().getType());
        return true;
      },
      keyCodes: [KeyCodes.A],
    };

    ShortcutRegistry.registry.register(announceShortcut);
  }

  /**
   * Register a shortcut to handle going to the next sibling of the
   * cursor's current location.
   */
  registerNextSibling() {
    const shortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Go to next sibling',
      preconditionFn: (workspace) => {
        return true;
      },
      // Jump to the next node at the same level, when in the workspace
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
    };

    ShortcutRegistry.registry.register(shortcut);
  }

  /**
   * Register a shortcut to handle going to the previous sibling of the
   * cursor's current location.
   */
  registerPreviousSibling() {
    const shortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Go to previous sibling',
      preconditionFn: (workspace) => {
        return true;
      },
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
    };

    ShortcutRegistry.registry.register(shortcut);
  }

  /**
   * Register a shortcut to jump to the root of the current stack.
   */
  registerJumpToRoot() {
    const jumpShortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Jump to root of current stack',
      preconditionFn: (workspace) => {
        return true;
      },
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
    };

    ShortcutRegistry.registry.register(jumpShortcut);
  }

  /**
   * Register a shortcut to move the cursor out of its current context,
   * such as a loop block.
   */
  registerContextOut() {
    const shortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Context out',
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
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
    };

    ShortcutRegistry.registry.register(shortcut);
  }

  /**
   * Register a shortcut to move the cursor in a level of context, such as into
   * a loop.
   */
  registerContextIn() {
    const shortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Context in',
      preconditionFn: (workspace) => {
        return workspace.keyboardAccessibilityMode;
      },
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
    };

    ShortcutRegistry.registry.register(shortcut);
  }

  /**
   * Register a shortcut to clean up the workspace.
   */
  registerCleanup() {
    const cleanupShortcut: Blockly.ShortcutRegistry.KeyboardShortcut = {
      name: 'Clean up workspace',
      preconditionFn: (workspace) => {
        return workspace.getTopBlocks(false).length > 0;
      },
      callback: (workspace) => {
        workspace.cleanUp();
        this.announcer.setText('clean up');
        return true;
      },
      keyCodes: [KeyCodes.C],
    };

    ShortcutRegistry.registry.register(cleanupShortcut);
  }

  /**
   * Registers all default keyboard shortcut items for keyboard navigation. This
   * should be called once per instance of KeyboardShortcutRegistry.
   */
  protected registerDefaults() {
    this.registerPrevious();
    this.registerNext();
    this.registerIn();
    this.registerOut();

    this.registerDisconnect();
    this.registerExit();
    this.registerInsert();
    this.registerMark();
    this.registerToolboxFocus();
    this.registerToggleKeyboardNav();

    this.registerWorkspaceMoveDown();
    this.registerWorkspaceMoveLeft();
    this.registerWorkspaceMoveUp();
    this.registerWorkspaceMoveRight();

    this.registerCopy();
    this.registerPaste();
    this.registerCut();
    this.registerDelete();

    this.registerAnnounce();
    this.registerPreviousSibling();
    this.registerNextSibling();
    this.registerJumpToRoot();
    this.registerListShortcuts();
    this.registerContextIn();
    this.registerContextOut();

    this.registerCleanup();
  }

  /**
   * Removes all the keyboard navigation shortcuts.
   */
  dispose() {
    const shortcutNames = Object.values(Constants.SHORTCUT_NAMES);
    for (const name of shortcutNames) {
      ShortcutRegistry.registry.unregister(name);
    }
    this.removeShortcutHandlers();
    this.navigation.dispose();
  }
}
