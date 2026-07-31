# Windows packaging and Authenticode signing

MTFBWU may ship as a Windows desktop wrapper (Electron, Tauri, MSIX, or an
installed PWA). **Author metadata alone does not remove the Windows “Unknown
publisher” warning.**

## What metadata does and does not do

Updating `package.json` author fields, `manifest.webmanifest`, and the in-app
About screen improves product identity and support links. Windows SmartScreen
and UAC use the **Authenticode signature** on the shipped binary/installer — not
npm or web-manifest fields.

Unsigned or self-signed builds will still show Unknown publisher.

## Authenticode requirements (future production)

1. Obtain an appropriate **individual or organization code-signing certificate**
   from a publicly trusted CA. Do **not** buy or configure a production
   certificate in Increment 7.
2. Sign EXE / MSI / MSIX (and nested payloads as required) with Authenticode.
3. The package **Publisher** identity must **match the signing-certificate
   subject**.
4. Timestamp signatures (RFC 3161) so validity survives certificate expiry.
5. Label any **unsigned** Windows package as a **development build**.

## Self-signed certificates

Self-signed certificates are for **local development only**. They do not
establish trust for end users and must never be treated as production signing.

## Secrets

- Private keys and certificate passwords must **never** be committed to git.
- Future CI signing must use **encrypted GitHub Actions secrets** (or an HSM /
  Key Vault integration). Never echo keys into logs.

## Development vs production labeling

| Artifact                        | Label                        |
| ------------------------------- | ---------------------------- |
| Unsigned local/CI desktop build | Development build            |
| Signed production installer     | Release (publisher verified) |

## PWA / Edge install

Installed PWAs inherit browser trust. They do not receive Authenticode
signatures for the installed shortcut. Enterprise desktop distribution should
prefer a signed MSIX or managed policy.

## References

- [Microsoft: Sign your app for Windows](https://learn.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Authenticode overview](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/authenticode)
