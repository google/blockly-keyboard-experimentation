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
  (separator) => {
    aria.setRole(separator.getFocusableElement(), aria.Role.SEPARATOR);
    toolboxUtils.recomputeAriaOwnersInToolbox(
      separator.getFocusableTree() as Blockly.Toolbox,
    );
  },
  Blockly.ToolboxSeparator.prototype.init,
  Blockly.ToolboxSeparator.prototype,
);
