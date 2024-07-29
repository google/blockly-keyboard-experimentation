/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Holds all methods necessary to use Blockly through the
 * keyboard.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

import * as Blockly from 'blockly/core';
import * as Constants from './constants';
import {
  registrationName as cursorRegistrationName,
  registrationType as cursorRegistrationType,
  FlyoutCursor,
} from './flyout_cursor';

/**
 * Class that holds all methods necessary for keyboard navigation to work.
 */
export class Navigation {
  /**
   * Object holding the location of the cursor for each workspace.
   * Possible locations of the cursor are: workspace, flyout or toolbox.
   */
  workspaceStates: {[index: string]: Constants.STATE} = {};

  /**
   * The distance to move the cursor when the cursor is on the workspace.
   */
  WS_MOVE_DISTANCE = 40;

  /**
   * The name of the marker to use for keyboard navigation.
   */
  MARKER_NAME = 'local_marker_1';

  /**
   * The default coordinate to use when focusing on the workspace and no
   * blocks are present. In pixel coordinates, but will be converted to
   * workspace coordinates when used to position the cursor.
   */
  DEFAULT_WS_COORDINATE: Blockly.utils.Coordinate =
    new Blockly.utils.Coordinate(100, 100);

  /**
   * The default coordinate to use when moving the cursor to the workspace
   * after a block has been deleted. In pixel coordinates, but will be
   * converted to workspace coordinates when used to position the cursor.
   */
  WS_COORDINATE_ON_DELETE: Blockly.utils.Coordinate =
    new Blockly.utils.Coordinate(100, 100);

  /**
   * Wrapper for method that deals with workspace changes.
   * Used for removing change listener.
   */
  protected wsChangeWrapper: (e: Blockly.Events.Abstract) => void;

  /**
   * Wrapper for method that deals with flyout changes.
   * Used for removing change listener.
   */
  protected flyoutChangeWrapper: (e: Blockly.Events.Abstract) => void;

  /**
   * The list of registered workspaces.
   * Used when removing change listeners in dispose.
   */
  protected workspaces: Blockly.WorkspaceSvg[] = [];

  /**
   * Constructor for keyboard navigation.
   */
  constructor() {
    this.wsChangeWrapper = this.workspaceChangeListener.bind(this);
    this.flyoutChangeWrapper = this.flyoutChangeListener.bind(this);
  }

  /**
   * Adds all necessary change listeners and markers to a workspace for keyboard
   * navigation to work. This must be called for keyboard navigation to work
   * on a workspace.
   *
   * @param workspace The workspace to add keyboard navigation to.
   */
  addWorkspace(workspace: Blockly.WorkspaceSvg) {
    this.workspaces.push(workspace);
    const flyout = workspace.getFlyout();
    workspace
      .getMarkerManager()
      .registerMarker(this.MARKER_NAME, new Blockly.Marker());
    workspace.addChangeListener(this.wsChangeWrapper);

    if (flyout) {
      this.addFlyout(flyout);
    }
  }

  /**
   * Removes all keyboard navigation change listeners and markers.
   *
   * @param workspace The workspace to remove keyboard navigation from.
   */
  removeWorkspace(workspace: Blockly.WorkspaceSvg) {
    const workspaceIdx = this.workspaces.indexOf(workspace);
    const flyout = workspace.getFlyout();

    if (workspace.getCursor()) {
      this.disableKeyboardAccessibility(workspace);
    }

    if (workspaceIdx > -1) {
      this.workspaces.splice(workspaceIdx, 1);
    }
    if (workspace.getMarkerManager()) {
      workspace.getMarkerManager().unregisterMarker(this.MARKER_NAME);
    }
    workspace.removeChangeListener(this.wsChangeWrapper);

    if (flyout) {
      this.removeFlyout(flyout);
    }
  }

  /**
   * Sets the state for the given workspace.
   *
   * @param workspace The workspace to set the state on.
   * @param state The navigation state.
   */
  setState(workspace: Blockly.WorkspaceSvg, state: Constants.STATE) {
    this.workspaceStates[workspace.id] = state;
  }

  /**
   * Gets the navigation state of the current workspace.
   *
   * @param workspace The workspace to get the state of.
   * @returns The state of the given workspace.
   */
  getState(workspace: Blockly.WorkspaceSvg): Constants.STATE {
    return this.workspaceStates[workspace.id];
  }

  /**
   * Gets the marker created for keyboard navigation.
   *
   * @param workspace The workspace to get the marker from.
   * @returns The marker created for keyboard navigation.
   */
  getMarker(workspace: Blockly.WorkspaceSvg): Blockly.Marker | null {
    return workspace.getMarker(this.MARKER_NAME);
  }

  /**
   * Adds all event listeners and cursors to the flyout that are needed for
   * keyboard navigation to work.
   *
   * @param flyout The flyout to add a cursor and change listeners to.
   */
  addFlyout(flyout: Blockly.IFlyout) {
    const flyoutWorkspace = flyout.getWorkspace();
    flyoutWorkspace.addChangeListener(this.flyoutChangeWrapper);
    const FlyoutCursorClass = Blockly.registry.getClass(
      cursorRegistrationType,
      cursorRegistrationName,
    );
    if (FlyoutCursorClass) {
      flyoutWorkspace.getMarkerManager().setCursor(new FlyoutCursorClass());
    }
  }

