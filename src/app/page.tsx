"use client";
import React, { useState, useEffect } from "react";
import {
  Home,
  Heart,
  Calendar,
  FileText,
  Shield,
  Users,
  Settings,
  Menu,
  X,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  User,
  Plus,
  Check,
  AlertCircle,
  MapPin,
  Loader2,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { AdminService } from "@/utils/services"; // Adjust import path

interface ActivityItem {
  id: string;
  type: "registration" | "appointment" | "vaccine" | "medical" | "user";
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  iconBg: string;
  user?: string;
  pet?: string;
}

const Dashboard: React.FC = () => {
  // State for API data
  const [stats, setStats] = useState({
    pets: 0,
    users: 0,
    appointments: 0,
    medicalRecords: 0,
    vaccines: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);

  // Chart data states
  const [monthlyData, setMonthlyData] = useState([]);
  const [petTypeData, setPetTypeData] = useState([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState([]);
  const [vaccineData, setVaccineData] = useState([]);
  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    let diff = Math.floor((now.getTime() - past.getTime()) / 1000); // in seconds

    const years = Math.floor(diff / (3600 * 24 * 365));
    diff -= years * 3600 * 24 * 365;

    const months = Math.floor(diff / (3600 * 24 * 30));
    diff -= months * 3600 * 24 * 30;

    const days = Math.floor(diff / (3600 * 24));
    diff -= days * 3600 * 24;

    const hours = Math.floor(diff / 3600);
    diff -= hours * 3600;

    const minutes = Math.floor(diff / 60);

    if (years > 0) return `${years} year${years > 1 ? "s" : ""} ago`;
    if (months > 0) return `${months} month${months > 1 ? "s" : ""} ago`;
    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        const [petsRes, usersRes, appointmentsRes, medicalRes, vaccinesRes] =
          await Promise.all([
            AdminService.getPaginatedData("pets", 1, 1000),
            AdminService.getPaginatedData("users", 1, 1000),
            AdminService.getPaginatedData("appointments", 1, 1000),
            AdminService.getPaginatedData("medical_records", 1, 1000),
            AdminService.getPaginatedData("vaccine_records", 1, 1000),
          ]);

        // Set total counts for stats cards
        setStats({
          pets: petsRes.pagination.total,
          users: usersRes.pagination.total,
          appointments: appointmentsRes.pagination.total,
          medicalRecords: medicalRes.pagination.total,
          vaccines: vaccinesRes.pagination.total,
        });

        // --- Process data for charts ---

        // Pet Types (Dogs vs Cats)
        const petTypes = petsRes.data.reduce((acc: any, pet: any) => {
          acc[pet.type] = (acc[pet.type] || 0) + 1;
          return acc;
        }, {});
        setPetTypeData([
          { name: "Dogs", value: petTypes["Dog"] || 0, color: "#3cd3e1" },
          { name: "Cats", value: petTypes["Cat"] || 0, color: "#10b981" },
        ]);

        // Appointment Status
        const apptStatuses = appointmentsRes.data.reduce(
          (acc: any, appt: any) => {
            const status = appt.status === "booked" ? "Completed" : "Pending"; // Simplified
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          },
          {}
        );
        setAppointmentStatusData([
          {
            status: "Completed",
            count: apptStatuses["Completed"] || 0,
            color: "#10b981",
          },
          {
            status: "Pending",
            count: apptStatuses["Pending"] || 0,
            color: "#f59e0b",
          },
        ]);

        // Popular Vaccines
        const vaccineCounts = vaccinesRes.data.reduce((acc: any, vac: any) => {
          acc[vac.vaccine_name] = (acc[vac.vaccine_name] || 0) + 1;
          return acc;
        }, {});
        const topVaccines = Object.entries(vaccineCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);
        setVaccineData(
          topVaccines.map(([vaccine, count]) => ({ vaccine, count }))
        );

        // --- Generate Recent Activity Feed ---
        const combinedActivities = [
          ...petsRes.data.map((p: any) => ({
            ...p,
            type: "pet",
            timestamp: p.created_at,
          })),
          ...usersRes.data.map((u: any) => ({
            ...u,
            type: "user",
            timestamp: u.created_at,
          })),
          ...appointmentsRes.data.map((a: any) => ({
            ...a,
            type: "appointment",
            timestamp: a.created_at,
          })),
        ]
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
          .slice(0, 6);

        const activityFeed = combinedActivities
          .map((item: any) => {
            const timeAgo = getTimeAgo(item.timestamp);
            if (item.type === "pet") {
              const user = usersRes.data.find(
                (u: any) => u.id === item.user_id
              );
              return {
                id: `pet-${item.id}`,
                type: "registration",
                title: "New Pet Registered",
                description: `${item.breed} "${item.name}" registered`,
                timestamp: timeAgo,
                icon: <Heart size={16} />,
                iconBg: "bg-[#3cd3e1]",
                pet: item.name,
                user: `${user?.first_name || ""} ${user?.last_name || ""}`,
              };
            }
            if (item.type === "user") {
              return {
                id: `user-${item.id}`,
                type: "user",
                title: "New User Registration",
                description: `${item.first_name} ${item.last_name} joined`,
                timestamp: timeAgo,
                icon: <User size={16} />,
                iconBg: "bg-purple-500",
                user: `${item.first_name} ${item.last_name}`,
              };
            }
            if (item.type === "appointment") {
              const pet = petsRes.data.find(
                (p: any) => p.id === item.pets?.[0]?.pet_id
              );
              return {
                id: `appt-${item.id}`,
                type: "appointment",
                title: `Appointment ${item.status}`,
                description: `Booking for "${pet?.name || "a pet"}"`,
                timestamp: timeAgo,
                icon: <Calendar size={16} />,
                iconBg: "bg-blue-500",
                pet: pet?.name,
                user: `${item.member_first_name} ${item.member_last_name}`,
              };
            }
            return null;
          })
          .filter(Boolean);
        setRecentActivities(activityFeed);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#222222] mb-2">
          Dashboard Overview
        </h1>
        <p className="text-[#C7C7CC]">
          Welcome to your zootopia management dashboard
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {/* Total Pets Registered */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#3cd3e1] bg-opacity-10 rounded-lg flex items-center justify-center">
              <Heart className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#222222] mb-1">
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              stats.pets
            )}
          </h3>
          <p className="text-[#C7C7CC] text-sm">Total Pets Registered</p>
        </div>

        {/* Total Users */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-500 bg-opacity-10 rounded-lg flex items-center justify-center">
              <Users className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#222222] mb-1">
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              stats.users
            )}
          </h3>
          <p className="text-[#C7C7CC] text-sm">Pet Parents Registered</p>
        </div>

        {/* Total Appointments */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-500 bg-opacity-10 rounded-lg flex items-center justify-center">
              <Calendar className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#222222] mb-1">
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              stats.appointments
            )}
          </h3>
          <p className="text-[#C7C7CC] text-sm">Appointments Booked</p>
        </div>

        {/* Medical Records */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500 bg-opacity-10 rounded-lg flex items-center justify-center">
              <FileText className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#222222] mb-1">
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              stats.medicalRecords
            )}
          </h3>
          <p className="text-[#C7C7CC] text-sm">Medical Records</p>
        </div>

        {/* Vaccine Registrations */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-500 bg-opacity-10 rounded-lg flex items-center justify-center">
              <Shield className="text-white" size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#222222] mb-1">
            {loading ? (
              <Loader2 className="animate-spin w-6 h-6" />
            ) : (
              stats.vaccines
            )}
          </h3>
          <p className="text-[#C7C7CC] text-sm">Vaccine Registrations</p>
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="mb-8">
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-[#3cd3e1] bg-opacity-10 rounded-lg flex items-center justify-center">
                <Clock className="text-white" size={18} />
              </div>
              <h3 className="text-lg font-semibold text-[#222222]">
                Recent Activity
              </h3>
            </div>
            <button className="text-[#3cd3e1] text-sm font-medium hover:text-[#2bb5c1] transition-colors">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <Loader2 className="mx-auto my-8 animate-spin" />
            ) : (
              recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 ${activity.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}
                  >
                    <div className="text-white">{activity.icon}</div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-[#222222] truncate">
                        {activity.title}
                      </h4>
                      <span className="text-xs text-[#C7C7CC] flex-shrink-0 ml-2">
                        {activity.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-[#8E8E93] mt-1">
                      {activity.description}
                    </p>

                    {(activity.user || activity.pet) && (
                      <div className="flex items-center space-x-4 mt-2">
                        {activity.user && (
                          <div className="flex items-center space-x-1">
                            <User size={12} className="text-[#C7C7CC]" />
                            <span className="text-xs text-[#C7C7CC]">
                              {activity.user}
                            </span>
                          </div>
                        )}
                        {activity.pet && (
                          <div className="flex items-center space-x-1">
                            <Heart size={12} className="text-[#C7C7CC]" />
                            <span className="text-xs text-[#C7C7CC]">
                              {activity.pet}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pet Types Distribution */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#222222] mb-6">
            Pet Types Distribution
          </h3>
          <div className="h-80">
            {loading ? (
              <Loader2 className="mx-auto my-8 animate-spin" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={petTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {petTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Appointment Status */}
        <div className="bg-white border border-[#E5E5EA] rounded-lg p-6">
          <h3 className="text-lg font-semibold text-[#222222] mb-6">
            Appointment Status
          </h3>
          <div className="h-80">
            {loading ? (
              <Loader2 className="mx-auto my-8 animate-spin" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentStatusData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {appointmentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
