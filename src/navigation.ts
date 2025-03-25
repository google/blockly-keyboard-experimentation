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
import {
  getFlyoutElement,
  getToolboxElement,
  getWorkspaceElement,
} from './workspace_utilities';
import {PassiveFocus} from './passive_focus';

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
   * An object that renders a passive focus indicator at a specified location.
   */
  private passiveFocusIndicator: PassiveFocus = new PassiveFocus();

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
    this.passiveFocusIndicator.dispose();
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
   * Gets the node to use as context for insert operations.
   *
   * @param workspace The main workspace.
   */
  getStationaryNode(workspace: Blockly.WorkspaceSvg) {
    return (
      this.passiveFocusIndicator.getCurNode() ??
      workspace.getCursor()?.getCurNode()
    );
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
      flyoutWorkspace
        .getMarkerManager()
        .setCursor(new FlyoutCursorClass(flyout));
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
      case Blockly.Events.BLOCK_CREATE:
        if (workspace.isDragging()) {
          // Hide the passive focus indicator when dragging so as not to fight
          // with the drop cues. Safe because of the gesture monkey patch.
          this.passiveFocusIndicator.hide();
        }
        break;
    }

    // Hiding the cursor isn't permanent and can show again when we render.
    // Rehide it:
    if (this.passiveFocusIndicator.isVisible()) {
      workspace.getCursor()?.hide();
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
    } else if (
      e.type === Blockly.Events.BLOCK_CREATE &&
      this.getState(mainWorkspace) === Constants.STATE.FLYOUT
    ) {
      // When variables are created, that recreates the flyout contents, leaving the
      // cursor in an invalid state.
      this.resetFlyoutCursorPosition(mainWorkspace);
    }
  }

  private isFlyoutItemDisposed(node: Blockly.ASTNode) {
    if (node.getSourceBlock()?.disposed) {
      return true;
    }
    const location = node.getLocation();
    if (location instanceof Blockly.FlyoutButton) {
      // No nice way to tell for a button. In v12 we could use getSvgGroup().
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (location as any).svgGroup.parentNode === null;
    }
    return false;
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
      !cursor.getCurNode()?.getSourceBlock()
    ) {
      return;
    }

    const curNode = cursor.getCurNode();
    const sourceBlock = curNode?.getSourceBlock()!;
    if (sourceBlock?.id === deletedBlockId || ids.includes(sourceBlock?.id)) {
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
    this.focusFlyout(mainWorkspace);
  }

  /**
   * Sets browser focus to the workspace.
   *
   * @param workspace The workspace to focus.
   */
  focusWorkspace(workspace: Blockly.WorkspaceSvg) {
    getWorkspaceElement(workspace).focus();
  }

  /**
   * Sets the navigation state to workspace and moves the cursor to either the
   * top block on a workspace or to the workspace. Switches from passive focus
   * indication to showing the cursor.
   *
   * @param workspace The workspace that has gained focus.
   */
  handleFocusWorkspace(workspace: Blockly.WorkspaceSvg) {
    this.setState(workspace, Constants.STATE.WORKSPACE);
    if (!Blockly.Gesture.inProgress()) {
      workspace.hideChaff();
      // This will make a selection which would interfere with any gesture.
      this.defaultCursorPositionIfNeeded(workspace);
    }

    const cursor = workspace.getCursor();
    if (cursor) {
      const passiveFocusNode = this.passiveFocusIndicator.getCurNode();
      this.passiveFocusIndicator.hide();
      // If there's a gesture then it will either set the node or be a click
      // that should not set one.
      if (!Blockly.Gesture.inProgress() && passiveFocusNode) {
        cursor.setCurNode(passiveFocusNode);
      }
    }
  }

  /**
   * Clears navigation state and switches to using the passive focus indicator
   * if it is not the context menu / field input that is causing blur.
   *
   * @param workspace The workspace that has lost focus.
   * @param ignorePopUpDivs Whether to skip the focus indicator change when
   *     the widget/dropdown divs are open.
   */
  handleBlurWorkspace(
    workspace: Blockly.WorkspaceSvg,
    ignorePopUpDivs = false,
  ) {
    this.setState(workspace, Constants.STATE.NOWHERE);
    const cursor = workspace.getCursor();
    const popUpDivsShowing =
      Blockly.WidgetDiv.isVisible() || Blockly.DropDownDiv.isVisible();
    if (cursor && (ignorePopUpDivs || !popUpDivsShowing)) {
      const curNode = cursor.getCurNode();
      if (curNode) {
        this.passiveFocusIndicator.show(curNode);
      }
      // It's initially null so this is a valid state despite the types.
      cursor.setCurNode(null);
    }
  }

  /**
   * Handle the widget or dropdown div losing focus (via focusout).
   *
   * Because we skip the widget/dropdown div cases in `handleBlurWorkspace` we need
   * to catch them here.
   *
   * @param workspace The workspace.
   * @param relatedTarget The related target (newly focused element if any).
   */
  handleFocusOutWidgetDropdownDiv(
    workspace: Blockly.WorkspaceSvg,
    relatedTarget: EventTarget | null,
  ) {
    if (relatedTarget === null) {
      // Workaround:
      // Skip document.body/null case until these blur bugs are fixed to avoid
      // flipping to passive focus as the user moves their mouse over the
      // dropdown/widget at the cost of clicks on body showing the wrong focus
      // style.
      // https://github.com/google/blockly-samples/issues/2498
      // https://github.com/google/blockly/issues/8819
      return;
    }
    if (relatedTarget !== getWorkspaceElement(workspace)) {
      this.handleBlurWorkspace(workspace, true);
    }
  }

  /**
   * Sets browser focus to the toolbox (if any).
   *
   * @param workspace The workspace with the toolbox.
   */
  focusToolbox(workspace: Blockly.WorkspaceSvg) {
    getToolboxElement(workspace)?.focus();
  }

  /**
   * Sets the navigation state to toolbox and selects the first category in the
   * toolbox. No-op if a toolbox does not exist on the given workspace.
   *
   * @param workspace The workspace to get the toolbox on.
   */
  handleFocusToolbox(workspace: Blockly.WorkspaceSvg) {
    const toolbox = workspace.getToolbox();
    if (!toolbox) {
      return;
    }
    this.setState(workspace, Constants.STATE.TOOLBOX);

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
   * Clears the navigation state and closes the flyout if `allowClose` is true
   * and a gesture is not in progress.
   *
   * @param workspace The workspace the flyout is on.
   * @param closeFlyout True to close the flyout, false otherwise.
   */
  handleBlurToolbox(workspace: Blockly.WorkspaceSvg, closeFlyout: boolean) {
    this.setState(workspace, Constants.STATE.NOWHERE);
    if (closeFlyout) {
      workspace.hideChaff();
    }
  }

  /**
   * Sets browser focus to the flyout (if any).
   *
   * @param workspace The workspace with the flyout.
   */
  focusFlyout(workspace: Blockly.WorkspaceSvg) {
    getFlyoutElement(workspace)?.focus();
  }

  /**
   * Sets the navigation state to flyout and moves the cursor to the first
   * block or button in the flyout. We disable tabbing to the toolbox while
   * the flyout has focus as we use left/right for that.
   *
   * @param workspace The workspace the flyout is on.
   */
  handleFocusFlyout(workspace: Blockly.WorkspaceSvg) {
    // Note this can happen when the flyout was already focussed as regrettably
    // a click on the flyout calls markFocused() on the workspace SVG and the
    // focus is then redirected back to the flyout.

    this.setState(workspace, Constants.STATE.FLYOUT);
    this.getFlyoutCursor(workspace)?.draw();
    this.resetFlyoutCursorPosition(workspace);

    // Prevent shift-tab to the toolbox while the flyout has focus.
    const toolboxElement = getToolboxElement(workspace);
    if (toolboxElement) {
      toolboxElement.tabIndex = -1;
    }
  }

  /**
   * Clears the navigation state and closes the flyout if `allowClose` is true
   * and a gesture is not in progress.
   *
   * @param workspace The workspace the flyout is on.
   * @param closeFlyout True to close the flyout, false otherwise.
   */
  handleBlurFlyout(workspace: Blockly.WorkspaceSvg, closeFlyout: boolean) {
    this.setState(workspace, Constants.STATE.NOWHERE);
    if (closeFlyout) {
      workspace.hideChaff();
    }
    this.getFlyoutCursor(workspace)?.hide();

    // Reinstate tab to toolbox.
    const toolboxElement = getToolboxElement(workspace);
    if (toolboxElement) {
      toolboxElement.tabIndex = 0;
    }
  }

  /**
   * Move the flyout cursor to the start if unset (as it is initially despite
   * the types) or on a disposed item.
   *
   * @param workspace The workspace.
   */
  private resetFlyoutCursorPosition(workspace: Blockly.WorkspaceSvg) {
    const flyout = workspace.getFlyout();
    if (!flyout) return;
    const flyoutCursor = this.getFlyoutCursor(workspace);
    if (!flyoutCursor) return;

    const curNode = flyoutCursor.getCurNode();
    if (curNode && !this.isFlyoutItemDisposed(curNode)) return;

    const flyoutContents = flyout.getContents();
    const firstFlyoutItem = flyoutContents[0];
    if (!firstFlyoutItem) return;
    if (firstFlyoutItem.getElement() instanceof Blockly.FlyoutButton) {
      const astNode = Blockly.ASTNode.createButtonNode(
        firstFlyoutItem.getElement() as Blockly.FlyoutButton,
      );
      flyoutCursor.setCurNode(astNode!);
    } else if (firstFlyoutItem.getElement() instanceof Blockly.BlockSvg) {
      const astNode = Blockly.ASTNode.createStackNode(
        firstFlyoutItem.getElement() as Blockly.BlockSvg,
      );
      flyoutCursor.setCurNode(astNode!);
    }
  }

  /**
   * Sets the cursor location when focusing the workspace.
   * Tries the following, in order, stopping after the first success:
   *  - Resume editing by returning the cursor to its previous location, if valid.
   *  - Move the cursor to the top connection point on on the first top block.
   *  - Move the cursor to the default location on the workspace.
   *
   * @param workspace The main Blockly workspace.
   * @return true if the cursor location was defaulted.
   */
  defaultCursorPositionIfNeeded(
    workspace: Blockly.WorkspaceSvg,
    prefer: 'first' | 'last' = 'first',
  ) {
    const topBlocks = workspace.getTopBlocks(true);
    const cursor = workspace.getCursor();
    if (!cursor) {
      return;
    }
    const disposed = cursor.getCurNode()?.getSourceBlock()?.disposed;
    if (cursor.getCurNode() && !disposed) {
      // Retain the cursor's previous position since it's set, but only if not
      // disposed (which can happen when blocks are reloaded).
      return false;
    }
    const wsCoordinates = new Blockly.utils.Coordinate(
      this.DEFAULT_WS_COORDINATE.x / workspace.scale,
      this.DEFAULT_WS_COORDINATE.y / workspace.scale,
    );
    if (topBlocks.length > 0) {
      cursor.setCurNode(
        Blockly.ASTNode.createTopNode(
          topBlocks[prefer === 'first' ? 0 : topBlocks.length - 1],
        )!,
      );
    } else {
      const wsNode = Blockly.ASTNode.createWorkspaceNode(
        workspace,
        wsCoordinates,
      );
      cursor.setCurNode(wsNode!);
    }
    return true;
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
   * Tries to intelligently connect the blocks or connections
   * represented by the given nodes, based on node types and locations.
   *
   * @param workspace The main workspace.
   * @param stationaryNode The first node to connect.
   * @param movingNode The second node to connect.
   * @returns True if the key was handled; false if something went
   *     wrong.
   */
  tryToConnectNodes(
    workspace: Blockly.WorkspaceSvg,
    stationaryNode: Blockly.ASTNode,
    movingNode: Blockly.ASTNode,
  ): boolean {
    if (!this.logConnectionWarning(stationaryNode, movingNode)) {
      return false;
    }

    const stationaryType = stationaryNode.getType();
    const movingType = movingNode.getType();

    const stationaryLoc = stationaryNode.getLocation();
    const movingLoc = movingNode.getLocation();

    if (stationaryNode.isConnection()) {
      if (movingNode.isConnection()) {
        const stationaryAsConnection =
          stationaryLoc as Blockly.RenderedConnection;
        const movingAsConnection = movingLoc as Blockly.RenderedConnection;
        return this.connect(movingAsConnection, stationaryAsConnection);
      }
      // Connect the moving block to the stationary connection using
      // the most plausible connection on the moving block.
      if (
        movingType === Blockly.ASTNode.types.BLOCK ||
        movingType === Blockly.ASTNode.types.STACK
      ) {
        const stationaryAsConnection =
          stationaryLoc as Blockly.RenderedConnection;
        const movingAsBlock = movingLoc as Blockly.BlockSvg;
        return this.insertBlock(movingAsBlock, stationaryAsConnection);
      }
    } else if (stationaryType === Blockly.ASTNode.types.WORKSPACE) {
      const block = movingNode
        ? (movingNode.getSourceBlock() as Blockly.BlockSvg)
        : null;
      return this.moveBlockToWorkspace(block, stationaryNode);
    } else if (
      stationaryType === Blockly.ASTNode.types.BLOCK &&
      movingType === Blockly.ASTNode.types.BLOCK
    ) {
      // Insert the moving block above the stationary block, if the
      // appropriate connections exist.
      const stationaryBlock = stationaryLoc as Blockly.BlockSvg;
      const movingBlock = movingLoc as Blockly.BlockSvg;
      if (stationaryBlock.previousConnection) {
        return this.insertBlock(
          movingBlock,
          stationaryBlock.previousConnection,
        );
      } else if (stationaryBlock.outputConnection) {
        return this.insertBlock(movingBlock, stationaryBlock.outputConnection);
      }
    }
    this.warn('Unexpected state in tryToConnectNodes.');
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
    if (markerType === Blockly.ASTNode.types.FIELD) {
      this.warn('Should not have been able to mark a field.');
      return false;
    } else if (markerType === Blockly.ASTNode.types.STACK) {
      this.warn('Should not have been able to mark a stack.');
      return false;
    }

    // Check the cursor for invalid types.
    if (cursorType === Blockly.ASTNode.types.FIELD) {
      this.warn('Cannot attach a field to anything else.');
      return false;
    } else if (cursorType === Blockly.ASTNode.types.WORKSPACE) {
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
      if (movingBlock.getDescendants(false).includes(destBlock)) {
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
   * Enables accessibility mode.
   *
   * @param workspace The workspace to enable keyboard
   *     accessibility mode on.
   */
  enableKeyboardAccessibility(workspace: Blockly.WorkspaceSvg) {
    if (
      this.workspaces.includes(workspace) &&
      !workspace.keyboardAccessibilityMode
    ) {
      workspace.keyboardAccessibilityMode = true;
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
      this.workspaces.includes(workspace) &&
      workspace.keyboardAccessibilityMode
    ) {
      workspace.keyboardAccessibilityMode = false;
      workspace.getCursor()!.hide();
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
   * Save the current cursor location and open the toolbox or flyout
   * to select and insert a block.
   * @param workspace The active workspace.
   */
  openToolboxOrFlyout(workspace: Blockly.WorkspaceSvg) {
    if (workspace.getToolbox()) {
      this.focusToolbox(workspace);
    } else {
      this.focusFlyout(workspace);
    }
  }

  /**
   * Pastes the copied block to the marked location if possible or
   * onto the workspace otherwise.
   *
   * @param copyData The data to paste into the workspace.
   * @param workspace The workspace to paste the data into.
   * @returns True if the paste was sucessful, false otherwise.
   */
  paste(copyData: Blockly.ICopyData, workspace: Blockly.WorkspaceSvg): boolean {
    // Do this before clipoard.paste due to cursor/focus workaround in getCurNode.
    const targetNode = workspace.getCursor()?.getCurNode();

    Blockly.Events.setGroup(true);
    const block = Blockly.clipboard.paste(
      copyData,
      workspace,
    ) as Blockly.BlockSvg;
    if (block) {
      if (targetNode) {
        this.tryToConnectNodes(
          workspace,
          targetNode,
          Blockly.ASTNode.createBlockNode(block)!,
        );
      }
      return true;
    }
    Blockly.Events.setGroup(false);
    return false;
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
