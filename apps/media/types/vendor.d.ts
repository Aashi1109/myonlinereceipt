declare module "qpdf-wasm" {
  type QpdfFileSystem = {
    readFile(path: string): Uint8Array;
    unlink(path: string): void;
    writeFile(path: string, data: Uint8Array): void;
  };

  type QpdfModule = {
    FS: QpdfFileSystem;
    callMain(arguments_: string[]): number;
  };

  export default function createQpdf(options: {
    locateFile(file: string): string;
    noInitialRun: boolean;
    print?(message: string): void;
    printErr?(message: string): void;
  }): Promise<QpdfModule>;
}

declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export * from "pdfjs-dist";
}
