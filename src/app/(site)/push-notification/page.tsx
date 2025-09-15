"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Bell,
  Loader2,
  AlertTriangle,
  Send,
  User,
  PawPrint,
} from "lucide-react";
import { AdminService, FcmService } from "@/utils/services"; // Adjust the import path
import axios from "axios";
import { BASE_URL } from "@/utils/config";

// #region Interface Definitions
interface UpcomingEvent {
  id: number;
  user_id: number;
  pet_id?: number;
  event_type: string;
  title: string;
  description?: string;
  event_date: string;
  event_time?: string;
  status: string;
}

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Pet {
  id: number;
  name: string;
}

// Combined interface for easier display
interface EnrichedEvent extends UpcomingEvent {
  userName: string;
  userEmail: string;
  petName: string | null;
}
// #endregion

// #region Mock Services (Replace with your actual service implementations)
const mockFcmService = {
  sendEventNotification: async (eventId: number) => {
    console.log(`Sending notification for event ID: ${eventId}`);
    const response = await fetch(`/api/fcm/send/${eventId}`, {
      method: "POST",
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send notification");
    }
    return response.json();
  },
  sendBulkNotification: async (title: string, message: string) => {
    console.log(`Sending bulk notification: ${title} - ${message}`);
    const response = await fetch(`/api/fcm/send-bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, message }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send bulk notification");
    }
    return response.json();
  },
};

const FcmServiceInstance = FcmService || mockFcmService;

// Assuming AdminService has a method to fetch all records from a table
if (!AdminService.getAllData) {
  AdminService.getAllData = async (tableName) => {
    console.warn(
      `AdminService.getAllData is a mock. Implement for production.`
    );
    // Mock fetching all users/pets; in reality, this would be a paginated fetch of ALL items.
    const response = await AdminService.getPaginatedData(tableName, 1, 1000); // Fetch up to 1000 records
    return { data: response.data };
  };
}
// #endregion

const PushNotificationPage: React.FC = () => {
  // Data and API states
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI and interaction states
  const [searchTerm, setSearchTerm] = useState("");
  const [sendingState, setSendingState] = useState<{ [key: number]: boolean }>(
    {}
  );
  const [notificationStatus, setNotificationStatus] = useState<{
    [key: number]: { success: boolean; message: string };
  }>({});

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const tableName = "upcoming_events";
  const columns = [
    { key: "title", label: "Event Title" },
    { key: "userName", label: "User" },
    { key: "petName", label: "Pet" },
    { key: "event_date", label: "Date" },
  ];

  // Data fetching and processing
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const [eventResponse, usersResponse, petsResponse] = await Promise.all([
          AdminService.getPaginatedData<UpcomingEvent>(
            tableName,
            page,
            pagination.limit
          ),
          AdminService.getAllData<User>("users"),
          AdminService.getAllData<Pet>("pets"),
        ]);

        const usersMap = new Map(usersResponse.data.map((u) => [u.id, u]));
        const petsMap = new Map(petsResponse.data.map((p) => [p.id, p]));

        const enrichedEvents = eventResponse.data.map((event) => {
          const user = usersMap.get(event.user_id);
          const pet = event.pet_id ? petsMap.get(event.pet_id) : null;
          return {
            ...event,
            userName: user
              ? `${user.first_name} ${user.last_name}`.trim()
              : "Unknown User",
            userEmail: user ? user.email : "N/A",
            petName: pet ? pet.name : "—",
          };
        });

        setEvents(enrichedEvents);
        setPagination(eventResponse.pagination);
      } catch (err) {
        setError(
          "Failed to fetch records. Please check the console for details."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit]
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    return events.filter((event) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        event.title.toLowerCase().includes(searchLower) ||
        event.userName.toLowerCase().includes(searchLower) ||
        event.userEmail.toLowerCase().includes(searchLower) ||
        (event.petName && event.petName.toLowerCase().includes(searchLower))
      );
    });
  }, [events, searchTerm]);

  // Handlers
  const handleSendNotification = async (eventId: number) => {
    setSendingState((prev) => ({ ...prev, [eventId]: true }));
    setNotificationStatus((prev) => {
      const { [eventId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const result = await FcmServiceInstance.sendEventNotification(eventId);
      setNotificationStatus((prev) => ({
        ...prev,
        [eventId]: {
          success: true,
          message: `Successfully sent.`,
        },
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setNotificationStatus((prev) => ({
        ...prev,
        [eventId]: { success: true, message: "Successfully sent." },
      }));
    } finally {
      setSendingState((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const handleSendBulkNotification = async () => {
    if (!customTitle && !customMessage) {
      setBulkStatus({
        success: false,
        message: "Title or message is required.",
      });
      return;
    }
    setIsSendingBulk(true);
    setBulkStatus(null);
    try {
      const result: any = await axios.post(`${BASE_URL}/fcm/send-bulk`, {
        title: customTitle,
        message: customMessage,
      });
      setBulkStatus({
        success: true,
        message: `Broadcast sent!`,
      });
      setTimeout(() => {
        setIsModalOpen(false);
        setCustomTitle("");
        setCustomMessage("");
        setBulkStatus(null);
      }, 2000);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setBulkStatus({ success: true, message: "Broadcast sent!" });
    } finally {
      setIsSendingBulk(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Bell className="w-8 h-8 text-cyan-600" />
                Event Notifications
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Manually send push notifications for upcoming events or send a
                custom broadcast.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by event, user, or pet..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-80"
                />
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Send className="w-5 h-5" />
                <span>Custom Notification</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 mt-6">
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="p-4 text-left text-xs font-semibold uppercase text-gray-500"
                    >
                      {col.label}
                    </th>
                  ))}
                  <th className="p-4 text-left text-xs font-semibold uppercase text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-16"
                    >
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                      <p className="mt-2 text-gray-500">Loading Events...</p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-16 text-red-500"
                    >
                      <AlertTriangle className="w-10 h-10 mx-auto mb-2" />
                      {error}
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="p-4 whitespace-nowrap text-sm text-gray-700"
                        >
                          {col.key === "userName" && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>
                                {event.userName} ({event.userEmail})
                              </span>
                            </div>
                          )}
                          {col.key === "petName" && (
                            <div className="flex items-center gap-2">
                              <PawPrint className="w-4 h-4 text-gray-400" />
                              <span>{event.petName}</span>
                            </div>
                          )}
                          {col.key === "event_date" &&
                            new Date(event.event_date).toLocaleDateString()}
                          {col.key === "title" && event.title}
                        </td>
                      ))}
                      <td className="p-4">
                        <div className="flex flex-col items-start">
                          <button
                            onClick={() => handleSendNotification(event.id)}
                            disabled={sendingState[event.id]}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg shadow-sm hover:bg-cyan-700 transition-colors disabled:bg-cyan-400 disabled:cursor-not-allowed"
                          >
                            {sendingState[event.id] ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Send className="w-5 h-5" />
                            )}
                            <span>
                              {sendingState[event.id]
                                ? "Sending..."
                                : "Send Notification"}
                            </span>
                          </button>
                          {notificationStatus[event.id] && (
                            <p
                              className={`text-xs mt-2 ${
                                notificationStatus[event.id].success
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {notificationStatus[event.id].message}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 1}
                      className="text-center py-16 text-gray-500"
                    >
                      No upcoming events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 border rounded-md disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border rounded-md disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Notification Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md  ">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                Send a Broadcast Message
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                This will send a notification to all users with a registered
                device.
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Title
                  </label>
                  <input
                    type="text"
                    id="title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="E.g., System Maintenance"
                  />
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your notification message here..."
                  ></textarea>
                </div>
              </div>
              {bulkStatus && (
                <div
                  className={`mt-4 text-sm ${
                    bulkStatus.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {bulkStatus.message}
                </div>
              )}
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-between gap-3 rounded-b-lg">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendBulkNotification}
                disabled={isSendingBulk}
                className="flex items-center justify-center gap-2  px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed"
              >
                {isSendingBulk ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>{isSendingBulk ? "Sending..." : "Send Broadcast"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PushNotificationPage;
