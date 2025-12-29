namespace KTT.DisasterGuard.Api.Dtos;

public class SosStatsResponse
{
    public int Total { get; set; }
    public int Active { get; set; }         // PENDING + ACCEPTED
    public int Pending { get; set; }
    public int Accepted { get; set; }
    public int Rescued { get; set; }
    public int Cancelled { get; set; }

    public int Last24h { get; set; }
    public int TodayUtc { get; set; }

    public List<SosDailyCount> Daily { get; set; } = new();
}

public class SosDailyCount
{
    public string DateUtc { get; set; } = "";  // yyyy-MM-dd
    public int Total { get; set; }
    public int Pending { get; set; }
    public int Accepted { get; set; }
    public int Rescued { get; set; }
    public int Cancelled { get; set; }
}
