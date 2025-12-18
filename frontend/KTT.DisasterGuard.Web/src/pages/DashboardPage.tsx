import MapDashboard from "../components/MapDashboard";
import TopBar from "../components/TopBar";

export default function DashboardPage() {
  return (
    <>
      <TopBar />
      <div style={{ paddingTop: 52 }}>
        <MapDashboard />
      </div>
    </>
  );
}