# Changelog

## [0.1.3] - 2025-11-28

### Changed

- Track methods are now fire-and-forget (non-blocking)
- Methods return `void` instead of `Promise<void>`
- Analytics calls no longer block app execution

## [0.1.2] - 2025-11-28

### Added

- Full JSDoc documentation for all exports
- Module-level documentation with examples
- Examples for all public methods

## [0.1.1] - 2025-11-28

### Fixed

- Added missing license field for JSR publishing

## [0.1.0] - 2025-11-28

Initial release.

### Added

- `AnalyticsClient` class for tracking events
- `deriveUidFromDid` helper for anonymous user ID generation
- Support for account, view, and action events
