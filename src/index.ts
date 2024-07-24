/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
// @ts-ignore
import {NavigationController} from './navigation_controller';
// @ts-ignore
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
    // Turns on keyboard navigation.
    navigationController.enable(workspace);
    navigationController.listShortcuts();

    installCursor(workspace.getMarkerManager());
  }
}
