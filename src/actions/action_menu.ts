/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ASTNode,
  ContextMenu,
  ContextMenuRegistry,
  ShortcutRegistry,
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

/**
 * Keyboard shortcut to show the action menu on Cmr/Ctrl/Alt+Enter key.
 */
export class ActionMenu {
  /**
   * Registration name for the keyboard shortcut.
   */
  private shortcutName = Constants.SHORTCUT_NAMES.MENU;

  constructor(private navigation: Navigation) {}

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
      preconditionFn: (workspace) =>
        this.navigation.canCurrentlyNavigate(workspace),
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
   *
   * @param workspace The workspace.
   */
  private openActionMenu(workspace: WorkspaceSvg): boolean {
    let rtl: boolean;

    // TODO(#362): Pass this through the precondition and callback instead of making it up.
    const menuOpenEvent = new KeyboardEvent('keydown');

    const cursor = workspace.getCursor();
    if (!cursor) throw new Error('workspace has no cursor');
    const node = cursor.getCurNode();
    if (!node) return false;
    const nodeType = node.getType();
    switch (nodeType) {
      case ASTNode.types.BLOCK: {
        const block = node.getLocation() as BlockSvg;
        block.showContextMenu(menuOpenEvent);
        break;
      }

      // case Blockly.ASTNode.types.INPUT:
      case ASTNode.types.NEXT:
      case ASTNode.types.PREVIOUS:
      case ASTNode.types.INPUT: {
        const connection = node.getLocation() as RenderedConnection;
        rtl = connection.getSourceBlock().RTL;

        const menuOptions = ContextMenuRegistry.registry.getContextMenuOptions(
          {focusedNode: connection},
          menuOpenEvent,
        );
        // If no valid options, don't show a menu
        if (!menuOptions?.length) return true;
        const location = this.calculateLocationForConnectionMenu(connection);
        ContextMenu.show(menuOpenEvent, menuOptions, rtl, workspace, location);
        break;
      }

      case ASTNode.types.WORKSPACE: {
        const workspace = node.getLocation() as WorkspaceSvg;
        workspace.showContextMenu(menuOpenEvent);
        break;
      }

      default:
        console.info(`No action menu for ASTNode of type ${nodeType}`);
        return false;
    }

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
   * Find a context menu action, throwing an `Error` if it is not present or
   * not an action. This usefully narrows the type to `ActionRegistryItem`
   * which is not exported from Blockly.
   *
   * @param id The id of the action.
   * @returns the action.
   */
  private getContextMenuAction(id: string) {
    const item = ContextMenuRegistry.registry.getItem(id);
    if (!item) {
      throw new Error(`can't find context menu item ${id}`);
    }
    if (!item?.callback) {
      throw new Error(`context menu item unexpectedly not action ${id}`);
    }
    return item;
  }

  /**
   * Create a fake PointerEvent for opening the action menu on the specified
   * block.
   *
   * @param block The block to open the action menu for.
   * @returns screen coordinates of where to show a menu for a block
   */
  private calculateLocationOfBlock(block: BlockSvg): BlocklyUtils.Coordinate {
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

    const y =
      fieldBoundingClientRect && fieldBoundingClientRect.height
        ? fieldBoundingClientRect.y + fieldBoundingClientRect.height
        : blockCoords.y + block.height;

    return new BlocklyUtils.Coordinate(blockCoords.x + 5, y + 5);
  }

  /**
   * Create a fake PointerEvent for opening the action menu for the
   * given connection.
   *
   * For now this just puts the action menu in the same place as the
   * context menu for the source block.
   *
   * @param connection The node to open the action menu for.
   * @returns Screen coordinates of where to show menu for a connection node.
   */
  private calculateLocationForConnectionMenu(
    connection: RenderedConnection,
  ): BlocklyUtils.Coordinate {
    const block = connection.getSourceBlock() as BlockSvg;
    const workspace = block.workspace as WorkspaceSvg;

    if (typeof connection.x !== 'number') {
      // No coordinates for connection?  Fall back to the parent block.
      return this.calculateLocationOfBlock(block);
    }
    const connectionWSCoords = new BlocklyUtils.Coordinate(
      connection.x,
      connection.y,
    );
    const connectionScreenCoords = BlocklyUtils.svgMath.wsToScreenCoordinates(
      workspace,
      connectionWSCoords,
    );
    return connectionScreenCoords.translate(5, 5);
  }
}
