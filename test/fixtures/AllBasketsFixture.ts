export type FixtureResult = never;

export async function deployAllBasketsFixture(): Promise<FixtureResult> {
  throw new Error("deployAllBasketsFixture() has been removed. Use BasketFixture.deployBasketSystemFixture instead.");
}
