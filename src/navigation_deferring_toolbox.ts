/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';

export class NavigationDeferringToolbox extends Blockly.Toolbox {
  protected override onKeyDown_(e: KeyboardEvent) {
    // No-op, prevent keyboard handling by superclass in order to defer to
    // global keyboard navigation.
  }
}

export function registerNavigationDeferringToolbox() {
  Blockly.registry.register(
    Blockly.registry.Type.TOOLBOX,
    Blockly.registry.DEFAULT,
    NavigationDeferringToolbox,
    true,
  );
}
