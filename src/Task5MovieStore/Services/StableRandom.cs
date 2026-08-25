using System.Globalization;
using System.Text;

namespace Task5MovieStore.Services;

public sealed class StableRandom
{
    private ulong _state;

    public StableRandom(ulong seed)
    {
        _state = seed;
    }

    public ulong NextUInt64()
    {
        _state += 0x9E3779B97F4A7C15UL;
        var value = _state;
        value = (value ^ (value >> 30)) * 0xBF58476D1CE4E5B9UL;
        value = (value ^ (value >> 27)) * 0x94D049BB133111EBUL;
        return value ^ (value >> 31);
    }

    public int NextInt(int minimum, int maximumExclusive)
    {
        if (maximumExclusive <= minimum)
        {
            return minimum;
        }

        var range = (ulong)(maximumExclusive - minimum);
        return minimum + (int)(NextUInt64() % range);
    }

    public double NextDouble() => (NextUInt64() >> 11) * (1.0 / (1UL << 53));

    public bool Chance(double probability) => NextDouble() < Math.Clamp(probability, 0, 1);

    public T Pick<T>(IReadOnlyList<T> values)
    {
        if (values.Count == 0)
        {
            throw new InvalidOperationException("Cannot select from an empty collection.");
        }

        return values[NextInt(0, values.Count)];
    }

    public static ulong Derive(params object?[] parts)
    {
        const ulong offset = 14695981039346656037UL;
        const ulong prime = 1099511628211UL;
        var hash = offset;

        foreach (var part in parts)
        {
            var text = part switch
            {
                null => "",
                IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture) ?? "",
                _ => part.ToString() ?? ""
            };
            var bytes = Encoding.UTF8.GetBytes(text);
            foreach (var value in bytes)
            {
                hash ^= value;
                hash *= prime;
            }

            hash ^= 0xFF;
            hash *= prime;
        }

        return hash;
    }

    public static int ToBogusSeed(ulong seed) => unchecked((int)(seed ^ (seed >> 32))) & int.MaxValue;
}
