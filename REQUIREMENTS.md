# Task 5 requirement map

This file points to the implementation of each important requirement so the project can be reviewed quickly.

| Requirement | Implementation |
| --- | --- |
| Single page movie catalogue | `wwwroot/index.html` and `wwwroot/js/app.js` |
| English USA and Arabic Saudi data | `Resources/locales/en_US.json` and `Resources/locales/ar_SA.json` |
| Third party fake data library | Bogus package in `Task5MovieStore.csproj` and `MovieGenerator.cs` |
| Custom 48 bit seed and random seed | `Program.cs`, `StableRandom.cs`, and the seed controls in `app.js` |
| Deterministic results | `StableRandom.cs` and separate streams in `MovieGenerator.cs` |
| Fractional likes and reviews | `SampleAverage` in `MovieGenerator.cs` |
| Paginated table | `loadTablePage` and `renderTable` in `app.js` |
| Infinite gallery | `IntersectionObserver` and `loadNextGalleryPage` in `app.js` |
| Reset after a parameter change | `resetForParameters` in `app.js` |
| Expandable details | `createDetailRow` and `createGalleryCard` in `app.js` |
| Server generated trailer plan | `GenerateTrailer` in `MovieGenerator.cs` |
| Browser trailer playback | `wwwroot/js/trailer.js` |
| Locale content outside code | JSON files under `Resources/locales` |
| One page or batch per request | `/api/movies` in `Program.cs` |
| No database and no authentication | In memory generator registered in `Program.cs` |
| Automated deterministic checks | `tests/Task5MovieStore.SmokeTests` |
