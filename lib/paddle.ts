import {
  initializePaddle,
  type Paddle,
  type CheckoutOpenOptions,
} from "@paddle/paddle-js";

let _paddle: Paddle | undefined;

export async function initPaddle(): Promise<void> {
  if (_paddle) return;
  const env =
    process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true" ? "sandbox" : "production";
  _paddle = await initializePaddle({
    environment: env,
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
  });
}

export function openCheckout(options: CheckoutOpenOptions): void {
  _paddle?.Checkout.open(options);
}
