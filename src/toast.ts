import {WorkspaceSvg} from 'blockly';

/**
 * Toast options.
 */
export interface ToastOptions {
  /**
   * Message text.
   */
  message: string;
  /**
   * Duration in milliseconds before the toast is removed.
   * Defaults to 5000.
   */
  duration?: number;
}

/**
 * Shows a message as a toast positioned over the workspace.
 *
 * This is illustrative to gather feedback on the interaction.
 *
 * If retained, we'd expect to allow applications to override with their own implementations.
 *
 * Further work is needed on the accessibility of this toast:
 * - testing screen reader support
 * - considering whether support for stacked toasts is needed
 * - shortcut to focus? though it's the next tab stop currently
 *
 * @param workspace The workspace for positioning.
 * @param options Options.
 */
export function toast(workspace: WorkspaceSvg, options: ToastOptions): void {
  const {message, duration = 10000} = options;
  const className = 'blocklyToast';
  workspace.getInjectionDiv().querySelector(`.${className}`)?.remove();

  const foregroundColor = 'black';
  const toast = document.createElement('div');
  toast.className = className;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  assignStyle(toast, {
    fontSize: '1.2rem',
    position: 'absolute',
    bottom: '-10rem',
    right: '2rem',
    padding: '1rem',
    color: foregroundColor,
    backgroundColor: 'white',
    border: '2px solid black',
    borderRadius: '0.4rem',
    zIndex: '999',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    lineHeight: '1.5',
    transition: 'bottom 0.3s ease-out',
  });

  toast.appendChild(
    infoIcon({
      width: '1.5em',
      height: '1.5em',
    }),
  );
  const messageElement = toast.appendChild(document.createElement('div'));
  assignStyle(messageElement, {
    maxWidth: '18rem',
  });
  messageElement.innerText = message;
  const closeButton = toast.appendChild(document.createElement('button'));
  assignStyle(closeButton, {
    margin: '0',
    padding: '0.2rem',
    backgroundColor: 'transparent',
    color: foregroundColor,
    border: 'none',
  });
  closeButton.ariaLabel = 'Close';
  closeButton.appendChild(
    closeIcon({
      width: '1.5em',
      height: '1.5em',
    }),
  );
  closeButton.addEventListener('click', () => {
    toast.remove();
    workspace.markFocused();
  });

  workspace.getInjectionDiv().appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.bottom = '2rem';
  });

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const setToastTimeout = () => {
    timeout = setTimeout(() => toast.remove(), duration);
  };
  const clearToastTimeout = () => clearTimeout(timeout);
  toast.addEventListener('focusin', clearToastTimeout);
  toast.addEventListener('focusout', setToastTimeout);
  toast.addEventListener('mouseenter', clearToastTimeout);
  toast.addEventListener('mousemove', clearToastTimeout);
  toast.addEventListener('mouseleave', setToastTimeout);
  setToastTimeout();
}

function icon(innerHTML: string, style: Partial<CSSStyleDeclaration> = {}) {
  const icon = document.createElement('svg');
  assignStyle(icon, style);
  icon.innerHTML = innerHTML;
  icon.ariaHidden = 'hidden';
  return icon;
}

function infoIcon(style: Partial<CSSStyleDeclaration> = {}) {
  return icon(
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
<rect x="11" y="9" width="2" height="9" fill="currentColor"/>
<circle cx="12.0345" cy="7.03448" r="1.03448" fill="currentColor"/>
</svg>`,
    style,
  );
}

function closeIcon(style: Partial<CSSStyleDeclaration> = {}) {
  return icon(
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="19.7782" y="2.80762" width="2" height="24" transform="rotate(45 19.7782 2.80762)" fill="currentColor"/>
  <rect x="2.80762" y="4.22183" width="2" height="24" transform="rotate(-45 2.80762 4.22183)" fill="currentColor"/>
  </svg>`,
    style,
  );
}

function assignStyle(target: HTMLElement, style: Partial<CSSStyleDeclaration>) {
  return Object.assign(target.style, style);
}
