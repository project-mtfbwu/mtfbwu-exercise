# Imports module

## Owns

AI/file import jobs, proposals, provenance, review promotion.

## Must not own

Silent auto-commit of untrusted data.

## Planned entities

AiImportJob, AiImportProposal

## External dependencies (later)

Shared kernel only in Increment 1. Domain APIs/libraries are deferred.

## Templates vs performed

Imports promote to draft templates — never auto-complete sessions.

## Status

Increment 1: placeholder module boundary only — no domain behavior.
