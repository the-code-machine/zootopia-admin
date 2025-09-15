"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  X,
  Eye,
  Edit,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  Users,
  UploadCloud,
  FilePlus2,
} from "lucide-react";
import { AdminService } from "@/utils/services"; // Adjust the import path
import { exportToExcel } from "@/utils/exortToExcel"; // Adjust the import path
import { useRouter } from "next/navigation";

// #region Interface Definitions
interface Pet {
  id: number;
  name: string;
  type: string;
  breed: string;
  gender: string;
  image?: string; // Make image optional
}

interface Appointment {
  id: number;
  user_id: number | null;
  date: string;
  time: string;
  time_slot: "AM" | "PM";
  number_of_pets: number;
  member_first_name: string;
  member_last_name: string;
  member_phone: string;
  status: "draft" | "booked";
  created_at: string;
  pets?: AppointmentPetLink[]; // Add this to hold linked pets
}

interface AppointmentPetLink {
  id: number;
  appointment_id: number;
  pet_id: number | null;
  purpose_of_visit: string;
  memo: string;
  name: string | null;
  type: string | null;
}

interface DisplayPetForAppointment {
  id: number;
  name: string;
  type: string;
  purpose_of_visit: string;
  memo: string;
}

interface MedicalRecordFormData {
  petId: number;
  title: string;
  date: string;
  hospital_details: string;
  photos: { imageData: string; uploadedBy: "hospital" }[];
}
// #endregion

