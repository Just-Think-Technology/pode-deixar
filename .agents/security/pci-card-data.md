# Card Data (PCI-DSS)

**Never store, accept, log or echo card PAN/CVV.** Card data only travels
from the client straight to the payment gateway (tokenization).

## Rules for any feature

- **Do not store** full card numbers, CVV, passwords or PINs in database, cache or logs
- **Do not accept** card data in the backend — the backend only sees the gateway token/transaction ID, never the PAN
- **Always use** gateway tokenization (e.g. Mercado Pago card token via the official SDK/Bricks) or hosted checkout
- **Sanitize logs** — interceptors/filters must strip card numbers and CVV
- Gateway responses/errors **must never** echo card fields back

See also [Payments](../decisions/payments.md) for the current PIX/credit-card
status and the tokenization path for real credit cards.
