using System.Text.Json;
using Task5MovieStore.Models;

namespace Task5MovieStore.Services;

public sealed class LocaleCatalog
{
    private readonly IReadOnlyDictionary<string, LocaleDefinition> _definitions;

    public LocaleCatalog(IWebHostEnvironment environment)
    {
        var directory = Path.Combine(environment.ContentRootPath, "Resources", "locales");
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var definitions = Directory
            .EnumerateFiles(directory, "*.json", SearchOption.TopDirectoryOnly)
            .Select(path => JsonSerializer.Deserialize<LocaleDefinition>(File.ReadAllText(path), options))
            .OfType<LocaleDefinition>()
            .Where(definition => !string.IsNullOrWhiteSpace(definition.Id))
            .ToDictionary(definition => definition.Id, StringComparer.OrdinalIgnoreCase);

        if (definitions.Count < 2)
        {
            throw new InvalidOperationException("At least two locale resources are required.");
        }

        _definitions = definitions;
    }

    public IReadOnlyList<LocaleSummary> Summaries => _definitions.Values
        .OrderBy(definition => definition.Id, StringComparer.Ordinal)
        .Select(definition => new LocaleSummary(definition.Id, definition.DisplayName, definition.Direction))
        .ToArray();

    public bool TryGet(string id, out LocaleDefinition definition) =>
        _definitions.TryGetValue(id, out definition!);
}
