# Order Model

| Order | Material | Batch | Target | Line |
| --- | --- | --- | --- | --- |
| PO-DP-100001 | DP-AUTOINJECTOR-100MG | DPB-260823-001 | 50,000 | DP-L01 |
| PO-AI-100002 | AUTOINJECTOR-DEVICE | AIB-260823-001 | 48,500 | AI-L01 |
| PO-PKG-100003 | FG-AUTOINJECTOR-100MG | FGB-260823-001 | 48,000 | PKG-L01 |

Links: DP → AI → PKG via `linkedUpstream` / `linkedDownstream`.

Published on `uns/.../orders/{orderId}/state`.
