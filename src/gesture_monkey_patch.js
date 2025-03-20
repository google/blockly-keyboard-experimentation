/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Overrides methods on Blockly.Gesture to integrate focus mangagement
 * with the gesture handling.
 * @author aschmiedt@google.com (Abby Schmiedt)
 */

import * as Blockly from 'blockly/core';

const oldDispose = Blockly.Gesture.prototype.dispose;

/**
 * Intercept the end of a gesture and ensure the workspace is focused.
 * See also the listener is index.ts that subverts the markFocused call
 * in `doStart`.
 * @this {Blockly.Gesture}
 * @override
 */
Blockly.Gesture.prototype.dispose = function () {
  // This is a bit of a cludge and focus management needs to be better
  // integrated with Gesture. The intent is to move focus at the end of
  // a drag from a non-auto-closing flyout.
  if (this.isDragging()) {
    this.creatorWorkspace?.getSvgGroup().focus();
  }
  oldDispose.call(this);
};
