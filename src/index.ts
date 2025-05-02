/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {enableBlocksOnDrag} from './disabled_blocks';

/** Options object for KeyboardNavigation instances. */
export interface NavigationOptions {
  cursor: Partial<Blockly.CursorOptions>;
}

/** Default options for LineCursor instances. */
const defaultOptions: NavigationOptions = {
  cursor: {},
};

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
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will
   *     be added to.
   * @param options Options.
   */
  constructor(
    workspace: Blockly.WorkspaceSvg,
    options: Partial<NavigationOptions>,
  ) {
    this.workspace = workspace;

    // Regularise options and apply defaults.
    options = {...defaultOptions, ...options};

    this.navigationController = new NavigationController();
    this.navigationController.init();
    this.navigationController.addWorkspace(workspace);
    this.navigationController.enable(workspace);

    this.originalTheme = workspace.getTheme();
    this.setGlowTheme();

    this.cursor = new Blockly.LineCursor(workspace, options.cursor);

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
  }

  /**
   * Disables keyboard navigation for this navigator's workspace.
   */
  dispose() {
    // Remove the event listener that enables blocks on drag
    this.workspace.removeChangeListener(enableBlocksOnDrag);

    this.workspace.setTheme(this.originalTheme);

    this.navigationController.dispose();
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
