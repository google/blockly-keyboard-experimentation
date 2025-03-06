/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

let oldOnKeyDownHandler = null;

export function install() {
  oldOnKeyDownHandler = Blockly.Toolbox.prototype.onKeyDown_;
  Blockly.Toolbox.prototype.onKeyDown_ = function () {
    // Do nothing since keyboard functionality should be entirely handled by the
    // keyboard navigation plugin.
  };
};

export function uninstall() {
  if (!oldOnKeyDownHandler) {
    throw new Error("Trying to dispose non-inited monkey patch.");
  }
  Blockly.Toolbox.prototype.onKeyDown_ = oldOnKeyDownHandler;
  oldOnKeyDownHandler = null;
};