  /**
   * Removes all change listeners from the flyout that are needed for
   * keyboard navigation to work.
   *
   * @param flyout The flyout to add a cursor and event listeners to.
   */
  removeFlyout(flyout: Blockly.IFlyout) {
    const flyoutWorkspace = flyout.getWorkspace();
    flyoutWorkspace.removeChangeListener(this.flyoutChangeWrapper);
  }

  /**
   * Updates the state of keyboard navigation and the position of the cursor
   * based on workspace events.
   *
   * @param e The Blockly event to process.
   */
  workspaceChangeListener(e: Blockly.Events.Abstract) {
    if (!e.workspaceId) {
      return;
    }
    const workspace = Blockly.Workspace.getById(
      e.workspaceId,
    ) as Blockly.WorkspaceSvg;
    if (!workspace || !workspace.keyboardAccessibilityMode) {
      return;
    }
    switch (e.type) {
      case Blockly.Events.DELETE:
        this.handleBlockDeleteByDrag(
          workspace,
          e as Blockly.Events.BlockDelete,
        );
        break;
      case Blockly.Events.BLOCK_CHANGE:
        if ((e as Blockly.Events.BlockChange).element === 'mutation') {
          this.handleBlockMutation(workspace, e as Blockly.Events.BlockChange);
        }
        break;
      case Blockly.Events.CLICK:
        this.handleWorkspaceClick(workspace, e as Blockly.Events.Click);
        break;
      case Blockly.Events.TOOLBOX_ITEM_SELECT:
        this.handleToolboxCategoryClick(
          workspace,
          e as Blockly.Events.ToolboxItemSelect,
        );
        break;
      case Blockly.Events.BLOCK_CREATE:
        this.handleBlockCreate(workspace, e);
    }
  }

  /**
   * Updates the state of keyboard navigation and the position of the cursor
   * based on events emitted from the flyout's workspace.
   *
   * @param e The Blockly event to process.
   */
  flyoutChangeListener(e: Blockly.Events.Abstract) {
    if (!e.workspaceId) {
      return;
    }
    const flyoutWorkspace = Blockly.Workspace.getById(
      e.workspaceId,
    ) as Blockly.WorkspaceSvg;
    const mainWorkspace = flyoutWorkspace.targetWorkspace;
    if (!mainWorkspace) {
      return;
    }
    const flyout = mainWorkspace.getFlyout();
    if (!flyout) {
      return;
    }

    // This is called for simple toolboxes and for toolboxes that have a flyout
    // that does not close. Autoclosing flyouts close before we need to focus
    // the cursor on the block that was clicked.
    if (
      mainWorkspace &&
      mainWorkspace.keyboardAccessibilityMode &&
      !flyout.autoClose
    ) {
      if (
        e.type === Blockly.Events.CLICK &&
        (e as Blockly.Events.Click).targetType === 'block'
      ) {
        const block = flyoutWorkspace.getBlockById(
          (e as Blockly.Events.Click).blockId!,
        );
        this.handleBlockClickInFlyout(mainWorkspace, block!);
      } else if (e.type === Blockly.Events.SELECTED) {
        const block = flyoutWorkspace.getBlockById(
          (e as Blockly.Events.Selected).newElementId!,
        );
        this.handleBlockClickInFlyout(mainWorkspace, block!);
      }
    }
  }

  /**
   * Moves the cursor to the workspace if a block has been dragged from a simple
   * toolbox. For a category toolbox this is handled in
   * handleToolboxCategoryClick_.
   *
   * @param workspace The workspace the cursor belongs to.
   * @param e The Blockly event to process.
   */
  handleBlockCreate(
    workspace: Blockly.WorkspaceSvg,
    e: Blockly.Events.Abstract,
  ) {
    if (this.getState(workspace) === Constants.STATE.FLYOUT) {
      this.resetFlyout(workspace, !!workspace.getToolbox());
      this.setState(workspace, Constants.STATE.WORKSPACE);
    }
  }

  /**
   * Moves the cursor to the block level when the block the cursor is on
   * mutates.
   *
   * @param workspace The workspace the cursor belongs
   *     to.
   * @param e The Blockly event to process.
   */
  handleBlockMutation(
    workspace: Blockly.WorkspaceSvg,
    e: Blockly.Events.BlockChange,
  ) {
    const mutatedBlockId = e.blockId;
    const cursor = workspace.getCursor();
    if (cursor) {
      const curNode = cursor.getCurNode();
      const block = curNode ? curNode.getSourceBlock() : null;
      if (block && block.id === mutatedBlockId) {
        cursor.setCurNode(Blockly.ASTNode.createBlockNode(block)!);
      }
    }
  }

