namespace Task5MovieStore.Models;

public sealed record LocaleSummary(string Id, string DisplayName, string Direction);

public sealed record MovieBatch(
    int Page,
    int PageSize,
    string Locale,
    string Direction,
    string Seed,
    IReadOnlyList<MovieItem> Items);

public sealed record MovieItem(
    long Index,
    string Title,
    IReadOnlyList<string> Actors,
    int Year,
    string Genre,
    int Likes,
    IReadOnlyList<MovieReview> Reviews,
    PosterPlan Poster,
    TrailerPlan Trailer);

public sealed record MovieReview(string Reviewer, string Text, int Rating);

public sealed record PosterPlan(
    string Layout,
    string Primary,
    string Secondary,
    string Accent,
    double Grain,
    double FocusX,
    double FocusY,
    string Motif);

public sealed record TrailerPlan(
    string Id,
    string Phrase,
    string Credit,
    double DurationSeconds,
    IReadOnlyList<TrailerScene> Scenes,
    TrailerAudio Audio);

public sealed record TrailerScene(
    string Type,
    IReadOnlyList<string> Palette,
    string Transition,
    double DurationSeconds,
    double Zoom,
    double Speed,
    double Horizon,
    IReadOnlyList<SceneElement> Elements);

public sealed record SceneElement(
    double X,
    double Y,
    double Size,
    double Depth,
    double Phase,
    double Tone);

public sealed record TrailerAudio(
    int Tempo,
    double DroneFrequency,
    double PulseFrequency,
    double HitStrength);

public sealed class LocaleDefinition
{
    public string Id { get; init; } = "";
    public string DisplayName { get; init; } = "";
    public string FakerLocale { get; init; } = "en";
    public string Direction { get; init; } = "ltr";
    public int YearMin { get; init; } = 1960;
    public int YearMax { get; init; } = 2026;
    public string[] TitlePatterns { get; init; } = [];
    public string[] Genres { get; init; } = [];
    public string[] ReviewPatterns { get; init; } = [];
    public string[] TrailerPhrases { get; init; } = [];
    public string[] CreditPatterns { get; init; } = [];
    public Dictionary<string, string[]> Words { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class TrailerDefinition
{
    public string[] SceneTypes { get; init; } = [];
    public string[] Transitions { get; init; } = [];
    public string[] PosterLayouts { get; init; } = [];
    public string[] PosterMotifs { get; init; } = [];
    public string[][] Palettes { get; init; } = [];
}
