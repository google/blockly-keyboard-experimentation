/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {NavigationController} from './navigation_controller';
import {installCursor} from './line_cursor';

/** Plugin for keyboard navigation. */
export class KeyboardNavigation {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;

  /**
   * Constructs the keyboard navigation.
   *
   * @param workspace The workspace that the plugin will
   *     be added to.
   */
  constructor(workspace: Blockly.WorkspaceSvg) {
    this.workspace = workspace;

    const navigationController = new NavigationController();
    navigationController.init();
    navigationController.addWorkspace(workspace);
    navigationController.enable(workspace);
    navigationController.listShortcuts();

    this.setGlowTheme();
    installCursor(workspace.getMarkerManager());

    // Ensure that only the root SVG G (group) has a tab index.
    workspace.getInjectionDiv().removeAttribute('tabindex');
    workspace.getParentSvg().removeAttribute('tabindex');

    workspace.getSvgGroup().addEventListener('focus', () => {
      navigationController.setHasFocus(true);
    });
    workspace.getSvgGroup().addEventListener('blur', () => {
      navigationController.setHasFocus(false);
    });
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
