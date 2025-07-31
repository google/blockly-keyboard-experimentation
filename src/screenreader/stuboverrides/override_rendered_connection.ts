import {FunctionStubber} from '../function_stubber_registry';
import * as Blockly from 'blockly/core';
import * as aria from '../aria';

FunctionStubber.getInstance().registerInitializationStub((connection) => {
  // This is a later initialization than most components but it's likely
  // adequate since the creation of RenderedConnection's focusable element is
  // part of the block rendering lifecycle (so the class itself isn't even aware
  // when its element exists).
  const element = connection.getFocusableElement();
  aria.setRole(element, aria.Role.FIGURE);
  aria.setState(element, aria.State.LABEL, 'Open connection');
}, 'highlight', Blockly.RenderedConnection.prototype);
