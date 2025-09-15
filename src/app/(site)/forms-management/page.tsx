"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  Settings,
  FormInput,
  Edit,
  Loader2,
  AlertTriangle,
  X,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Heart as PetIcon,
} from "lucide-react";
import { AdminService } from "@/utils/services"; // Adjust this import path
import { SlotService, BlockedSlot, NewBlockedSlot } from "@/utils/slot"; // Adjust this import path
import AdminCalendar from "@/components/Calender"; // Adjust this import path
import { useRouter } from "next/navigation";

// #region Interface Definitions
interface VaccineType {
  id: number;
  name: string;
  description: string;
}
interface VaccineName {
  id: number;
  name: string;
  description: string;
}
interface Breed {
  id: number;
  name: string;
  type: "Dog" | "Cat";
}
// #endregion

const FormsManagement: React.FC = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("appointment");

  // #region State Management
  // Vaccine states
  const [vaccineTypes, setVaccineTypes] = useState<VaccineType[]>([]);
  const [vaccineNames, setVaccineNames] = useState<VaccineName[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  // Appointment slot states
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Common states
  const [loading, setLoading] = useState({
    types: true,
    names: true,
    slots: true,
    breeds: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states
  const [modal, setModal] = useState<{
    isOpen: boolean;
    type: string | null;
    data?: any;
  }>({ isOpen: false, type: null, data: null });
  const [formData, setFormData] = useState<any>({
    name: "",
    description: "",
    type: "Dog",
  });
  const [newSlotData, setNewSlotData] = useState<NewBlockedSlot>({
    date: "",
    time: null,
  });
  // #endregion

  // #region Data Fetching Callbacks
  const fetchVaccineTypes = useCallback(async () => {
    setLoading((prev) => ({ ...prev, types: true }));
    try {
      const response = await AdminService.getPaginatedData<VaccineType>(
        "vaccine_types",
        1,
        1000
      );
      setVaccineTypes(response.data);
    } catch (err) {
      setError("Failed to fetch vaccine types.");
    } finally {
      setLoading((prev) => ({ ...prev, types: false }));
    }
  }, []);

  const fetchVaccineNames = useCallback(async () => {
    setLoading((prev) => ({ ...prev, names: true }));
    try {
      const response = await AdminService.getPaginatedData<VaccineName>(
        "vaccine_names",
        1,
        1000
      );
      setVaccineNames(response.data);
    } catch (err) {
      setError("Failed to fetch vaccine names.");
    } finally {
      setLoading((prev) => ({ ...prev, names: false }));
    }
  }, []);

  const fetchBlockedSlots = useCallback(async () => {
    setLoading((prev) => ({ ...prev, slots: true }));
    try {
      const slots = await SlotService.getBlockedSlots();
      setBlockedSlots(slots);
    } catch (err) {
      setError("Failed to fetch blocked slots.");
    } finally {
      setLoading((prev) => ({ ...prev, slots: false }));
    }
  }, []);
  const fetchBreeds = useCallback(async () => {
    setLoading((prev) => ({ ...prev, breeds: true }));
    try {
      const response = await AdminService.getPaginatedData<Breed>(
        "breeds",
        1,
        1000
      );
      setBreeds(response.data);
    } catch (err) {
      setError("Failed to fetch breeds.");
    } finally {
      setLoading((prev) => ({ ...prev, breeds: false }));
    }
  }, []);
  useEffect(() => {
    if (activeTab === "vaccine") {
      fetchVaccineTypes();
      fetchVaccineNames();
    }
    if (activeTab === "appointment") {
      fetchBlockedSlots();
    }
    if (activeTab === "pet") {
      fetchBreeds();
    }
  }, [
    activeTab,
    fetchVaccineTypes,
    fetchVaccineNames,
    fetchBlockedSlots,
    fetchBreeds,
  ]);
  // #endregion

  // #region Handlers
  const openModal = (type: typeof modal.type, data?: any) => {
    setModal({ isOpen: true, type, data });
    if (type === "blockSlot" && data instanceof Date) {
      const dateString = data.toISOString().split("T")[0];
      setNewSlotData({ date: dateString, time: null });
    } else if (data) {
      setFormData({
        name: data.name,
        description: data.description || "",
        type: data.type || "Dog",
      });
    } else {
      setFormData({ name: "", description: "", type: data.type || "Dog" });
    }
  };

  const closeModal = () => setModal({ isOpen: false, type: null, data: null });

  const handleFormSubmit = async () => {
    setIsSubmitting(true);
    try {
      switch (modal.type) {
        case "addType":
          await AdminService.createRecord("vaccine_types", formData);
          await fetchVaccineTypes();
          break;
        case "editType":
          await AdminService.updateRecord(
            "vaccine_types",
            modal.data.id,
            formData
          );
          await fetchVaccineTypes();
          break;
        case "addName":
          await AdminService.createRecord("vaccine_names", formData);
          await fetchVaccineNames();
          break;
        case "editName":
          await AdminService.updateRecord(
            "vaccine_names",
            modal.data.id,
            formData
          );
          await fetchVaccineNames();
        case "addBreed":
          await AdminService.createRecord("breeds", {
            name: formData.name,
            type: formData.type,
          });
          await fetchBreeds();
          break;
        case "editBreed":
          await AdminService.updateRecord("breeds", modal.data.id, {
            name: formData.name,
            type: formData.type,
          });
          await fetchBreeds();
          break;
      }
      window.location.reload();
      closeModal();
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Operation failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }; // Helper to format a Date object to 'YYYY-MM-DD' regardless of timezone
  const formatDateToYYYYMMDD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleSlotClick = async (time: string | null) => {
    setIsSubmitting(true);
    // FIX: Use a timezone-safe date formatter
    const dateStr = formatDateToYYYYMMDD(selectedDate);
    const timeStr = time ? `${time}:00` : null;

    const existingBlock = blockedSlots.find(
      (s) =>
        // FIX: Compare only the date part of the ISO string from the backend
        s.date.substring(0, 10) === dateStr && s.time === timeStr
    );

    try {
      if (existingBlock) {
        await SlotService.unblockSlot(existingBlock.id);
      } else {
        await SlotService.blockSlot({ date: dateStr, time: timeStr });
      }
      await fetchBlockedSlots();
    } catch (error) {
      console.error("Failed to update slot:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      if (modal.type === "deleteType") {
        await AdminService.deleteRecords("vaccine_types", [modal.data.id]);
        await fetchVaccineTypes();
      } else if (modal.type === "deleteName") {
        await AdminService.deleteRecords("vaccine_names", [modal.data.id]);
        await fetchVaccineNames();
      } else if (modal.type === "deleteBreed") {
        await AdminService.deleteRecords("breeds", [modal.data.id]);
        await fetchBreeds();
      }
      closeModal();
    } catch (err) {
      console.error("Deletion failed:", err);
      alert("Deletion failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  // #endregion

  // #region Render Functions
  const renderAppointmentTab = () => {
    const amTimes = [
      { display: "09:00", value: "09:00" },
      { display: "10:00", value: "10:00" },
      { display: "11:00", value: "11:00" },
    ];
    const pmTimes = [
      { display: "12:00", value: "12:00" },
      { display: "01:00", value: "13:00" },
      { display: "02:00", value: "14:00" },
      { display: "03:00", value: "15:00" },
      { display: "04:00", value: "16:00" },
      { display: "05:00", value: "17:00" },
      { display: "06:00", value: "18:00" },
      { display: "07:00", value: "19:00" },
      { display: "08:00", value: "20:00" },
      { display: "09:00", value: "21:00" },
    ];

    // FIX: Use a timezone-safe date formatter
    const selectedDateStr = formatDateToYYYYMMDD(selectedDate);
    const blockedTimesForSelectedDate = blockedSlots
      .filter((s) => s.date.substring(0, 10) === selectedDateStr)
      .map((s) => s.time);

    const isAllDayBlocked = blockedTimesForSelectedDate.includes(null);

    const TimeSlotButton = ({
      time,
    }: {
      time: { display: string; value: string };
    }) => {
      const isBlocked =
        isAllDayBlocked ||
        blockedTimesForSelectedDate.includes(`${time.value}:00`);
      return (
        <button
          key={time.value}
          onClick={() => handleSlotClick(time.value)}
          disabled={
            isSubmitting ||
            (isAllDayBlocked &&
              !blockedTimesForSelectedDate.includes(`${time.value}:00`))
          }
          className={`p-2 rounded-md text-sm transition-colors ${
            isBlocked
              ? "bg-red-500 text-white hover:bg-red-600"
              : "bg-gray-100 hover:bg-gray-200"
          } disabled:bg-gray-300 disabled:cursor-not-allowed`}
        >
          {time.display}
        </button>
      );
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminCalendar
            currentMonth={currentMonth}
            selectedDate={selectedDate}
            onMonthChange={setCurrentMonth}
            onDateClick={setSelectedDate}
            blockedSlots={blockedSlots}
          />
        </div>
        <div className="bg-white rounded-lg border">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              Manage Slots for {selectedDate.toLocaleDateString()}
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <button
              onClick={() => handleSlotClick(null)}
              disabled={isSubmitting}
              className={`w-full p-3 rounded-lg border text-center font-medium transition-colors ${
                isAllDayBlocked
                  ? "bg-red-500 text-white hover:bg-red-600"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {isAllDayBlocked ? "Unblock All Day" : "Block All Day"}
            </button>

            {/* AM Slots */}
            <div>
              <h4 className="font-semibold mb-2 text-gray-600">AM</h4>
              <div className="grid grid-cols-4 gap-2">
                {amTimes.map((time) => (
                  <TimeSlotButton key={time.value} time={time} />
                ))}
              </div>
            </div>

            {/* PM Slots */}
            <div>
              <h4 className="font-semibold mb-2 text-gray-600">PM</h4>
              <div className="grid grid-cols-4 gap-2">
                {pmTimes.map((time) => (
                  <TimeSlotButton key={time.value} time={time} />
                ))}
              </div>
            </div>

            {isSubmitting && (
              <div className="flex justify-center pt-2">
                <Loader2 className="animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderVaccineTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Vaccine Types</h3>
          <button
            onClick={() => openModal("addType")}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Type</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Description</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading.types ? (
                <tr>
                  <td colSpan={3} className="text-center p-8">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                vaccineTypes.map((type) => (
                  <tr key={type.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{type.name}</td>
                    <td className="p-3 text-gray-500">{type.description}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal("editType", type)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal("deleteType", type)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-lg border">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Vaccine Names</h3>
          <button
            onClick={() => openModal("addName")}
            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vaccine</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Description</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading.names ? (
                <tr>
                  <td colSpan={3} className="text-center p-8">
                    <Loader2 className="animate-spin mx-auto" />
                  </td>
                </tr>
              ) : (
                vaccineNames.map((vaccine) => (
                  <tr key={vaccine.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{vaccine.name}</td>
                    <td className="p-3 text-gray-500">{vaccine.description}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal("editName", vaccine)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal("deleteName", vaccine)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPetTab = () => (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">Pet Breeds</h3>
        <button
          onClick={() => openModal("addBreed")}
          className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4" />
          <span>Add Breed</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-3 text-left font-medium">Breed Name</th>
              <th className="p-3 text-left font-medium">Species</th>
              <th className="p-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading.breeds ? (
              <tr>
                <td colSpan={3} className="text-center p-8">
                  <Loader2 className="animate-spin mx-auto" />
                </td>
              </tr>
            ) : (
              breeds.map((breed) => (
                <tr key={breed.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{breed.name}</td>
                  <td className="p-3 text-gray-500">{breed.type}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openModal("editBreed", breed)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal("deleteBreed", breed)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  // #endregion

  const tabs = [
    { id: "pet", label: "Pet Forms", icon: PetIcon },
    { id: "appointment", label: "Appointment Slots", icon: CalendarIcon },
    { id: "vaccine", label: "Vaccine Forms", icon: FormInput },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white border-b px-6 py-4">
        <h1 className="text-2xl font-semibold">Forms Management</h1>
        <p className="text-gray-500 mt-1">
          Manage form configurations and settings
        </p>
      </div>
      <div className="border-b bg-white">
        <div className="px-6">
          <nav className="flex space-x-8 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 text-sm font-medium whitespace-nowrap border-b-2 ${
                  activeTab === tab.id
                    ? "border-cyan-500 text-cyan-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="p-6">
        {activeTab === "appointment" ? (
          renderAppointmentTab()
        ) : activeTab === "vaccine" ? (
          renderVaccineTab()
        ) : activeTab === "pet" ? (
          renderPetTab()
        ) : (
          <p>Select a tab</p>
        )}
      </div>

      {/* Modals */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {modal.type?.startsWith("delete") ? (
              <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Confirm Deletion</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete "{modal.data.name}"? This
                  cannot be undone.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="flex-1 py-2 bg-red-600 text-white rounded-lg flex items-center justify-center disabled:bg-red-400"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}{" "}
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 border-b">
                  <h3 className="text-lg font-semibold">
                    {modal.type?.startsWith("add") ? "Add" : "Edit"}{" "}
                    {modal.type?.includes("Breed")
                      ? "Breed"
                      : modal.type?.includes("Type")
                      ? "Vaccine Type"
                      : "Vaccine Name"}
                  </h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  {modal.type?.includes("Breed") ? (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Species *
                      </label>
                      <select
                        value={formData.type}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            type: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded-md"
                      >
                        <option value="Dog">Dog</option>
                        <option value="Cat">Cat</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="w-full p-2 border rounded-md"
                        rows={3}
                      />
                    </div>
                  )}
                </div>
                <div className="p-6 border-t flex gap-4">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2 border rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    disabled={isSubmitting || !formData.name}
                    className="flex-1 py-2 bg-cyan-600 text-white rounded-lg flex items-center justify-center disabled:bg-cyan-400"
                  >
                    {isSubmitting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}{" "}
                    Save
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormsManagement;
