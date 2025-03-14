/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  Connection,
  ContextMenu,
  ContextMenuRegistry,
  ShortcutRegistry,
  comments,
  utils as BlocklyUtils,
  WidgetDiv,
} from 'blockly';
import * as Constants from '../constants';
import type {BlockSvg, RenderedConnection, WorkspaceSvg} from 'blockly';
import {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;
const createSerializedKey = ShortcutRegistry.registry.createSerializedKey.bind(
  ShortcutRegistry.registry,
);

export interface Scope {
  block?: BlockSvg;
  workspace?: WorkspaceSvg;
  comment?: comments.RenderedWorkspaceComment;
  connection?: Connection;
}

/**
 * Keyboard shortcut to show the action menu on Cmr/Ctrl/Alt+Enter key.
 */
export class ActionMenu {
  /**
   * Function provided by the navigation controller to say whether navigation
   * is allowed.
   */
  private canCurrentlyNavigate: (ws: WorkspaceSvg) => boolean;

  /**
   * Registration name for the keyboard shortcut.
   */
  private shortcutName = Constants.SHORTCUT_NAMES.MENU;

  constructor(
    private navigation: Navigation,
    canNavigate: (ws: WorkspaceSvg) => boolean,
  ) {
    this.canCurrentlyNavigate = canNavigate;
  }

  /**
   * Install this action.
   */
  install() {
    this.registerShortcut();
  }

  /**
   * Uninstall this action.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(this.shortcutName);
  }

  /**
   * Create and register the keyboard shortcut for this action.
   */
  private registerShortcut() {
    const menuShortcut: ShortcutRegistry.KeyboardShortcut = {
      name: Constants.SHORTCUT_NAMES.MENU,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.WORKSPACE:
            return this.openActionMenu(workspace);
          default:
            return false;
        }
      },
      keyCodes: [
        createSerializedKey(KeyCodes.ENTER, [KeyCodes.CTRL]),
        createSerializedKey(KeyCodes.ENTER, [KeyCodes.ALT]),
        createSerializedKey(KeyCodes.ENTER, [KeyCodes.META]),
      ],
    };
    ShortcutRegistry.registry.register(menuShortcut);
  }

  /**
   * Show the action menu for the current node.
   *
   * The action menu will contain entries for relevant actions for the
   * node's location.  If the location is a block, this will include
   * the contents of the block's context menu (if any).
   *
   * Returns true if it is possible to open the action menu in the
   * current location, even if the menu was not opened due there being
   * no applicable menu items.
   */
  private openActionMenu(workspace: WorkspaceSvg): boolean {
    let menuOptions: Array<
      | ContextMenuRegistry.ContextMenuOption
      | ContextMenuRegistry.LegacyContextMenuOption
    > = [];
    let rtl: boolean;

    const cursor = workspace.getCursor();
    if (!cursor) throw new Error('workspace has no cursor');
    const node = cursor.getCurNode();
    const nodeType = node.getType();
    switch (nodeType) {
      case ASTNode.types.BLOCK:
        const block = node.getLocation() as BlockSvg;
        rtl = block.RTL;
        // Reimplement BlockSvg.prototype.generateContextMenu as that
        // method is protected.
        if (!workspace.options.readOnly && block.contextMenu) {
          menuOptions = ContextMenuRegistry.registry.getContextMenuOptions(
            ContextMenuRegistry.ScopeType.BLOCK,
            {block},
          );

          // Allow the block to add or modify menuOptions.
          block.customContextMenu?.(menuOptions);
        }
        // End reimplement.
        break;

      // case Blockly.ASTNode.types.INPUT:
      case ASTNode.types.NEXT:
      case ASTNode.types.PREVIOUS:
      case ASTNode.types.INPUT:
        const connection = node.getLocation() as Connection;
        rtl = connection.getSourceBlock().RTL;

        // Slightly hacky: get insert action from registry.  Hacky
        // because registry typings don't include {connection: ...} as
        // a possible kind of scope.
        this.addConnectionItems(connection, menuOptions);
        break;

      default:
        console.info(`No action menu for ASTNode of type ${nodeType}`);
        return false;
    }

    if (!menuOptions?.length) return true;
    const fakeEvent = this.fakeEventForNode(node);
    ContextMenu.show(fakeEvent, menuOptions, rtl, workspace);
    setTimeout(() => {
      WidgetDiv.getDiv()
        ?.querySelector('.blocklyMenu')
        ?.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            code: 'ArrowDown',
            keyCode: KeyCodes.DOWN,
            which: KeyCodes.DOWN,
            bubbles: true,
            cancelable: true,
          }),
        );
    }, 10);
    return true;
  }

  /**
   * Add menu items for a context menu on a connection scope.
   *
   * @param connection The connection on which the menu is shown.
   * @param menuOptions The list of options, which may be modified by this method.
   */
  private addConnectionItems(
    connection: Connection,
    menuOptions: (
      | ContextMenuRegistry.ContextMenuOption
      | ContextMenuRegistry.LegacyContextMenuOption
    )[],
  ) {
    const insertAction = ContextMenuRegistry.registry.getItem('insert');
    if (!insertAction) throw new Error("can't find insert action");

    const pasteAction = ContextMenuRegistry.registry.getItem(
      'blockPasteFromContextMenu',
    );
    if (!pasteAction) throw new Error("can't find paste action");
    const possibleOptions = [insertAction, pasteAction /* etc.*/];

    // Check preconditions and get menu texts.
    const scope = {
      connection,
    } as unknown as ContextMenuRegistry.Scope;
    for (const option of possibleOptions) {
      const precondition = option.preconditionFn(scope);
      if (precondition === 'hidden') continue;
      const displayText =
        typeof option.displayText === 'function'
          ? option.displayText(scope)
          : option.displayText;
      menuOptions.push({
        text: displayText,
        enabled: precondition === 'enabled',
        callback: option.callback,
        scope,
        weight: option.weight,
      });
    }
    return menuOptions;
  }

  /**
   * Create a fake PointerEvent for opening the action menu for the
   * given ASTNode.
   *
   * @param node The node to open the action menu for.
   * @returns A synthetic pointerdown PointerEvent.
   */
  private fakeEventForNode(node: ASTNode): PointerEvent {
    switch (node.getType()) {
      case ASTNode.types.BLOCK:
        return this.fakeEventForBlock(node.getLocation() as BlockSvg);
      case ASTNode.types.NEXT:
      case ASTNode.types.PREVIOUS:
      case ASTNode.types.INPUT:
        return this.fakeEventForConnectionNode(
          node.getLocation() as RenderedConnection,
        );
      default:
        throw new TypeError('unhandled node type');
    }
  }

  /**
   * Create a fake PointerEvent for opening the action menu on the specified
   * block.
   *
   * @param block The block to open the action menu for.
   * @returns A synthetic pointerdown PointerEvent.
   */
  private fakeEventForBlock(block: BlockSvg) {
    // Get the location of the top-left corner of the block in
    // screen coordinates.
    const blockCoords = BlocklyUtils.svgMath.wsToScreenCoordinates(
      block.workspace,
      block.getRelativeToSurfaceXY(),
    );

    // Prefer a y position below the first field in the block.
    const fieldBoundingClientRect = block.inputList
      .filter((input) => input.isVisible())
      .flatMap((input) => input.fieldRow)
      .filter((f) => f.isVisible())[0]
      ?.getSvgRoot()
      ?.getBoundingClientRect();

    const clientY =
      fieldBoundingClientRect && fieldBoundingClientRect.height
        ? fieldBoundingClientRect.y + fieldBoundingClientRect.height
        : blockCoords.y + block.height;

    // Create a fake event for the action menu code to work from.
    return new PointerEvent('pointerdown', {
      clientX: blockCoords.x + 5,
      clientY: clientY + 5,
    });
  }

  /**
   * Create a fake PointerEvent for opening the action menu for the
   * given connection.
   *
   * For now this just puts the action menu in the same place as the
   * context menu for the source block.
   *
   * @param connection The node to open the action menu for.
   * @returns A synthetic pointerdown PointerEvent.
   */
  private fakeEventForConnectionNode(
    connection: RenderedConnection,
  ): PointerEvent {
    const block = connection.getSourceBlock() as BlockSvg;
    const workspace = block.workspace as WorkspaceSvg;

    if (typeof connection.x !== 'number') {
      // No coordinates for connection?  Fall back to the parent block.
      return this.fakeEventForBlock(block);
    }
    const connectionWSCoords = new BlocklyUtils.Coordinate(
      connection.x,
      connection.y,
    );
    const connectionScreenCoords = BlocklyUtils.svgMath.wsToScreenCoordinates(
      workspace,
      connectionWSCoords,
    );
    return new PointerEvent('pointerdown', {
      clientX: connectionScreenCoords.x + 5,
      clientY: connectionScreenCoords.y + 5,
    });
  }
}
