/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {enableBlocksOnDrag} from './disabled_blocks';
import {InputModeTracker} from './input_mode_tracker';

/** Plugin for keyboard navigation. */
export class KeyboardNavigation {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;

  /** Keyboard navigation controller instance for the workspace. */
  private navigationController: NavigationController;

  /** Cursor for the main workspace. */
  private cursor: Blockly.LineCursor;

  /**
   * These fields are used to preserve the workspace's initial state to restore
   * it when/if keyboard navigation is disabled.
   */
  private originalTheme: Blockly.Theme;

  /**
   * Input mode tracking.
   */
  private inputModeTracker: InputModeTracker;

  /**
   * Focus ring in the workspace.
   */
  private workspaceFocusRing: Element | null = null;
  /**
   * Selection ring inside the workspace.
   */
  private workspaceSelectionRing: Element | null = null;

  /**
   * Used to restore monkey patch.
   */
  private oldWorkspaceResize:
    | InstanceType<typeof Blockly.WorkspaceSvg>['resize']
    | null = null;

  /**
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will be added to.
   */
  constructor(workspace: Blockly.WorkspaceSvg) {
    this.workspace = workspace;

    this.navigationController = new NavigationController();
    this.navigationController.init();
    this.navigationController.addWorkspace(workspace);
    this.navigationController.enable(workspace);
    this.inputModeTracker = new InputModeTracker(workspace);

    this.originalTheme = workspace.getTheme();
    this.setGlowTheme();

    this.cursor = new Blockly.LineCursor(workspace);

    // Add the event listener to enable disabled blocks on drag.
    workspace.addChangeListener(enableBlocksOnDrag);

    // Move the flyout for logical tab order.
    const flyout = workspace.getFlyout();
    if (flyout != null && flyout instanceof Blockly.Flyout) {
      // This relies on internals.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flyoutElement = ((flyout as any).svgGroup_ as SVGElement) ?? null;
      flyoutElement?.parentElement?.insertBefore(
        flyoutElement,
        workspace.getParentSvg(),
      );
    }

    this.oldWorkspaceResize = workspace.resize;
    workspace.resize = () => {
      this.oldWorkspaceResize?.call(this.workspace);
      this.resizeWorkspaceRings();
    };
    this.workspaceSelectionRing = Blockly.utils.dom.createSvgElement('rect', {
      fill: 'none',
      class: 'blocklyWorkspaceSelectionRing',
    });
    workspace.getSvgGroup().appendChild(this.workspaceSelectionRing);
    this.workspaceFocusRing = Blockly.utils.dom.createSvgElement('rect', {
      fill: 'none',
      class: 'blocklyWorkspaceFocusRing',
    });
    workspace.getSvgGroup().appendChild(this.workspaceFocusRing);
    this.resizeWorkspaceRings();
  }

  private resizeWorkspaceRings() {
    if (!this.workspaceFocusRing || !this.workspaceSelectionRing) return;
    this.resizeFocusRingInternal(this.workspaceSelectionRing, 5);
    this.resizeFocusRingInternal(this.workspaceFocusRing, 0);
  }

  private resizeFocusRingInternal(ring: Element, inset: number) {
    const metrics = this.workspace.getMetrics();
    ring.setAttribute('x', (metrics.absoluteLeft + inset).toString());
    ring.setAttribute('y', (metrics.absoluteTop + inset).toString());
    ring.setAttribute(
      'width',
      Math.max(0, metrics.viewWidth - inset * 2).toString(),
    );
    ring.setAttribute(
      'height',
      Math.max(0, metrics.svgHeight - inset * 2).toString(),
    );
  }

  /**
   * Disables keyboard navigation for this navigator's workspace.
   */
  dispose() {
    this.workspaceFocusRing?.remove();
    this.workspaceSelectionRing?.remove();
    if (this.oldWorkspaceResize) {
      this.workspace.resize = this.oldWorkspaceResize;
    }

    // Remove the event listener that enables blocks on drag
    this.workspace.removeChangeListener(enableBlocksOnDrag);

    this.workspace.setTheme(this.originalTheme);

    this.navigationController.dispose();
    this.inputModeTracker.dispose();
  }

  /**
   * Toggle visibility of a help dialog for the keyboard shortcuts.
   */
  toggleShortcutDialog(): void {
    this.navigationController.shortcutDialog.toggle(this.workspace);
  }

  /**
   * Update the theme to match the selected glow colour to the cursor
   * colour.
   */
  setGlowTheme() {
    const newTheme = Blockly.Theme.defineTheme('zelosDerived', {
      name: 'zelosDerived',
      base: Blockly.Themes.Zelos,
      componentStyles: {
        selectedGlowColour: '#ffa200',
      },
    });
    this.workspace.setTheme(newTheme);
  }
}
