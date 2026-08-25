using System.Text.RegularExpressions;

namespace Task5MovieStore.Services;

public static partial class TemplateComposer
{
    public static string Compose(
        string pattern,
        IReadOnlyDictionary<string, string[]> words,
        StableRandom random,
        IReadOnlyDictionary<string, string>? context = null)
    {
        return TokenPattern().Replace(pattern, match =>
        {
            var key = match.Groups[1].Value;
            if (context is not null && context.TryGetValue(key, out var value))
            {
                return value;
            }

            return words.TryGetValue(key, out var values) && values.Length > 0
                ? random.Pick(values)
                : match.Value;
        });
    }

    [GeneratedRegex("\\{([A-Za-z0-9_]+)\\}", RegexOptions.CultureInvariant)]
    private static partial Regex TokenPattern();
}
