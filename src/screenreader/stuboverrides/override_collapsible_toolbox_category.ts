/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';
import * as toolboxUtils from '../toolbox_utilities';

FunctionStubber.getInstance().registerInitializationStub(
  (category) => {
    const element = category.getFocusableElement();
    aria.setRole(element, aria.Role.GROUP);

    // Ensure this group has properly set children.
    const selectableChildren =
      category.getChildToolboxItems().filter((item) => item.isSelectable()) ??
      null;
    const focusableChildIds = selectableChildren.map(
      (selectable) => selectable.getFocusableElement().id,
    );
    aria.setState(
      element,
      aria.State.OWNS,
      [...new Set(focusableChildIds)].join(' '),
    );
    toolboxUtils.recomputeAriaOwnersInToolbox(
      category.getFocusableTree() as Blockly.Toolbox,
    );
  },
  'init',
  Blockly.CollapsibleToolboxCategory.prototype,
);
