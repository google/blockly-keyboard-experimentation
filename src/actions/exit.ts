/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {ShortcutRegistry, utils as BlocklyUtils} from 'blockly/core';

import type {WorkspaceSvg} from 'blockly/core';

import * as Constants from '../constants';
import type {Navigation} from '../navigation';

const KeyCodes = BlocklyUtils.KeyCodes;

/**
 * Class for registering a shortcut for the exit action.
 */
export class ExitAction {
  constructor(
    private navigation: Navigation,
    private canCurrentlyNavigate: (ws: WorkspaceSvg) => boolean,
  ) {}

  /**
   * Adds the exit action shortcut to the registry.
   */
  install() {
    ShortcutRegistry.registry.register({
      name: Constants.SHORTCUT_NAMES.EXIT,
      preconditionFn: (workspace) => this.canCurrentlyNavigate(workspace),
      callback: (workspace) => {
        switch (this.navigation.getState(workspace)) {
          case Constants.STATE.FLYOUT:
          case Constants.STATE.TOOLBOX:
            this.navigation.focusWorkspace(workspace);
            return true;
          default:
            return false;
        }
      },
      keyCodes: [KeyCodes.ESC],
      allowCollision: true,
    });
  }

  /**
   * Removes the exit action shortcut.
   */
  uninstall() {
    ShortcutRegistry.registry.unregister(Constants.SHORTCUT_NAMES.EXIT);
  }
}
