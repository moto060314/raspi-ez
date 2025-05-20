export {};

declare global {
  interface Window {
    Electron: {
      ipcRenderer: {
        invoke(channel: string, args?: any): Promise<any>;
        on(
          channel: string,
          listener: (event: any, ...args: any[]) => void
        ): void;
      };
    };
  }
}
