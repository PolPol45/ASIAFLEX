import { PriceSample, Provider } from "./Provider";

export class MockProvider implements Provider {
  readonly name: string;

  private readonly samples: Map<string, PriceSample | null>;

  constructor(
    name: string,
    samples: Record<string, PriceSample | null>,
    private readonly options: { delayMs?: number } = {}
  ) {
    this.name = name;
    this.samples = new Map(Object.entries(samples).map(([key, value]) => [key.toUpperCase(), value]));
  }

  async get(symbol: string): Promise<PriceSample | null> {
    const upper = symbol.toUpperCase();
    if (this.options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
    }
    return this.samples.get(upper) ?? null;
  }
}

export default MockProvider;