  /**
   * Moves the cursor to the workspace when a user clicks on the workspace.
   *
   * @param workspace The workspace the cursor belongs to.
   * @param e The Blockly event to process.
   */
  handleWorkspaceClick(
    workspace: Blockly.WorkspaceSvg,
    e: Blockly.Events.Click,
  ) {
    const workspaceState = this.getState(workspace);
    if (workspaceState !== Constants.STATE.WORKSPACE) {
      this.resetFlyout(workspace, !!workspace.getToolbox());
      this.setState(workspace, Constants.STATE.WORKSPACE);
    }
  }

  /**
   * Moves the cursor to the toolbox when a user clicks on a toolbox category.
   * Moves the cursor to the workspace if theh user closes the toolbox category.
   *
   * @param workspace The workspace the toolbox is on.
   * @param e The event emitted from the workspace.
   */
  handleToolboxCategoryClick(
    workspace: Blockly.WorkspaceSvg,
    e: Blockly.Events.ToolboxItemSelect,
  ) {
    const workspaceState = this.getState(workspace);
    if (e.newItem && workspaceState !== Constants.STATE.TOOLBOX) {
      // If the toolbox category was just clicked, focus on the toolbox.
      this.focusToolbox(workspace);
    } else if (!e.newItem) {
      // If the toolbox was closed, focus on the workspace.
      this.resetFlyout(workspace, !!workspace.getToolbox());
      this.setState(workspace, Constants.STATE.WORKSPACE);
    }
  }

  /**
   * Moves the cursor to the workspace when its parent block is deleted by
   * being dragged to the flyout or to the trashcan.
   *
   * @param workspace The workspace the block was on.
   * @param e The event emitted when a block is deleted.
   */
  handleBlockDeleteByDrag(
    workspace: Blockly.WorkspaceSvg,
    e: Blockly.Events.BlockDelete,
  ) {
    const deletedBlockId = e.blockId;
    const ids = e.ids ?? [];
    const cursor = workspace.getCursor();

    // Make sure the cursor is on a block.
    if (
      !cursor ||
      !cursor.getCurNode() ||
      !cursor.getCurNode().getSourceBlock()
    ) {
      return;
    }

    const curNode = cursor.getCurNode();
    const sourceBlock = curNode.getSourceBlock()!;
    if (sourceBlock.id === deletedBlockId || ids.indexOf(sourceBlock.id) > -1) {
      cursor.setCurNode(
        Blockly.ASTNode.createWorkspaceNode(
          workspace,
          this.WS_COORDINATE_ON_DELETE,
        )!,
      );
    }
  }

  /**
   * Handles when a user clicks on a block in the flyout by moving the cursor
   * to that stack of blocks and setting the state of navigation to the flyout.
   *
   * @param mainWorkspace The workspace the user clicked on.
   * @param block The block the user clicked on.
   */
  handleBlockClickInFlyout(
    mainWorkspace: Blockly.WorkspaceSvg,
    block: Blockly.BlockSvg,
  ) {
    if (!block) {
      return;
    }
    if (block.isShadow()) {
      block = block.getParent()!;
    }
    this.getFlyoutCursor(mainWorkspace)!.setCurNode(
      Blockly.ASTNode.createStackNode(block)!,
    );
    this.setState(mainWorkspace, Constants.STATE.FLYOUT);
  }

  /**
   * Moves the cursor to the appropriate location before a block is deleted.
   * This is used when the user deletes a block using the delete or backspace
   * key.
   *
   * @param workspace The workspace the block is being deleted on.
   * @param deletedBlock The block that is being deleted.
   */
  moveCursorOnBlockDelete(
    workspace: Blockly.WorkspaceSvg,
    deletedBlock: Blockly.BlockSvg,
  ) {
    const cursor = workspace.getCursor();
    if (!cursor) {
      return;
    }
    const curNode = cursor.getCurNode();
    const block = curNode ? curNode.getSourceBlock() : null;

    if (block === deletedBlock) {
      // If the block has a parent move the cursor to their connection point.
      if (block.getParent()) {
        const topConnection =
          block.previousConnection || block.outputConnection;
        if (topConnection?.targetConnection) {
          cursor.setCurNode(
            Blockly.ASTNode.createConnectionNode(
              topConnection.targetConnection,
            )!,
          );
        }
      } else {
        // If the block is by itself move the cursor to the workspace.
        cursor.setCurNode(
          Blockly.ASTNode.createWorkspaceNode(
            block.workspace,
            block.getRelativeToSurfaceXY(),
          )!,
        );
      }
      // If the cursor is on a block whose parent is being deleted, move the
      // cursor to the workspace.
    } else if (
      block &&
      deletedBlock.getChildren(false).indexOf(block as Blockly.BlockSvg) > -1
    ) {
      cursor.setCurNode(
        Blockly.ASTNode.createWorkspaceNode(
          block.workspace,
          block.getRelativeToSurfaceXY(),
        )!,
      );
    }
  }

