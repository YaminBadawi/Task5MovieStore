using Bogus;
using Task5MovieStore.Models;

namespace Task5MovieStore.Services;

public sealed class MovieGenerator
{
    private readonly LocaleCatalog _locales;
    private readonly TrailerDefinition _trailer;

    public MovieGenerator(LocaleCatalog locales, TrailerCatalog trailerCatalog)
    {
        _locales = locales;
        _trailer = trailerCatalog.Definition;
    }

    public MovieBatch Generate(
        string localeId,
        ulong seed,
        double averageLikes,
        double averageReviews,
        int page,
        int pageSize)
    {
        if (!_locales.TryGet(localeId, out var locale))
        {
            throw new ArgumentException("Unsupported locale.", nameof(localeId));
        }

        var items = new MovieItem[pageSize];
        var pageSeed = StableRandom.Derive(seed, locale.Id, "page", page);

        for (var position = 0; position < pageSize; position++)
        {
            var index = ((long)page - 1L) * pageSize + position + 1L;
            items[position] = GenerateMovie(
                locale,
                seed,
                pageSeed,
                page,
                position,
                index,
                averageLikes,
                averageReviews);
        }

        return new MovieBatch(page, pageSize, locale.Id, locale.Direction, seed.ToString(), items);
    }

    private MovieItem GenerateMovie(
        LocaleDefinition locale,
        ulong userSeed,
        ulong pageSeed,
        int page,
        int position,
        long index,
        double averageLikes,
        double averageReviews)
    {
        var coreSeed = StableRandom.Derive(pageSeed, "core", position, index);
        var coreRandom = new StableRandom(coreSeed);
        var faker = new Faker(locale.FakerLocale)
        {
            Random = new Randomizer(StableRandom.ToBogusSeed(coreSeed))
        };

        var titlePattern = coreRandom.Pick(locale.TitlePatterns);
        var title = TemplateComposer.Compose(titlePattern, locale.Words, coreRandom);
        var genre = coreRandom.Pick(locale.Genres);
        var year = coreRandom.NextInt(locale.YearMin, locale.YearMax + 1);
        var actors = GenerateNames(faker, coreRandom.NextInt(2, 6));

        var likesSeed = StableRandom.Derive(userSeed, locale.Id, page, position, index, "likes");
        var reviewSeed = StableRandom.Derive(userSeed, locale.Id, page, position, index, "reviews");
        var likes = SampleAverage(averageLikes, new StableRandom(likesSeed));
        var reviewCount = SampleAverage(averageReviews, new StableRandom(reviewSeed));
        var reviews = GenerateReviews(locale, reviewSeed, reviewCount);
        var poster = GeneratePoster(coreRandom);
        var trailer = GenerateTrailer(locale, coreRandom, title, actors, year, coreSeed);

        return new MovieItem(index, title, actors, year, genre, likes, reviews, poster, trailer);
    }

    private static IReadOnlyList<string> GenerateNames(Faker faker, int count)
    {
        var names = new List<string>(count);
        for (var attempt = 0; names.Count < count && attempt < count * 8; attempt++)
        {
            var name = faker.Name.FullName().Trim();
            if (!string.IsNullOrWhiteSpace(name) &&
                !names.Contains(name, StringComparer.OrdinalIgnoreCase))
            {
                names.Add(name);
            }
        }

        return names;
    }

    private static int SampleAverage(double average, StableRandom random)
    {
        var limited = Math.Clamp(average, 0, 10);
        var whole = (int)Math.Floor(limited);
        var fraction = limited - whole;
        return whole + (random.Chance(fraction) ? 1 : 0);
    }

    private static IReadOnlyList<MovieReview> GenerateReviews(
        LocaleDefinition locale,
        ulong reviewSeed,
        int count)
    {
        var reviews = new MovieReview[count];
        for (var reviewIndex = 0; reviewIndex < count; reviewIndex++)
        {
            var itemSeed = StableRandom.Derive(reviewSeed, "review", reviewIndex);
            var random = new StableRandom(itemSeed);
            var faker = new Faker(locale.FakerLocale)
            {
                Random = new Randomizer(StableRandom.ToBogusSeed(itemSeed))
            };
            var pattern = random.Pick(locale.ReviewPatterns);
            var text = TemplateComposer.Compose(pattern, locale.Words, random);
            reviews[reviewIndex] = new MovieReview(faker.Name.FullName(), text, random.NextInt(2, 6));
        }

        return reviews;
    }

    private PosterPlan GeneratePoster(StableRandom random)
    {
        var palette = random.Pick(_trailer.Palettes);
        return new PosterPlan(
            random.Pick(_trailer.PosterLayouts),
            palette[0],
            palette[1],
            palette[2],
            Math.Round(0.08 + random.NextDouble() * 0.22, 3),
            Math.Round(0.18 + random.NextDouble() * 0.64, 3),
            Math.Round(0.18 + random.NextDouble() * 0.64, 3),
            random.Pick(_trailer.PosterMotifs));
    }

    private TrailerPlan GenerateTrailer(
        LocaleDefinition locale,
        StableRandom random,
        string title,
        IReadOnlyList<string> actors,
        int year,
        ulong coreSeed)
    {
        var context = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["title"] = title,
            ["actor"] = actors.FirstOrDefault() ?? "",
            ["year"] = year.ToString()
        };
        var phrase = TemplateComposer.Compose(random.Pick(locale.TrailerPhrases), locale.Words, random, context);
        var credit = TemplateComposer.Compose(random.Pick(locale.CreditPatterns), locale.Words, random, context);
        var sceneCount = random.NextInt(3, 6);
        var scenes = new TrailerScene[sceneCount];
        var totalDuration = 0.0;

        for (var sceneIndex = 0; sceneIndex < sceneCount; sceneIndex++)
        {
            var duration = Math.Round(0.9 + random.NextDouble() * 0.7, 2);
            totalDuration += duration;
            var elementCount = random.NextInt(14, 30);
            var elements = new SceneElement[elementCount];
            for (var elementIndex = 0; elementIndex < elementCount; elementIndex++)
            {
                elements[elementIndex] = new SceneElement(
                    Math.Round(random.NextDouble(), 4),
                    Math.Round(random.NextDouble(), 4),
                    Math.Round(0.08 + random.NextDouble() * 0.92, 4),
                    Math.Round(0.12 + random.NextDouble() * 0.88, 4),
                    Math.Round(random.NextDouble() * Math.PI * 2, 4),
                    Math.Round(random.NextDouble(), 4));
            }

            scenes[sceneIndex] = new TrailerScene(
                random.Pick(_trailer.SceneTypes),
                random.Pick(_trailer.Palettes),
                random.Pick(_trailer.Transitions),
                duration,
                Math.Round(1.02 + random.NextDouble() * 0.18, 3),
                Math.Round(0.55 + random.NextDouble() * 1.1, 3),
                Math.Round(0.34 + random.NextDouble() * 0.34, 3),
                elements);
        }

        var durationSeconds = Math.Round(Math.Clamp(totalDuration + 2.1, 5, 10), 2);
        var audio = new TrailerAudio(
            random.NextInt(68, 126),
            Math.Round(44 + random.NextDouble() * 52, 2),
            Math.Round(110 + random.NextDouble() * 150, 2),
            Math.Round(0.3 + random.NextDouble() * 0.5, 3));

        return new TrailerPlan(
            coreSeed.ToString("x16"),
            phrase,
            credit,
            durationSeconds,
            scenes,
            audio);
    }
}
