using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Task5MovieStore.Models;
using Task5MovieStore.Services;

var projectRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "src", "Task5MovieStore"));
var environment = new TestEnvironment(projectRoot);
var locales = new LocaleCatalog(environment);
var trailers = new TrailerCatalog(environment);
var generator = new MovieGenerator(locales, trailers);

Run("same request is identical", () =>
{
    var first = generator.Generate("en_US", 281474976710001UL, 3.5, 2.5, 1, 12);
    var second = generator.Generate("en_US", 281474976710001UL, 3.5, 2.5, 1, 12);
    Equal(Json(first), Json(second));
});

Run("likes change only likes", () =>
{
    var low = generator.Generate("en_US", 987654321011UL, 1, 3, 2, 12);
    var high = generator.Generate("en_US", 987654321011UL, 9, 3, 2, 12);
    for (var index = 0; index < low.Items.Count; index++)
    {
        Equal(Json(low.Items[index] with { Likes = 0 }), Json(high.Items[index] with { Likes = 0 }));
        Equal(1, low.Items[index].Likes);
        Equal(9, high.Items[index].Likes);
    }
});

Run("reviews preserve existing content", () =>
{
    var shortList = generator.Generate("en_US", 667788990011UL, 4, 2, 1, 12);
    var longList = generator.Generate("en_US", 667788990011UL, 4, 7, 1, 12);
    for (var index = 0; index < shortList.Items.Count; index++)
    {
        var first = shortList.Items[index];
        var second = longList.Items[index];
        Equal(Json(first with { Reviews = [] }), Json(second with { Reviews = [] }));
        Equal(Json(first.Reviews), Json(second.Reviews.Take(first.Reviews.Count).ToArray()));
    }
});

Run("seed and locale change the generated core", () =>
{
    var original = generator.Generate("en_US", 100000000001UL, 4, 3, 1, 12);
    var anotherSeed = generator.Generate("en_US", 100000000002UL, 4, 3, 1, 12);
    var anotherLocale = generator.Generate("ar_SA", 100000000001UL, 4, 3, 1, 12);
    NotEqual(original.Items[0].Title, anotherSeed.Items[0].Title);
    NotEqual(original.Items[0].Trailer.Id, anotherSeed.Items[0].Trailer.Id);
    NotEqual(original.Items[0].Title, anotherLocale.Items[0].Title);
    NotEqual(original.Items[0].Trailer.Id, anotherLocale.Items[0].Trailer.Id);
});

Run("fractional averages are probabilistic", () =>
{
    var counts = new List<int>();
    for (var page = 1; page <= 60; page++)
    {
        counts.AddRange(generator.Generate("en_US", 444455556666UL, 0.5, 0, page, 24).Items.Select(item => item.Likes));
    }

    True(counts.All(value => value is 0 or 1), "A 0.5 average must produce only zero or one.");
    var average = counts.Average();
    True(average is > 0.43 and < 0.57, $"Observed average {average:F3} is too far from 0.5.");
});

Run("sequence continues across pages", () =>
{
    var page = generator.Generate("en_US", 223344556677UL, 2, 2, 3, 12);
    Equal(25L, page.Items.First().Index);
    Equal(36L, page.Items.Last().Index);
});

Run("records contain complete cast and playable trailers", () =>
{
    var page = generator.Generate("ar_SA", 123456789012UL, 4.5, 2.5, 1, 12);
    foreach (var movie in page.Items)
    {
        True(movie.Actors.Count is >= 2 and <= 5, "Each movie needs between two and five actors.");
        Equal(movie.Actors.Count, movie.Actors.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        True(movie.Trailer.DurationSeconds is >= 5 and <= 10, "Trailer duration is outside the required range.");
        True(movie.Trailer.Scenes.Count >= 3, "A trailer needs a coherent scene sequence.");
    }
});

Console.WriteLine("All deterministic generator checks passed.");

static void Run(string name, Action test)
{
    try
    {
        test();
        Console.WriteLine($"PASS  {name}");
    }
    catch (Exception exception)
    {
        Console.Error.WriteLine($"FAIL  {name}: {exception.Message}");
        Environment.ExitCode = 1;
    }
}

static string Json<T>(T value) => JsonSerializer.Serialize(value);

static void Equal<T>(T expected, T actual)
{
    if (!EqualityComparer<T>.Default.Equals(expected, actual))
    {
        throw new InvalidOperationException($"Expected {expected}, received {actual}.");
    }
}

static void NotEqual<T>(T first, T second)
{
    if (EqualityComparer<T>.Default.Equals(first, second))
    {
        throw new InvalidOperationException($"Expected values to differ, both were {first}.");
    }
}

static void True(bool value, string message)
{
    if (!value) throw new InvalidOperationException(message);
}

file sealed class TestEnvironment(string root) : IWebHostEnvironment
{
    public string ApplicationName { get; set; } = "Task5MovieStore.SmokeTests";
    public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    public string WebRootPath { get; set; } = Path.Combine(root, "wwwroot");
    public string EnvironmentName { get; set; } = "Development";
    public string ContentRootPath { get; set; } = root;
    public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(root);
}