  /**
   * Sets the navigation state to toolbox and selects the first category in the
   * toolbox. No-op if a toolbox does not exist on the given workspace.
   *
   * @param workspace The workspace to get the toolbox on.
   */
  focusToolbox(workspace: Blockly.WorkspaceSvg) {
    const toolbox = workspace.getToolbox();
    if (!toolbox) {
      return;
    }

    this.setState(workspace, Constants.STATE.TOOLBOX);
    this.resetFlyout(workspace, false /* shouldHide */);

    if (!this.getMarker(workspace)!.getCurNode()) {
      this.markAtCursor(workspace);
    }

    if (!toolbox.getSelectedItem()) {
      // Find the first item that is selectable.
      const toolboxItems = (toolbox as any).getToolboxItems();
      for (let i = 0, toolboxItem; (toolboxItem = toolboxItems[i]); i++) {
        if (toolboxItem.isSelectable()) {
          toolbox.selectItemByPosition(i);
          break;
        }
      }
    }
  }

  /**
   * Sets the navigation state to flyout and moves the cursor to the first
   * block or button in the flyout.
   *
   * @param workspace The workspace the flyout is on.
   */
  focusFlyout(workspace: Blockly.WorkspaceSvg) {
    const flyout = workspace.getFlyout();

    this.setState(workspace, Constants.STATE.FLYOUT);

    if (!this.getMarker(workspace)!.getCurNode()) {
      this.markAtCursor(workspace);
    }

    if (flyout && flyout.getWorkspace()) {
      const flyoutContents = flyout.getContents();
      const firstFlyoutItem = flyoutContents[0];
      if (!firstFlyoutItem) return;
      if (firstFlyoutItem.button) {
        const astNode = Blockly.ASTNode.createButtonNode(
          firstFlyoutItem.button,
        );
        this.getFlyoutCursor(workspace)!.setCurNode(astNode!);
      } else if (firstFlyoutItem.block) {
        const astNode = Blockly.ASTNode.createStackNode(firstFlyoutItem.block);
        this.getFlyoutCursor(workspace)!.setCurNode(astNode!);
      }
    }
  }

  /**
   * Sets the navigation state to workspace and moves the cursor to either the
   * top block on a workspace or to the workspace.
   *
   * @param workspace The workspace to focus on.
   */
  focusWorkspace(workspace: Blockly.WorkspaceSvg) {
    workspace.hideChaff();
    const reset = !!workspace.getToolbox();

    this.resetFlyout(workspace, reset);
    this.setState(workspace, Constants.STATE.WORKSPACE);
    this.setCursorOnWorkspaceFocus(workspace);
  }

  /**
   * Moves the cursor to the top connection point on on the first top block.
   * If the workspace is empty, moves the cursor to the default location on
   * the workspace.
   *
   * @param workspace The main Blockly workspace.
   */
  setCursorOnWorkspaceFocus(workspace: Blockly.WorkspaceSvg) {
    const topBlocks = workspace.getTopBlocks(true);
    const cursor = workspace.getCursor();
    if (!cursor) {
      return;
    }
    const wsCoordinates = new Blockly.utils.Coordinate(
      this.DEFAULT_WS_COORDINATE.x / workspace.scale,
      this.DEFAULT_WS_COORDINATE.y / workspace.scale,
    );
    if (topBlocks.length > 0) {
      cursor.setCurNode(Blockly.ASTNode.createTopNode(topBlocks[0])!);
    } else {
      const wsNode = Blockly.ASTNode.createWorkspaceNode(
        workspace,
        wsCoordinates,
      );
      cursor.setCurNode(wsNode!);
    }
  }

  /**
   * Gets the cursor on the flyout's workspace.
   *
   * @param workspace The main workspace the flyout is on.
   * @returns The flyout's cursor or null if no flyout exists.
   */
  getFlyoutCursor(workspace: Blockly.WorkspaceSvg): FlyoutCursor | null {
    const flyout = workspace.getFlyout();
    const cursor = flyout ? flyout.getWorkspace().getCursor() : null;

    return cursor as FlyoutCursor;
  }

  /**
   * Inserts a block from the flyout.
   * Tries to find a connection on the block to connect to the marked
   * location. If no connection has been marked, or there is not a compatible
   * connection then the block is placed on the workspace.
   *
   * @param workspace The main workspace. The workspace
   *     the block will be placed on.
   */
  insertFromFlyout(workspace: Blockly.WorkspaceSvg) {
    const newBlock = this.createNewBlock(workspace);
    if (!newBlock) {
      return;
    }
    const markerNode = this.getMarker(workspace)!.getCurNode();
    if (
      !this.tryToConnectMarkerAndCursor(
        workspace,
        markerNode,
        Blockly.ASTNode.createBlockNode(newBlock)!,
      )
    ) {
      this.warn(
        'Something went wrong while inserting a block from the flyout.',
      );
    }

    this.focusWorkspace(workspace);
    workspace.getCursor()!.setCurNode(Blockly.ASTNode.createTopNode(newBlock)!);
    this.removeMark(workspace);
  }

