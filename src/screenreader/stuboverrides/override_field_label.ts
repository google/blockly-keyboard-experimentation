/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (fieldLabel) => {
    // There's no additional semantic meaning needed for a label; the aria-label
    // should be sufficient for context.
    aria.setState(
      fieldLabel.getFocusableElement(),
      aria.State.LABEL,
      fieldLabel.getText(),
    );
  },
  Blockly.FieldLabel.prototype.initView,
  Blockly.FieldLabel.prototype,
);
