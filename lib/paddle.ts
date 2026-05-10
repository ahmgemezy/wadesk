import {
  initializePaddle,
  type Paddle,
  type CheckoutOpenOptions,
} from "@paddle/paddle-js";

let _paddle: Paddle | undefined;
let _onComplete: (() => void) | undefined;

export async function initPaddle(): Promise<void> {
  if (_paddle) return;
  const env =
    process.env.NEXT_PUBLIC_PADDLE_SANDBOX === "true" ? "sandbox" : "production";
  _paddle = await initializePaddle({
    environment: env,
    token: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!,
    eventCallback(event) {
      if (event.name === "checkout.completed") {
        const cb = _onComplete;
        _onComplete = undefined;
        _paddle?.Checkout.close();
        // Delay so the toast renders after the overlay finishes closing
        setTimeout(() => cb?.(), 350);
      }
    },
  });
}

export function openCheckout(
  options: CheckoutOpenOptions & { onComplete?: () => void }
): void {
  const { onComplete, ...paddleOptions } = options;
  _onComplete = onComplete;
  _paddle?.Checkout.open(paddleOptions);
}
