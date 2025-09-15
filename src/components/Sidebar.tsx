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
  Loader2,
  Lock,
  BellIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AdminService } from "@/utils/services";

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const Sidebar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const path = usePathname();

  // State to hold the counts fetched from the API
  const [counts, setCounts] = useState({
    pets: 0,
    appointments: 0,
    medicalRecords: 0,
    vaccines: 0,
    users: 0,
    events: 0,
  });
  const [isLoadingCounts, setIsLoadingCounts] = useState(true);

  // Fetch counts from the backend when the component mounts
  useEffect(() => {
    const fetchCounts = async () => {
      setIsLoadingCounts(true);
      try {
        // Fetch all counts in parallel for efficiency
        const [
          petsRes,
          apptsRes,
          medicalRes,
          vaccinesRes,
          usersRes,
          eventsRes,
        ] = await Promise.all([
          AdminService.getPaginatedData("pets", 1, 1),
          AdminService.getPaginatedData("appointments", 1, 1),
          AdminService.getPaginatedData("medical_records", 1, 1),
          AdminService.getPaginatedData("vaccine_records", 1, 1),
          AdminService.getPaginatedData("users", 1, 1),
          AdminService.getPaginatedData("upcoming_events", 1, 1),
        ]);

        // Update the state with the total counts from pagination
        setCounts({
          pets: petsRes.pagination.total,
          appointments: apptsRes.pagination.total,
          medicalRecords: medicalRes.pagination.total,
          vaccines: vaccinesRes.pagination.total,
          users: usersRes.pagination.total,
          events: eventsRes.pagination.total,
        });
      } catch (error) {
        console.error("Failed to fetch sidebar counts:", error);
        // Handle error gracefully, e.g., show 0 or an error icon
      } finally {
        setIsLoadingCounts(false);
      }
    };
    fetchCounts();
  }, []);

  const navItems: NavItem[] = [
    { id: "", label: "Home", icon: <Home size={20} /> },
    {
      id: "pets",
      label: "Pets",
      icon: <Heart size={20} />,
      badge: counts.pets,
    },
    {
      id: "appointments",
      label: "Appointments",
      icon: <Calendar size={20} />,
      badge: counts.appointments,
    },
    {
      id: "medical-records",
      label: "Medical Records",
      icon: <FileText size={20} />,
      badge: counts.medicalRecords,
    },
    {
      id: "vaccine-registration",
      label: "Vaccine Records",
      icon: <Shield size={20} />,
      badge: counts.vaccines,
    },
    {
      id: "users",
      label: "Users",
      icon: <Users size={20} />,
      badge: counts.users,
    },
    {
      id: "push-notification",
      label: "Push Notification",
      icon: <BellIcon size={20} />,
      badge: counts.events,
    },
    {
      id: "forms-management",
      label: "Forms Management",
      icon: <Settings size={20} />,
    },

    {
      id: "change-password",
      label: "Change Password",
      icon: <Lock size={20} />,
    },
  ];

  const handleTabClick = (tabId: string) => {
    router.push(`/${tabId}`);
    setIsMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Improved logic to determine the active tab based on the URL pathname
  const isActive = (itemId: string) => {
    const currentPath = path.split("/").pop();
    if (
      itemId === "dashboard" &&
      (currentPath === "admin" || currentPath === "")
    ) {
      return true;
    }
    return currentPath === itemId;
  };
  const deleteCookie = (name: string) => {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
    window.location.reload();
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[#3cd3e1] text-white rounded-lg hover:bg-opacity-80 transition-colors"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <div
        className={`
        fixed  inset-y-0 left-0 z-40 w-72 bg-white border-r h-screen border-[#E5E5EA] transform transition-transform duration-300 ease-in-out
        ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }
      `}
      >
        {/* Logo/Brand */}
        <div className="flex items-center justify-center h-20 border-b border-[#E5E5EA]">
          <h1 className="text-3xl font-bold text-[#222222]">Zootopia</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`
                w-full flex items-center justify-between px-4 py-3 text-left rounded-lg transition-all duration-200
                ${
                  isActive(item.id)
                    ? "bg-[#3cd3e1] text-white shadow-sm"
                    : "text-[#222222] hover:bg-gray-50 hover:text-[#3cd3e1]"
                }
              `}
            >
              <div className="flex items-center space-x-3">
                <span
                  className={`${
                    isActive(item.id) ? "text-white" : "text-[#C7C7CC]"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </div>
              {isLoadingCounts && item.badge !== undefined ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                item.badge > 0 && (
                  <span
                    className={`
                    px-2 py-1 text-xs rounded-full font-medium
                    ${
                      isActive(item.id)
                        ? "bg-white text-[#3cd3e1]"
                        : "bg-gray-200 text-gray-700"
                    }
                  `}
                  >
                    {item.badge}
                  </span>
                )
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#E5E5EA] absolute bottom-0 left-0 w-full">
          <button
            onClick={() => deleteCookie("authToken")}
            className="w-full py-3 bg-[#3cd3e1] flex shadow cursor-pointer items-center justify-center"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={toggleMobileMenu}
        />
      )}
    </>
  );
};

export default Sidebar;
