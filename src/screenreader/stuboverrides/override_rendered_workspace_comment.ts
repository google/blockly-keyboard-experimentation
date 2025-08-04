/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub(
  (comment) => {
    const element = comment.getFocusableElement();
    aria.setRole(element, aria.Role.TEXTBOX);
    aria.setState(element, aria.State.LABEL, 'DoNotOverride?');
  },
  // @ts-expect-error Access to private property addModelUpdateBindings.
  Blockly.comments.RenderedWorkspaceComment.prototype.addModelUpdateBindings,
  Blockly.comments.RenderedWorkspaceComment.prototype,
);
