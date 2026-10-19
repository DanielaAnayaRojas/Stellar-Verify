# Evidencia: credenciales de demostración en testnet (producción)

Sitio: https://stellar-verify.vercel.app (red de pruebas, sin valor legal)
Emitidas el 18 y el 19 de octubre de 2026 con la capa de firma del emisor activa (SIGNATURE_LAYER=on), por la API de ACTA.

## Credenciales

| # | Archivo | Curso registrado | Estado actual |
|---|---|---|---|
| 1 | `diploma-demo-1.txt` | Técnico en análisis de datos | Válida |
| 2 | `certificado-demo-2.txt` | (error de captura: se escribió la dirección del sitio en lugar del curso) | Revocada, reemplazada por la 4 |
| 3 | `constancia-demo-3.txt` | Atención al cliente digital | Revocada |
| 4 | `certificado-demo-4.txt` | Introducción a la ciberseguridad | Válida |

La credencial 2 se emitió con un error en el campo "Curso". Como una credencial emitida no se puede editar, se revocó y se emitió la 4 con el mismo documento de ejemplo y el curso correcto. La 2 queda en el registro como evidencia de una revocación real.

## Enlaces de verificación
1. https://stellar-verify.vercel.app/verificar/ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f
2. https://stellar-verify.vercel.app/verificar/9e8a0165c6f069807e87d678b66ded6d8754677fa25b3a974b8da3933eebab03
3. https://stellar-verify.vercel.app/verificar/0e2edd6751fb77d33784b198fc953fbe592fdeff3dbb1c0bcf152c5d9f39f17a
4. https://stellar-verify.vercel.app/verificar/b07e89fc32382013cc093a448105d00b8e9afce14759b10fd192cd1275e6d55d

## Transacciones en el explorador (Stellar Expert, testnet)

| # | Operación | Fecha (UTC) | Transacción |
|---|---|---|---|
| 1 | Emisión | 2026-10-18 20:30 | https://stellar.expert/explorer/testnet/tx/ded02463e9e3bc96bcfc7ebddd8fbb8da927fe38cf8131d1d35106aabd25c193 |
| 2 | Emisión | 2026-10-18 20:49 | https://stellar.expert/explorer/testnet/tx/3dce878e9393e6d9eba02c752c347435567fc1b5a31ff7c0482f467f2536e2e1 |
| 2 | Revocación | 2026-10-19 20:04 | https://stellar.expert/explorer/testnet/tx/ad6c6b2548f0e4f7a0adfcccb2f0092c45cfae3dbe7d3cebcffe9f0a2b5eb194 |
| 3 | Emisión | 2026-10-18 20:55 | https://stellar.expert/explorer/testnet/tx/2ab4cb1516b9a59f3206ef54e2ce7d78b494a284cfcf9f4d1b1a2a4467b427e4 |
| 3 | Revocación | 2026-10-18 20:57 | https://stellar.expert/explorer/testnet/tx/fc945660eb88435ff440e302e2e2f2c92dd2d423db6cbea035cfd814098aad96 |
| 4 | Emisión | 2026-10-19 19:53 | https://stellar.expert/explorer/testnet/tx/61b6e8873616b8836811f5fc28c144e5ea3898b2a75b4b6b9ea8a4e42b823c88 |

Todas las operaciones del registro de la institución (el contrato de la bóveda) se pueden ver juntas aquí:
https://stellar.expert/explorer/testnet/contract/CABXSPQQ32TS74EM52DGAQLXCWZWYPRECUJ5C2BN3G6GWTH4PU3TPI7W

## Huellas (SHA-256 de cada archivo de `frontend/public/ejemplos/`)
1. ba0f8b380ea55ce5a8b53c1a66b38ec5d0fe468dc7a91a890c26d2fafaf40a5f
2. 9e8a0165c6f069807e87d678b66ded6d8754677fa25b3a974b8da3933eebab03
3. 0e2edd6751fb77d33784b198fc953fbe592fdeff3dbb1c0bcf152c5d9f39f17a
4. b07e89fc32382013cc093a448105d00b8e9afce14759b10fd192cd1275e6d55d