const AppointmentsPage: React.FC = () => {
  const router = useRouter();
  // Data and API states
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // UI and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    startDate: "",
    endDate: "",
  });

  // Modal and editing states
  const [selectedItem, setSelectedItem] = useState<Appointment | null>(null);
  const [appointmentPets, setAppointmentPets] = useState<
    DisplayPetForAppointment[]
  >([]);
  const [loadingPets, setLoadingPets] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "view" | "edit" | "delete" | "createMedical"
  >("view");
  const [editedData, setEditedData] = useState<Partial<Appointment>>({});
  const [medicalForms, setMedicalForms] = useState<MedicalRecordFormData[]>([]);

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const tableName = "appointments";
  const columns = [
    { key: "member_name", label: " Name" },
    { key: "date", label: "Date & Time" },
    { key: "pets", label: "Pets" },
    { key: "status", label: "Status" },
  ];

  // #region Data Fetching
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const [apptResponse, petsResponse] = await Promise.all([
          AdminService.getPaginatedData<Appointment>(
            tableName,
            page,
            pagination.limit
          ),
          AdminService.getPaginatedData<Pet>("pets", 1, 1000),
        ]);
        setAppointments(apptResponse.data);
        setPagination(apptResponse.pagination);
        setAllPets(petsResponse.data);
      } catch (err) {
        setError("Failed to fetch records.");
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

  const fetchPetsForAppointment = useCallback(
    async (appointmentId: number) => {
      setLoadingPets(true);
      setAppointmentPets([]);
      try {
        const linksResponse =
          await AdminService.getPaginatedData<AppointmentPetLink>(
            "appointment_pet_links",
            1,
            500
          );
        const relevantLinks = linksResponse.data.filter(
          (p) => p.appointment_id === appointmentId
        );
        const detailedPets = relevantLinks.map((link) => {
          const petDetails = allPets.find((p) => p.id === link.pet_id);
          return {
            id: link.pet_id || link.id,
            name: petDetails?.name || link.name || "Unregistered Pet",
            type: petDetails?.type || link.type || "N/A",
            purpose_of_visit: link.purpose_of_visit,
            memo: link.memo,
          };
        });
        setAppointmentPets(detailedPets);
      } catch (error) {
        console.error("Failed to fetch appointment pets", error);
      } finally {
        setLoadingPets(false);
      }
    },
    [allPets]
  );
  // #endregion

  // Client-side filtering
  const filteredData = useMemo(() => {
    const filtered = appointments.filter((appt) => {
      const clientName =
        `${appt.member_first_name} ${appt.member_last_name}`.toLowerCase();
      const searchMatch = searchTerm
        ? clientName.includes(searchTerm.toLowerCase())
        : true;
      const statusMatch =
        filters.status === "all" || appt.status === filters.status;
      const date = new Date(appt.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);
      const dateMatch =
        (!startDate || date >= startDate) && (!endDate || date <= endDate);
      return searchMatch && statusMatch && dateMatch;
    });

    // Sort by created_at timestamp to show the most recent appointments first
    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [appointments, searchTerm, filters]);
  // #region Handlers
  const handleUpdateStatus = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await AdminService.updateRecord(tableName, selectedItem.id, {
        status: editedData.status,
      });
      closeModal();
      fetchData(pagination.page);
    } catch (err) {
      alert("Failed to update record.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateMedicalRecords = async () => {
    setIsSaving(true);
    try {
      for (const form of medicalForms) {
        if (form.hospital_details || form.photos.length > 0) {
          const record = await AdminService.createRecord("medical_records", {
            pet_id: form.petId,
            title: form.title,
            date: form.date,
            hospital_details: form.hospital_details,
          });
          for (const photo of form.photos) {
            await AdminService.createRecord("medical_record_photos", {
              medical_record_id: record.id,
              image_data: photo.imageData,
              uploaded_by: "hospital",
            });
          }
        }
      }
      closeModal();
    } catch (err) {
      alert("Failed to create medical records.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (ids: number[]) => {
    setIsDeleting(true);
    try {
      await AdminService.deleteRecords(tableName, ids);
      setSelectedItems(new Set());
      window.location.reload();
      closeModal();

      await fetchData(1);
    } catch (err) {
      alert(`Failed to delete records.`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = () => {
    const formattedData = filteredData.map((appt) => ({
      ID: appt.id,
      "Client Name": `${appt.member_first_name} ${appt.member_last_name}`,
      "Client Phone": appt.member_phone,
      Date: new Date(appt.date).toLocaleDateString(),
      Time: `${appt.time} ${appt.time_slot}`,
      Status: appt.status,
      "# of Pets": appt.number_of_pets,
    }));
    exportToExcel(formattedData, "Appointment_Records");
  };

  const handleMedicalFormChange = (
    petId: number,
    field: "hospital_details",
    value: string
  ) => {
    setMedicalForms((prev) =>
      prev.map((form) =>
        form.petId === petId ? { ...form, [field]: value } : form
      )
    );
  };

  const handleMedicalPhotoUpload = (
    petId: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhoto = {
          imageData: reader.result as string,
          uploadedBy: "hospital" as const,
        };
        setMedicalForms((prev) =>
          prev.map((form) =>
            form.petId === petId
              ? { ...form, photos: [...form.photos, newPhoto] }
              : form
          )
        );
      };
      reader.readAsDataURL(file);
    });
  };
  // #endregion

  // #region Modal Functions
  const openModal = (
    item: Appointment | null,
    mode: "view" | "edit" | "delete" | "createMedical"
  ) => {
    setSelectedItem(item);
    if (item) {
      setEditedData({ ...item });
      fetchPetsForAppointment(item.id);
      if (mode === "createMedical") {
        // Initialize medical forms based on pets in the appointment
        const petsInAppointment = appointmentPets
          .map((ap) => allPets.find((p) => p.id === ap.id))
          .filter(Boolean);
        setMedicalForms(
          petsInAppointment.map((p) => ({
            petId: p!.id,
            title: `Check-up for ${p!.name}`,
            date: new Date().toISOString().split("T")[0],
            hospital_details: "",
            photos: [],
          }))
        );
      }
    }
    setModalMode(mode);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);
  const toggleSelectItem = (id: number) => {
    const newSelected = new Set(selectedItems);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedItems(newSelected);
  };
  const toggleSelectAll = () => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map((item) => item.id)));
    }
  };
  // #endregion

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header & Filters */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Appointments
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage all client bookings.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedItems.size > 0 ? (
                  <button
                    onClick={() => openModal(null, "delete")}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white rounded-lg shadow-sm hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete ({selectedItems.size})</span>
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by client name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-64"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 bg-white rounded-lg hover:bg-gray-50"
                    >
                      <Filter className="w-5 h-5 text-gray-500" />
                      <span>Filters</span>
                      <ChevronDown
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          showFilters ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <button
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-lg shadow-sm hover:bg-cyan-700"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {showFilters && (
              <div className="bg-gray-100 rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <select
                      value={filters.status}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, status: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All</option>
                      <option value="draft">Pending</option>
                      <option value="booked">Confirmed</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, startDate: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, endDate: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() =>
                        setFilters({
                          status: "all",
                          startDate: "",
                          endDate: "",
                        })
                      }
                      className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-100 rounded-md"
                    >
                      <X className="w-5 h-5" />
                      <span>Clear</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        selectedItems.size === filteredData.length &&
                        filteredData.length > 0
                      }
                      className="rounded"
                    />
                  </th>
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
                      colSpan={columns.length + 2}
                      className="text-center py-16"
                    >
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-gray-400" />
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16 text-red-500"
                    >
                      {error}
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((appt) => (
                    <tr key={appt.id} className="hover:bg-gray-50">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(appt.id)}
                          onChange={() => toggleSelectItem(appt.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4 text-sm text-gray-700">{`${appt.member_first_name} ${appt.member_last_name}`}</td>
                      <td className="p-4 text-sm text-gray-700">
                        {new Date(appt.date).toLocaleDateString()} at{" "}
                        {appt.time} {appt.time_slot}
                      </td>
                      <td className="p-4 text-sm text-gray-700">
                        <Users className="inline w-4 h-4 mr-2" />
                        {appt.number_of_pets} Pet(s)
                      </td>
                      <td className="p-4 text-sm">
                        <span
                          className={`capitalize px-2 py-1 text-xs rounded-full ${
                            appt.status === "booked"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {appt.status === "booked" ? "Confirmed" : "Pending"}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => openModal(appt, "view")}
                            title="View"
                          >
                            <Eye className="w-5 h-5 text-blue-600" />
                          </button>
                          <button
                            onClick={() => openModal(appt, "edit")}
                            title="Edit"
                          >
                            <Edit className="w-5 h-5 text-green-600" />
                          </button>
                          <button
                            onClick={() => openModal(appt, "delete")}
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16 text-gray-500"
                    >
                      No appointments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
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

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            {modalMode === "delete" ? (
              <div className="p-8 text-center flex flex-col items-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Confirm Deletion</h2>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to delete{" "}
                  {selectedItems.size > 0
                    ? `${selectedItems.size} appointments`
                    : `this appointment`}
                  ? This cannot be undone.
                </p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={closeModal}
                    className="px-6 py-2 border rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      handleDelete(
                        selectedItems.size > 0
                          ? Array.from(selectedItems)
                          : [selectedItem!.id]
                      )
                    }
                    disabled={isDeleting}
                    className="px-6 py-2 bg-red-600 text-white rounded-md flex items-center disabled:bg-red-400"
                  >
                    {isDeleting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}{" "}
                    Delete
                  </button>
                </div>
              </div>
            ) : modalMode === "createMedical" ? (
              <>
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold">Create Medical Records</h2>
                  <button onClick={closeModal}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                  {medicalForms.map((form) => {
                    const pet = allPets.find((p) => p.id === form.petId);
                    return (
                      <div key={form.petId} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-3 mb-4">
                          <img
                            src={pet?.image || ""}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <p className="font-bold">{pet?.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Hospital Details
                          </label>
                          <textarea
                            value={form.hospital_details}
                            onChange={(e) =>
                              handleMedicalFormChange(
                                form.petId,
                                "hospital_details",
                                e.target.value
                              )
                            }
                            className="mt-1 w-full p-2 border rounded-md h-24"
                          ></textarea>
                        </div>
                        <div className="mt-2">
                          <label className="text-sm font-medium">
                            Add Photos
                          </label>
                          <div className="grid grid-cols-4 gap-2 mt-1">
                            {form.photos.map((photo, i) => (
                              <img
                                key={i}
                                src={photo.imageData}
                                className="w-20 h-20 object-cover rounded-md"
                              />
                            ))}
                            <label className="cursor-pointer w-20 h-20 bg-gray-100 border-2 border-dashed rounded-lg flex items-center justify-center">
                              <UploadCloud className="w-6 h-6 text-gray-400" />
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={(e) =>
                                  handleMedicalPhotoUpload(form.petId, e)
                                }
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-6 border-t flex justify-end">
                  <button
                    onClick={handleCreateMedicalRecords}
                    disabled={isSaving}
                    className="px-6 py-3 bg-green-600 text-white rounded-md flex items-center disabled:bg-green-400"
                  >
                    {isSaving && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}{" "}
                    Save Records
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold">
                    {modalMode === "view"
                      ? "Appointment Details"
                      : "Edit Appointment"}
                  </h2>
                  <button onClick={closeModal}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium"> Name</label>
                      <p className="mt-1 p-3 bg-gray-100 rounded-md">{`${selectedItem?.member_first_name} ${selectedItem?.member_last_name}`}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <p className="mt-1 p-3 bg-gray-100 rounded-md">
                        {selectedItem?.member_phone}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date & Time</label>
                      <p className="mt-1 p-3 bg-gray-100 rounded-md">{`${new Date(
                        selectedItem!.date
                      ).toLocaleDateString()} at ${selectedItem?.time} ${
                        selectedItem?.time_slot
                      }`}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      {modalMode === "view" ? (
                        <p className="mt-1 p-3 bg-gray-100 rounded-md capitalize">
                          {selectedItem?.status === "booked"
                            ? "Confirmed"
                            : "Pending"}
                        </p>
                      ) : (
                        <select
                          value={editedData.status}
                          onChange={(e) =>
                            setEditedData((prev) => ({
                              ...prev,
                              status: e.target.value as "draft" | "booked",
                            }))
                          }
                          className="mt-1 w-full p-2 border rounded-md"
                        >
                          <option value="draft">Pending</option>
                          <option value="booked">Confirmed</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-md font-semibold mb-2">
                      Pets ({selectedItem?.number_of_pets})
                    </h3>
                    <div className="p-3 bg-gray-50 rounded-md space-y-3">
                      {loadingPets ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : appointmentPets.length > 0 ? (
                        appointmentPets.map((pet) => (
                          <div
                            key={pet.id}
                            className="p-2 border-b last:border-b-0"
                          >
                            <p className="font-bold">
                              {pet.name}{" "}
                              <span className="font-normal text-gray-600">
                                ({pet.type})
                              </span>
                            </p>
                            <p className="text-sm text-gray-500">
                              Purpose: {pet.purpose_of_visit}
                            </p>
                            {pet.memo && (
                              <p className="text-xs text-gray-500 mt-1">
                                Memo: {pet.memo}
                              </p>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-600">
                          No pet details found.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                  {modalMode === "view" &&
                    selectedItem?.status === "booked" && (
                      <button
                        onClick={() => openModal(selectedItem, "createMedical")}
                        className="px-6 py-3 bg-blue-600 text-white rounded-md flex items-center"
                      >
                        <FilePlus2 className="w-4 h-4 mr-2" /> Create Medical
                        Record
                      </button>
                    )}
                  {modalMode === "edit" && (
                    <button
                      onClick={handleUpdateStatus}
                      disabled={isSaving}
                      className="px-6 py-3 bg-green-600 text-white rounded-md flex items-center disabled:bg-green-400"
                    >
                      {isSaving && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}{" "}
                      Confirm Booking
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsPage;
