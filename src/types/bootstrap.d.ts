declare module "bootstrap" {
  export class Modal {
    constructor(element: HTMLElement, options?: Record<string, unknown>);
    show(): void;
    hide(): void;
    static getOrCreateInstance(element: HTMLElement): Modal;
  }
}

