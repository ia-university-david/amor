#!/usr/bin/env node
// Generates a VAPID key pair for Web Push. Copy both values into your
// environment (.env or the hosting dashboard). Never commit the private key.
import * as webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('# Claves VAPID para notificaciones push. NO subas la privada al repositorio.');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('VAPID_SUBJECT=mailto:hola@amortoxico.com');
