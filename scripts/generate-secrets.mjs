#!/usr/bin/env node
// Prints fresh random secrets for the server. Copy them into your environment.
// Never commit them and never reuse them between environments.
import { randomBytes } from 'node:crypto';

console.log('# Secretos generados el', new Date().toISOString());
console.log('# DATA_ENCRYPTION_KEY cifra los datos sincronizados en la base de datos.');
console.log('# Si la pierdes, esos datos no se pueden recuperar: guárdala también en un gestor de contraseñas.');
console.log(`DATA_ENCRYPTION_KEY=${randomBytes(32).toString('base64')}`);
