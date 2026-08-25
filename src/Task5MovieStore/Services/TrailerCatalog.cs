using System.Text.Json;
using Task5MovieStore.Models;

namespace Task5MovieStore.Services;

public sealed class TrailerCatalog
{
    public TrailerDefinition Definition { get; }

    public TrailerCatalog(IWebHostEnvironment environment)
    {
        var path = Path.Combine(environment.ContentRootPath, "Resources", "trailers.json");
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        Definition = JsonSerializer.Deserialize<TrailerDefinition>(File.ReadAllText(path), options)
            ?? throw new InvalidOperationException("Trailer resources could not be loaded.");

        if (Definition.SceneTypes.Length == 0 || Definition.Palettes.Length == 0)
        {
            throw new InvalidOperationException("Trailer resources are incomplete.");
        }
    }
}