  /**
   * Creates a new block based on the current block the flyout cursor is on.
   *
   * @param workspace The main workspace. The workspace
   *     the block will be placed on.
   * @returns The newly created block.
   */
  createNewBlock(workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const flyout = workspace.getFlyout();
    if (!flyout || !flyout.isVisible()) {
      this.warn(
        'Trying to insert from the flyout when the flyout does not ' +
          ' exist or is not visible',
      );
      return null;
    }

    const curBlock = this.getFlyoutCursor(workspace)!
      .getCurNode()
      .getLocation() as Blockly.BlockSvg;
    if (!curBlock.isEnabled()) {
      this.warn("Can't insert a disabled block.");
      return null;
    }

    const newBlock = flyout.createBlock(curBlock);
    // Render to get the sizing right.
    newBlock.render();
    // Connections are not tracked when the block is first created.  Normally
    // there's enough time for them to become tracked in the user's mouse
    // movements, but not here.
    newBlock.setConnectionTracking(true);
    return newBlock;
  }

  /**
   * Hides the flyout cursor and optionally hides the flyout.
   *
   * @param workspace The workspace.
   * @param shouldHide True if the flyout should be hidden.
   */
  resetFlyout(workspace: Blockly.WorkspaceSvg, shouldHide: boolean) {
    if (this.getFlyoutCursor(workspace)) {
      this.getFlyoutCursor(workspace)!.hide();
      if (shouldHide) {
        workspace.getFlyout()!.hide();
      }
    }
  }

  /**
   * Connects the location of the marker and the location of the cursor.
   * No-op if the marker or cursor node are null.
   *
   * @param workspace The main workspace.
   * @returns True if the cursor and marker locations were connected,
   *     false otherwise.
   */
  connectMarkerAndCursor(workspace: Blockly.WorkspaceSvg): boolean {
    const markerNode = this.getMarker(workspace)!.getCurNode();
    const cursorNode = workspace.getCursor()!.getCurNode();

    if (markerNode && cursorNode) {
      return this.tryToConnectMarkerAndCursor(
        workspace,
        markerNode,
        cursorNode,
      );
    }
    return false;
  }

  /**
   * Tries to connect the given marker and cursor node.
   *
   * @param workspace The main workspace.
   * @param markerNode The node to try to connect to.
   * @param cursorNode The node to connect to the markerNode.
   * @returns True if the key was handled; false if something went
   *     wrong.
   */
  tryToConnectMarkerAndCursor(
    workspace: Blockly.WorkspaceSvg,
    markerNode: Blockly.ASTNode,
    cursorNode: Blockly.ASTNode,
  ): boolean {
    if (!this.logConnectionWarning(markerNode, cursorNode)) {
      return false;
    }

    const markerType = markerNode.getType();
    const cursorType = cursorNode.getType();

    const cursorLoc = cursorNode.getLocation();
    const markerLoc = markerNode.getLocation();
    if (markerNode.isConnection() && cursorNode.isConnection()) {
      const cursorConnection = cursorLoc as Blockly.RenderedConnection;
      const markerConnection = markerLoc as Blockly.RenderedConnection;
      return this.connect(cursorConnection, markerConnection);
    } else if (
      markerNode.isConnection() &&
      (cursorType == Blockly.ASTNode.types.BLOCK ||
        cursorType == Blockly.ASTNode.types.STACK)
    ) {
      const cursorBlock = cursorLoc as Blockly.BlockSvg;
      const markerConnection = markerLoc as Blockly.RenderedConnection;
      return this.insertBlock(cursorBlock, markerConnection);
    } else if (markerType == Blockly.ASTNode.types.WORKSPACE) {
      const block = cursorNode
        ? (cursorNode.getSourceBlock() as Blockly.BlockSvg)
        : null;
      return this.moveBlockToWorkspace(block, markerNode);
    }
    this.warn('Unexpected state in tryToConnectMarkerAndCursor.');
    return false;
  }

  /**
   * Warns the user if the given cursor or marker node can not be connected.
   *
   * @param markerNode The node to try to connect to.
   * @param cursorNode The node to connect to the markerNode.
   * @returns True if the marker and cursor are valid types, false
   *     otherwise.
   */
  logConnectionWarning(
    markerNode: Blockly.ASTNode,
    cursorNode: Blockly.ASTNode,
  ): boolean {
    if (!markerNode) {
      this.warn('Cannot insert with no marked node.');
      return false;
    }

    if (!cursorNode) {
      this.warn('Cannot insert with no cursor node.');
      return false;
    }
    const markerType = markerNode.getType();
    const cursorType = cursorNode.getType();

    // Check the marker for invalid types.
    if (markerType == Blockly.ASTNode.types.FIELD) {
      this.warn('Should not have been able to mark a field.');
      return false;
    } else if (markerType == Blockly.ASTNode.types.BLOCK) {
      this.warn('Should not have been able to mark a block.');
      return false;
    } else if (markerType == Blockly.ASTNode.types.STACK) {
      this.warn('Should not have been able to mark a stack.');
      return false;
    }

    // Check the cursor for invalid types.
    if (cursorType == Blockly.ASTNode.types.FIELD) {
      this.warn('Cannot attach a field to anything else.');
      return false;
    } else if (cursorType == Blockly.ASTNode.types.WORKSPACE) {
      this.warn('Cannot attach a workspace to anything else.');
      return false;
    }
    return true;
  }

