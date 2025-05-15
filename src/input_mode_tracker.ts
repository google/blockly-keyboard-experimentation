import {WorkspaceSvg} from 'blockly';

/**
 * Types of user input.
 */
const enum InputMode {
  Keyboard,
  Pointer,
}

/**
 * Tracks the most recent input mode and sets a class indicating we're in
 * keyboard nav mode.
 */
export class InputModeTracker {
  private lastEventMode: InputMode | null = null;

  private pointerEventHandler = () => {
    this.lastEventMode = InputMode.Pointer;
  };
  private keyboardEventHandler = () => {
    this.lastEventMode = InputMode.Keyboard;
  };
  private focusChangeHandler = () => {
    const isKeyboard = this.lastEventMode === InputMode.Keyboard;
    const classList = this.workspace.getInjectionDiv().classList;
    const className = 'blocklyKeyboardNavigation';
    if (isKeyboard) {
      classList.add(className);
    } else {
      classList.remove(className);
    }
  };

  constructor(private workspace: WorkspaceSvg) {
    document.addEventListener('pointerdown', this.pointerEventHandler, true);
    document.addEventListener('keydown', this.keyboardEventHandler, true);
    document.addEventListener('focusout', this.focusChangeHandler, true);
    document.addEventListener('focusin', this.focusChangeHandler, true);
  }

  dispose() {
    document.removeEventListener('pointerdown', this.pointerEventHandler, true);
    document.removeEventListener('keydown', this.keyboardEventHandler, true);
    document.removeEventListener('focusout', this.focusChangeHandler, true);
    document.removeEventListener('focusin', this.focusChangeHandler, true);
  }
}
