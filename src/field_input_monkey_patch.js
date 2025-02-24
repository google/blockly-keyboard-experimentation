/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

function addTemporaryMarkFocusedOverrideToWorkspaceSvg() {
  const oldWorkspaceSvgMarkFocused = Blockly.WorkspaceSvg.prototype.markFocused;

  Blockly.WorkspaceSvg.prototype.markFocused = function() {
    oldWorkspaceSvgMarkFocused.call(this);

    // After the workspace's internal state is updated, ensure the correct
    // container for keyboard navigation has focus. Note that this monkey patch is
    // only overriding focus behavior for cases when a widget is being dispoed as
    // there are other cases when focus needs to be correctly on the parent SVG
    // (such as creating variables--see #136).
    document.querySelector('.blocklyWorkspace').focus();
    Blockly.WorkspaceSvg.prototype.markFocused = oldWorkspaceSvgMarkFocused;
  }
}

const oldFieldNumberWidgetDispose = Blockly.FieldNumber.prototype.widgetDispose_;

Blockly.FieldNumber.prototype.widgetDispose_ = function() {
  oldFieldNumberWidgetDispose.call(this);
  addTemporaryMarkFocusedOverrideToWorkspaceSvg();
};

const oldFieldTextInputWidgetDispose = Blockly.FieldTextInput.prototype.widgetDispose_;

Blockly.FieldTextInput.prototype.widgetDispose_ = function() {
  oldFieldTextInputWidgetDispose.call(this);
  addTemporaryMarkFocusedOverrideToWorkspaceSvg();
};