  /**
   * Disconnects the block from its parent and moves it to the position of the
   * workspace node.
   *
   * @param block The block to be moved to the workspace.
   * @param wsNode The workspace node holding the position
   *     the block will be moved to.
   * @returns True if the block can be moved to the workspace,
   *     false otherwise.
   */
  moveBlockToWorkspace(
    block: Blockly.BlockSvg | null,
    wsNode: Blockly.ASTNode,
  ): boolean {
    if (!block) {
      return false;
    }
    if (block.isShadow()) {
      this.warn('Cannot move a shadow block to the workspace.');
      return false;
    }
    if (block.getParent()) {
      block.unplug(false);
    }
    block.moveTo(wsNode.getWsCoordinate());
    return true;
  }

  /**
   * Disconnects the child block from its parent block. No-op if the two given
   * connections are unrelated.
   *
   * @param movingConnection The connection that is being moved.
   * @param destConnection The connection to be moved to.
   */
  disconnectChild(
    movingConnection: Blockly.RenderedConnection,
    destConnection: Blockly.RenderedConnection,
  ) {
    const movingBlock = movingConnection.getSourceBlock();
    const destBlock = destConnection.getSourceBlock();
    let inferiorConnection;

    if (movingBlock.getRootBlock() === destBlock.getRootBlock()) {
      if (movingBlock.getDescendants(false).indexOf(destBlock) > -1) {
        inferiorConnection = this.getInferiorConnection(destConnection);
        if (inferiorConnection) {
          inferiorConnection.disconnect();
        }
      } else {
        inferiorConnection = this.getInferiorConnection(movingConnection);
        if (inferiorConnection) {
          inferiorConnection.disconnect();
        }
      }
    }
  }

  /**
   * Tries to connect the  given connections.
   *
   * If the given connections are not compatible try finding compatible
   * connections on the source blocks of the given connections.
   *
   * @param movingConnection The connection that is being moved.
   * @param destConnection The connection to be moved to.
   * @returns True if the two connections or their target connections
   *     were connected, false otherwise.
   */
  connect(
    movingConnection: Blockly.RenderedConnection | null,
    destConnection: Blockly.RenderedConnection | null,
  ): boolean {
    if (!movingConnection || !destConnection) {
      return false;
    }

    const movingInferior = this.getInferiorConnection(movingConnection);
    const destSuperior = this.getSuperiorConnection(destConnection);

    const movingSuperior = this.getSuperiorConnection(movingConnection);
    const destInferior = this.getInferiorConnection(destConnection);

    if (
      movingInferior &&
      destSuperior &&
      this.moveAndConnect(movingInferior, destSuperior)
    ) {
      return true;
      // Try swapping the inferior and superior connections on the blocks.
    } else if (
      movingSuperior &&
      destInferior &&
      this.moveAndConnect(movingSuperior, destInferior)
    ) {
      return true;
    } else if (this.moveAndConnect(movingConnection, destConnection)) {
      return true;
    } else {
      const checker = movingConnection.getConnectionChecker();
      const reason = checker.canConnectWithReason(
        movingConnection,
        destConnection,
        false,
      );
      this.warn(
        'Connection failed with error: ' +
          checker.getErrorMessage(reason, movingConnection, destConnection),
      );
      return false;
    }
  }

  /**
   * Finds the inferior connection on the source block if the given connection
   * is superior.
   *
   * @param connection The connection trying to be connected.
   * @returns The inferior connection or null if none exists.
   */
  getInferiorConnection(
    connection: Blockly.RenderedConnection | null,
  ): Blockly.RenderedConnection | null {
    if (!connection) {
      return null;
    }
    const block = connection.getSourceBlock() as Blockly.BlockSvg;
    if (!connection.isSuperior()) {
      return connection;
    } else if (block.previousConnection) {
      return block.previousConnection;
    } else if (block.outputConnection) {
      return block.outputConnection;
    } else {
      return null;
    }
  }

  /**
   * Finds a superior connection on the source block if the given connection is
   * inferior.
   *
   * @param connection The connection trying to be connected.
   * @returns The superior connection or null if none exists.
   */
  getSuperiorConnection(
    connection: Blockly.RenderedConnection | null,
  ): Blockly.RenderedConnection | null {
    if (!connection) {
      return null;
    }
    if (connection.isSuperior()) {
      return connection;
    } else if (connection.targetConnection) {
      return connection.targetConnection;
    }
    return null;
  }

  /**
   * Moves the moving connection to the target connection and connects them.
   *
   * @param movingConnection The connection that is being moved.
   * @param destConnection The connection to be moved to.
   * @returns True if the connections were connected, false otherwise.
   */
  moveAndConnect(
    movingConnection: Blockly.RenderedConnection | null,
    destConnection: Blockly.RenderedConnection | null,
  ): boolean {
    if (!movingConnection || !destConnection) {
      return false;
    }
    const movingBlock = movingConnection.getSourceBlock();
    const checker = movingConnection.getConnectionChecker();

    if (
      checker.canConnect(movingConnection, destConnection, false) &&
      !destConnection.getSourceBlock().isShadow()
    ) {
      this.disconnectChild(movingConnection, destConnection);

      // Position the root block near the connection so it does not move the
      // other block when they are connected.
      if (!destConnection.isSuperior()) {
        const rootBlock = movingBlock.getRootBlock();

        const originalOffsetToTarget = {
          x: destConnection.x - movingConnection.x,
          y: destConnection.y - movingConnection.y,
        };
        const originalOffsetInBlock = movingConnection
          .getOffsetInBlock()
          .clone();
        rootBlock.positionNearConnection(
          movingConnection,
          originalOffsetToTarget,
          originalOffsetInBlock,
        );
      }
      destConnection.connect(movingConnection);
      return true;
    }
    return false;
  }

