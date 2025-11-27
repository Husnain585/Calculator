"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserGrowthChart, CategoryDistributionChart } from "@/components/admin/AdminCharts";
import { Users, Calculator, ShieldCheck, Activity } from "lucide-react";

export default function AdminPage() {
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeCalculators, setActiveCalculators] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [userGrowthData, setUserGrowthData] = useState<{ date: string; users: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Users & Growth
        const usersSnap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "asc")));
        setTotalUsers(usersSnap.size);

        // Process user growth (mocking daily growth based on createdAt if available, otherwise simple count)
        const growthMap = new Map<string, number>();
        usersSnap.docs.forEach(doc => {
          const data = doc.data();
          if (data.createdAt) {
            const date = new Date(data.createdAt.seconds * 1000).toLocaleDateString();
            growthMap.set(date, (growthMap.get(date) || 0) + 1);
          }
        });

        // Accumulate growth
        let cumulativeUsers = 0;
        const growthArray: { date: string; users: number }[] = [];
        growthMap.forEach((count, date) => {
          cumulativeUsers += count;
          growthArray.push({ date, users: cumulativeUsers });
        });
        
        // If no historical data, show current total as a single point or mock
        if (growthArray.length === 0) {
             growthArray.push({ date: new Date().toLocaleDateString(), users: usersSnap.size });
        }
        setUserGrowthData(growthArray);


        // Admins
        const adminQuery = query(collection(db, "users"), where("isAdmin", "==", true));
        const adminSnap = await getDocs(adminQuery);
        setTotalAdmins(adminSnap.size);

        // Calculators & Categories
        const calculatorsSnap = await getDocs(collection(db, "calculators"));
        setActiveCalculators(calculatorsSnap.size);

        const catMap = new Map<string, number>();
        calculatorsSnap.docs.forEach(doc => {
          const cat = doc.data().categorySlug || "Uncategorized";
          catMap.set(cat, (catMap.get(cat) || 0) + 1);
        });

        const catArray = Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
        setCategoryData(catArray);

      } catch (error) {
        console.error("Error fetching admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-2">
          Overview of users, calculators, and system activity.
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Users" value={totalUsers} icon={<Users className="h-8 w-8 text-blue-500" />} />
        <StatsCard title="Active Calculators" value={activeCalculators} icon={<Calculator className="h-8 w-8 text-green-500" />} />
        <StatsCard title="Admins" value={totalAdmins} icon={<ShieldCheck className="h-8 w-8 text-purple-500" />} />
        <StatsCard title="System Status" value="Healthy" icon={<Activity className="h-8 w-8 text-orange-500" />} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <UserGrowthChart data={userGrowthData} />
        <CategoryDistributionChart data={categoryData} />
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
