using System.Security.Cryptography;
using Microsoft.AspNetCore.Http.Json;
using Microsoft.Net.Http.Headers;
using Task5MovieStore.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddSingleton<LocaleCatalog>();
builder.Services.AddSingleton<TrailerCatalog>();
builder.Services.AddSingleton<MovieGenerator>();

var app = builder.Build();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Cross-Origin-Opener-Policy"] = "same-origin";
    context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()";
    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = context =>
    {
        context.Context.Response.Headers[HeaderNames.CacheControl] = "no-cache";
    }
});

app.MapGet("/health", () => Results.Text("ok", "text/plain"));

app.MapGet("/api/locales", (LocaleCatalog catalog) => Results.Ok(catalog.Summaries));

app.MapGet("/api/seed", () =>
{
    Span<byte> bytes = stackalloc byte[8];
    RandomNumberGenerator.Fill(bytes);
    var value = BitConverter.ToUInt64(bytes) & 0x0000FFFFFFFFFFFFUL;
    return Results.Ok(new { seed = value.ToString() });
});

app.MapGet("/api/movies", (
    string? locale,
    string? seed,
    double likes,
    double reviews,
    int page,
    int pageSize,
    LocaleCatalog catalog,
    MovieGenerator generator) =>
{
    var selectedLocale = string.IsNullOrWhiteSpace(locale) ? "en_US" : locale.Trim();
    if (!catalog.TryGet(selectedLocale, out _))
    {
        return Results.BadRequest(new { error = "Unsupported locale." });
    }

    if (!ulong.TryParse(seed, out var parsedSeed) || parsedSeed > 0x0000FFFFFFFFFFFFUL)
    {
        return Results.BadRequest(new { error = "Seed must be an unsigned 48 bit decimal value." });
    }

    if (double.IsNaN(likes) || likes is < 0 or > 10 ||
        double.IsNaN(reviews) || reviews is < 0 or > 10)
    {
        return Results.BadRequest(new { error = "Likes and reviews must be between 0 and 10." });
    }

    if (page < 1 || pageSize is < 1 or > 24)
    {
        return Results.BadRequest(new { error = "Invalid page request." });
    }

    return Results.Ok(generator.Generate(selectedLocale, parsedSeed, likes, reviews, page, pageSize));
});

app.MapFallbackToFile("index.html");

app.Run();

public partial class Program
{
}