  /**
   * Tries to connect the given block to the destination connection, making an
   * intelligent guess about which connection to use on the moving block.
   *
   * @param block The block to move.
   * @param destConnection The connection to
   *     connect to.
   * @returns Whether the connection was successful.
   */
  insertBlock(
    block: Blockly.BlockSvg,
    destConnection: Blockly.RenderedConnection,
  ): boolean {
    switch (destConnection.type) {
      case Blockly.PREVIOUS_STATEMENT:
        if (this.connect(block.nextConnection, destConnection)) {
          return true;
        }
        break;
      case Blockly.NEXT_STATEMENT:
        if (this.connect(block.previousConnection, destConnection)) {
          return true;
        }
        break;
      case Blockly.INPUT_VALUE:
        if (this.connect(block.outputConnection, destConnection)) {
          return true;
        }
        break;
      case Blockly.OUTPUT_VALUE:
        for (let i = 0; i < block.inputList.length; i++) {
          const inputConnection = block.inputList[i].connection;
          if (
            inputConnection &&
            inputConnection.type === Blockly.INPUT_VALUE &&
            this.connect(
              inputConnection as Blockly.RenderedConnection,
              destConnection,
            )
          ) {
            return true;
          }
        }
        // If there are no input values pass the output and destination
        // connections to connect_ to find a way to connect the two.
        if (
          block.outputConnection &&
          this.connect(block.outputConnection, destConnection)
        ) {
          return true;
        }
        break;
    }
    this.warn('This block can not be inserted at the marked location.');
    return false;
  }

  /**
   * Disconnects the connection that the cursor is pointing to, and bump blocks.
   * This is a no-op if the connection cannot be broken or if the cursor is not
   * pointing to a connection.
   *
   * @param workspace The workspace.
   */
  disconnectBlocks(workspace: Blockly.WorkspaceSvg) {
    const cursor = workspace.getCursor();
    if (!cursor) {
      return;
    }
    const curNode = cursor.getCurNode();
    if (!curNode.isConnection()) {
      this.log(
        'Cannot disconnect blocks when the cursor is not on a connection',
      );
      return;
    }
    const curConnection = curNode.getLocation() as Blockly.RenderedConnection;
    if (!curConnection.isConnected()) {
      this.log('Cannot disconnect unconnected connection');
      return;
    }
    const superiorConnection = curConnection.isSuperior()
      ? curConnection
      : curConnection.targetConnection!;

    const inferiorConnection = curConnection.isSuperior()
      ? curConnection.targetConnection!
      : curConnection;

    if (inferiorConnection.getSourceBlock().isShadow()) {
      this.log('Cannot disconnect a shadow block');
      return;
    }
    superiorConnection.disconnect();
    inferiorConnection.bumpAwayFrom(superiorConnection);

    const rootBlock = superiorConnection.getSourceBlock().getRootBlock();
    rootBlock.bringToFront();

    const connectionNode =
      Blockly.ASTNode.createConnectionNode(superiorConnection);
    workspace.getCursor()!.setCurNode(connectionNode!);
  }

  /**
   * Moves the marker to the cursor's current location.
   *
   * @param workspace The workspace.
   */
  markAtCursor(workspace: Blockly.WorkspaceSvg) {
    this.getMarker(workspace)!.setCurNode(workspace.getCursor()!.getCurNode());
  }

  /**
   * Removes the marker from its current location and hide it.
   *
   * @param workspace The workspace.
   */
  removeMark(workspace: Blockly.WorkspaceSvg) {
    const marker = this.getMarker(workspace);
    marker?.hide();
  }

  /**
   * Enables accessibility mode.
   *
   * @param workspace The workspace to enable keyboard
   *     accessibility mode on.
   */
  enableKeyboardAccessibility(workspace: Blockly.WorkspaceSvg) {
    if (
      this.workspaces.indexOf(workspace) > -1 &&
      !workspace.keyboardAccessibilityMode
    ) {
      workspace.keyboardAccessibilityMode = true;
      this.focusWorkspace(workspace);
    }
  }

  /**
   * Disables accessibility mode.
   *
   * @param workspace The workspace to disable keyboard
   *     accessibility mode on.
   */
  disableKeyboardAccessibility(workspace: Blockly.WorkspaceSvg) {
    if (
      this.workspaces.indexOf(workspace) > -1 &&
      workspace.keyboardAccessibilityMode
    ) {
      workspace.keyboardAccessibilityMode = false;
      workspace.getCursor()!.hide();
      this.getMarker(workspace)!.hide();
      if (this.getFlyoutCursor(workspace)) {
        this.getFlyoutCursor(workspace)!.hide();
      }
    }
  }

