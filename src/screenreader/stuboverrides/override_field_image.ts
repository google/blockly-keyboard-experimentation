/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (fieldImage) => {
    const element = fieldImage.getFocusableElement();
    aria.setRole(element, aria.Role.IMAGE);
    aria.setState(
      element,
      aria.State.LABEL,
      fieldImage.name ? `Image ${fieldImage.name}` : 'Image',
    );
  },
  'initView',
  Blockly.FieldImage.prototype,
);
