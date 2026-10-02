"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyCashfreeWebhookSignature = verifyCashfreeWebhookSignature;
const node_crypto_1 = require("node:crypto");
function verifyCashfreeWebhookSignature(secret, timestamp, rawBody, receivedSignature) {
    if (!timestamp || !rawBody || !receivedSignature)
        return false;
    const expected = (0, node_crypto_1.createHmac)('sha256', secret)
        .update(Buffer.concat([Buffer.from(timestamp, 'utf8'), rawBody]))
        .digest();
    let actual;
    try {
        actual = Buffer.from(receivedSignature, 'base64');
    }
    catch {
        return false;
    }
    return actual.length === expected.length && (0, node_crypto_1.timingSafeEqual)(actual, expected);
}
//# sourceMappingURL=webhook-signature.js.map