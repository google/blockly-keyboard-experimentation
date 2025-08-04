/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (field) => {
    // The text itself is presentation since it's represented through the
    // block's ARIA label.
    // @ts-expect-error Access to private property getTextElement.
    aria.setState(field.getTextElement(), aria.State.HIDDEN, true);
  },
  // @ts-expect-error Access to protected property createTextElement_.
  Blockly.Field.prototype.createTextElement_,
  Blockly.Field.prototype,
);
