type BootstrapModalApi = {
  getInstance: (element: Element) => { hide: () => void } | null;
  getOrCreateInstance: (
    element: Element,
    config?: { backdrop?: boolean | "static"; keyboard?: boolean },
  ) => {
    hide: () => void;
    show: () => void;
  };
};

type BootstrapWindow = Window & {
  bootstrap?: {
    Modal: BootstrapModalApi & (new (element: Element) => { show: () => void });
  };
};

export async function getModalInstance(
  element: Element,
  config?: { backdrop?: boolean | "static"; keyboard?: boolean },
) {
  const fromWindow = (window as BootstrapWindow).bootstrap?.Modal;
  if (fromWindow) {
    return (fromWindow.getOrCreateInstance as unknown as (
      el: Element,
      cfg?: { backdrop?: boolean | "static"; keyboard?: boolean },
    ) => { hide: () => void; show: () => void })(element, config);
  }
  const bootstrapModule = await import("bootstrap");
  return (bootstrapModule.Modal.getOrCreateInstance as unknown as (
    el: HTMLElement,
    cfg?: { backdrop?: boolean | "static"; keyboard?: boolean },
  ) => { hide: () => void; show: () => void })(
    element as HTMLElement,
    config,
  );
}

export async function hideModalAndWaitForClose(modalId: string) {
  const element = document.getElementById(modalId);
  if (!element) return;

  const modalApi = await getModalInstance(element);
  if (!element.classList.contains("show")) {
    modalApi.hide();
    return;
  }

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const onHidden = () => finish();
    element.addEventListener("hidden.bs.modal", onHidden, { once: true });
    const dismissBtn = element.querySelector<HTMLButtonElement>(
      '[data-bs-dismiss="modal"]',
    );
    if (dismissBtn) {
      dismissBtn.click();
    } else {
      modalApi.hide();
    }

    window.setTimeout(() => {
      if (!done) {
        modalApi.hide();
        finish();
      }
    }, 700);
  });
}
