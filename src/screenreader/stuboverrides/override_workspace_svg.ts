/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (workspace) => {
    const element = workspace.getFocusableElement();
    aria.setRole(element, aria.Role.TREE);
    let ariaLabel = null;
    // @ts-expect-error Access to private property injectionDiv.
    if (workspace.injectionDiv) {
      ariaLabel = Blockly.Msg['WORKSPACE_ARIA_LABEL'];
    } else if (workspace.isFlyout) {
      ariaLabel = 'Flyout';
    } else if (workspace.isMutator) {
      ariaLabel = 'Mutator';
    } else {
      throw new Error('Cannot determine ARIA label for workspace.');
    }
    aria.setState(element, aria.State.LABEL, ariaLabel);
  },
  Blockly.WorkspaceSvg.prototype.createDom,
  Blockly.WorkspaceSvg.prototype,
);
