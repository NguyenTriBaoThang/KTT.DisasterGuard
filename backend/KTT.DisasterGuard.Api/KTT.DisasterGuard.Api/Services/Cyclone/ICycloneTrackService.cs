namespace KTT.DisasterGuard.Api.Services.Cyclone;

public interface ICycloneTrackService
{
    Task<GeoJsonFeatureCollection> GetActiveCyclonesGeoJsonAsync(CancellationToken ct = default);
    Task<string> GetRawActiveListAsync(CancellationToken ct = default);
}