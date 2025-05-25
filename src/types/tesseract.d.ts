declare module 'tesseract.js' {
  interface RecognizeOptions {
    rectangle?: {
      top: number;
      left: number;
      width: number;
      height: number;
    };
    lang?: string;
  }

  interface WorkerOptions {
    logger?: (message: any) => void;
    errorHandler?: (error: any) => void;
  }

  interface Word {
    text: string;
    confidence: number;
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }

  interface Line {
    text: string;
    words: Word[];
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }

  interface Paragraph {
    text: string;
    lines: Line[];
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }

  interface Block {
    text: string;
    paragraphs: Paragraph[];
    bbox: {
      x0: number;
      y0: number;
      x1: number;
      y1: number;
    };
  }

  interface Page {
    text: string;
    blocks: Block[];
    confidence: number;
    lines: Line[];
    words: Word[];
  }

  interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      blocks: Block[];
      paragraphs: Paragraph[];
      lines: Line[];
      words: Word[];
    };
  }

  class Worker {
    constructor();
    load(langs?: string): Promise<Worker>;
    loadLanguage(langs: string): Promise<Worker>;
    initialize(langs: string): Promise<Worker>;
    setParameters(params: Record<string, string>): Promise<Worker>;
    recognize(image: string | HTMLImageElement, options?: RecognizeOptions): Promise<RecognizeResult>;
    detect(image: string | HTMLImageElement): Promise<any>;
    terminate(): Promise<void>;
  }

  function createWorker(lang?: string, oem?: number, options?: WorkerOptions): Promise<Worker>;
  function createScheduler(): any;
  function setLogging(logging: boolean): void;
}