  /**
   * Navigation log handler. If loggingCallback is defined, use it.
   * Otherwise just log to the console.log.
   *
   * @param msg The message to log.
   */
  log(msg: string) {
    console.log(msg);
  }

  /**
   * Navigation warning handler. If loggingCallback is defined, use it.
   * Otherwise call console.warn.
   *
   * @param msg The warning message.
   */
  warn(msg: string) {
    console.warn(msg);
  }

  /**
   * Navigation error handler. If loggingCallback is defined, use it.
   * Otherwise call console.error.
   *
   * @param msg The error message.
   */
  error(msg: string) {
    console.error(msg);
  }

  /**
   * Moves the workspace cursor in the given direction.
   *
   * @param workspace The workspace the cursor is on.
   * @param xDirection -1 to move cursor left. 1 to move cursor right.
   * @param yDirection -1 to move cursor up. 1 to move cursor down.
   * @returns True if the current node is a workspace, false
   *     otherwise.
   */
  moveWSCursor(
    workspace: Blockly.WorkspaceSvg,
    xDirection: number,
    yDirection: number,
  ): boolean {
    const cursor = workspace.getCursor();
    if (!cursor) {
      return false;
    }
    const curNode = cursor.getCurNode();

    if (curNode.getType() !== Blockly.ASTNode.types.WORKSPACE) {
      return false;
    }

    const wsCoord = curNode.getWsCoordinate();
    const newX = xDirection * this.WS_MOVE_DISTANCE + wsCoord.x;
    const newY = yDirection * this.WS_MOVE_DISTANCE + wsCoord.y;

    cursor.setCurNode(
      Blockly.ASTNode.createWorkspaceNode(
        workspace,
        new Blockly.utils.Coordinate(newX, newY),
      )!,
    );
    return true;
  }

  /**
   * Handles hitting the enter key on the workspace.
   *
   * @param workspace The workspace.
   */
  handleEnterForWS(workspace: Blockly.WorkspaceSvg) {
    const cursor = workspace.getCursor();
    if (!cursor) {
      return;
    }
    const curNode = cursor.getCurNode();
    const nodeType = curNode.getType();
    if (nodeType == Blockly.ASTNode.types.FIELD) {
      (curNode.getLocation() as Blockly.Field).showEditor();
    } else if (
      curNode.isConnection() ||
      nodeType == Blockly.ASTNode.types.WORKSPACE
    ) {
      this.markAtCursor(workspace);
    } else if (nodeType == Blockly.ASTNode.types.BLOCK) {
      this.warn('Cannot mark a block.');
    } else if (nodeType == Blockly.ASTNode.types.STACK) {
      this.warn('Cannot mark a stack.');
    }
  }

  /**
   * Pastes the copied block to the marked location.
   *
   * @param copyData The data to paste into the workspace.
   * @param workspace The workspace to paste the data into.
   * @returns True if the paste was sucessful, false otherwise.
   */
  paste(copyData: Blockly.ICopyData, workspace: Blockly.WorkspaceSvg): boolean {
    let isHandled = false;
    Blockly.Events.setGroup(true);
    const block = Blockly.clipboard.paste(
      copyData,
      workspace,
    ) as Blockly.BlockSvg;
    if (block) {
      isHandled = this.insertPastedBlock(workspace, block);
    }
    Blockly.Events.setGroup(false);
    return isHandled;
  }

  /**
   * Inserts the pasted block at the marked location if a compatible connection
   * exists. If no connection has been marked, or there is not a compatible
   * connection then the block is placed on the workspace.
   *
   * @param workspace The workspace to paste the block on.
   * @param block The block to paste.
   * @returns True if the block was pasted to the workspace, false
   *     otherwise.
   */
  insertPastedBlock(
    workspace: Blockly.WorkspaceSvg,
    block: Blockly.BlockSvg,
  ): boolean {
    let isHandled = false;
    const markedNode = workspace.getMarker(this.MARKER_NAME)?.getCurNode();
    if (markedNode) {
      isHandled = this.tryToConnectMarkerAndCursor(
        workspace,
        markedNode,
        Blockly.ASTNode.createBlockNode(block)!,
      );
    }
    return isHandled;
  }

  /**
   * Triggers a flyout button's callback.
   *
   * @param workspace The main workspace. The workspace
   *     containing a flyout with a button.
   */
  triggerButtonCallback(workspace: Blockly.WorkspaceSvg) {
    const button = this.getFlyoutCursor(workspace)!
      .getCurNode()
      .getLocation() as Blockly.FlyoutButton;
    const buttonCallback = (workspace as any).flyoutButtonCallbacks.get(
      (button as any).callbackKey,
    );
    if (typeof buttonCallback === 'function') {
      buttonCallback(button);
    } else {
      throw new Error('No callback function found for flyout button.');
    }
  }

  /**
   * Removes the change listeners on all registered workspaces.
   */
  dispose() {
    for (const workspace of this.workspaces) {
      this.removeWorkspace(workspace);
    }
  }
}
