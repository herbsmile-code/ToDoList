/**
 * ToDoList JY - Zero-Knowledge E2EE Security Engine (crypto.js)
 * Phase 1 Modularization: AES-GCM 256-bit End-to-End Encryption & Key Derivation
 */

(function(window) {
  'use strict';

  class E2EESecurityEngine {
    static keyCache = new Map();

    static async deriveKey(pin) {
      if (!pin) throw new Error('PIN is required');
      if (this.keyCache.has(pin)) {
        return this.keyCache.get(pin);
      }
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error('Web Crypto API not available');
      }
      const enc = new TextEncoder();
      const salt = enc.encode('zentask_e2ee_salt_jy_2026_secure');
      const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        enc.encode(pin + '_e2ee_pepper_2026'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      this.keyCache.set(pin, derivedKey);
      return derivedKey;
    }

    static arrayBufferToBase64(buffer) {
      const bytes = new Uint8Array(buffer);
      const parts = [];
      // A multiple of three avoids padding between parts and bounds temporary
      // strings/call arguments while encoding multi-megabyte attachments.
      for (let i = 0; i < bytes.length; i += 24576) {
        parts.push(btoa(String.fromCharCode(...bytes.subarray(i,i + 24576))));
      }
      return parts.join('');
    }

    static base64ToArrayBuffer(base64) {
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    static async encrypt(dataObj, pin) {
      try {
        const key = await this.deriveKey(pin);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const jsonStr = JSON.stringify(dataObj);
        const encodedData = new TextEncoder().encode(jsonStr);

        const cipherBuffer = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encodedData
        );

        const payload = this.arrayBufferToBase64(cipherBuffer);
        const envelope = {
          isEncrypted: true,
          v: 2,
          iv: this.arrayBufferToBase64(iv.buffer),
          payload,
          updatedAt: dataObj.updatedAt || Date.now()
        };
        // RTDB limits each string to 10 MB. Keep the same authenticated cipher
        // bytes, split only their transport representation, and PUT the entire
        // envelope atomically under the existing ETag. No record is truncated.
        if (payload.length > 8 * 1024 * 1024) {
          envelope.v = 3;
          envelope.payloadLength = payload.length;
          envelope.payload = [];
          for (let i = 0; i < payload.length; i += 1024 * 1024) envelope.payload.push(payload.slice(i,i + 1024 * 1024));
        }
        return envelope;
      } catch (err) {
        console.error('E2EE Encryption error:', err);
        return {
          ...dataObj,
          updatedAt: dataObj.updatedAt || Date.now()
        };
      }
    }

    static async decrypt(cloudData, pin) {
      if (!cloudData || typeof cloudData !== 'object') return null;

      // 1. If data is NOT encrypted (legacy plain format), return as is for auto-migration
      if (!cloudData.isEncrypted) {
        return cloudData;
      }

      try {
        if (typeof cloudData.iv !== 'string' || !cloudData.iv) throw new Error('Incomplete encrypted data');
        let payload = cloudData.payload;
        if (cloudData.v === 3) {
          if (!Array.isArray(payload) || payload.length < 2 || !Number.isSafeInteger(cloudData.payloadLength)) throw new Error('Invalid encrypted parts');
          let length = 0;
          for (let i = 0; i < payload.length; i++) {
            const part = payload[i];
            if (typeof part !== 'string' || !part.length || part.length > 1024 * 1024 ||
                i < payload.length - 1 && part.length !== 1024 * 1024) throw new Error('Missing encrypted part');
            length += part.length;
          }
          if (length !== cloudData.payloadLength) throw new Error('Incomplete encrypted parts');
          payload = payload.join('');
        }
        if (typeof payload !== 'string' || !payload) throw new Error('Invalid encrypted payload');
        const key = await this.deriveKey(pin);
        const ivBuffer = this.base64ToArrayBuffer(cloudData.iv);
        const cipherBuffer = this.base64ToArrayBuffer(payload);

        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) },
          key,
          cipherBuffer
        );

        const jsonStr = new TextDecoder().decode(decryptedBuffer);
        const parsed = JSON.parse(jsonStr);
        parsed.updatedAt = cloudData.updatedAt || parsed.updatedAt || Date.now();
        parsed._wasEncrypted = true;
        return parsed;
      } catch (err) {
        console.warn('E2EE Decryption failed (invalid PIN or corrupted data):', err);
        throw new Error('DECRYPT_FAILED');
      }
    }
  }

  // Export to Global Window Namespace
  window.E2EESecurityEngine = E2EESecurityEngine;

})(window);
