declare module "klaro/dist/klaro-no-css" {
  const Klaro: {
    setup: (config: unknown) => void;
    show: (config?: unknown, modal?: boolean) => void;
    getManager: (config?: unknown) => unknown;
  };
  export = Klaro;
}
