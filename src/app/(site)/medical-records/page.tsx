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
  UploadCloud,
} from "lucide-react";
import { AdminService } from "@/utils/services"; // Adjust the import path
import { exportToExcel } from "@/utils/exortToExcel"; // Adjust the import path
import { useRouter } from "next/navigation";

// Define the structure of a Pet object
interface Pet {
  id: number;
  name: string;
  image: string;
}

// Define the structure for a photo associated with a medical record
interface MedicalRecordPhoto {
  imageData: string;
  uploaded_by: "user" | "hospital";
}

// Define the structure of a Medical Record object
interface MedicalRecord {
  id: number;
  pet_id: number;
  title: string;
  date: string;
  user_details: string | null;
  hospital_details: string | null;
  created_at: string;
  photos: MedicalRecordPhoto[]; // This will be joined on the client
}

const MedicalRecordsPage: React.FC = () => {
  const router = useRouter();
  // Data and API states
  const [records, setRecords] = useState<MedicalRecord[]>([]);
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
    petId: "all",
    startDate: "",
    endDate: "",
  });

  // Modal and editing states
  const [selectedItem, setSelectedItem] = useState<MedicalRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "delete">(
    "view"
  );
  const [editedData, setEditedData] = useState<Partial<MedicalRecord>>({});
  const [newHospitalPhotos, setNewHospitalPhotos] = useState<string[]>([]); // For new base64 uploads
  const [modalError, setModalError] = useState<string | null>(null);

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const tableName = "medical_records";
  const columns = [
    { key: "pet_name", label: "Pet Name" },

    { key: "date", label: "Date" },
    { key: "user_details", label: "User Details" },
    { key: "hospital_details", label: "Hospital Details" },
  ];

  // Data fetching
  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const [recordResponse, petsResponse, photosResponse] =
          await Promise.all([
            AdminService.getPaginatedData<Omit<MedicalRecord, "photos">>(
              tableName,
              page,
              pagination.limit
            ),
            AdminService.getPaginatedData<Pet>("pets", 1, 1000), // Fetch all pets
            AdminService.getPaginatedData<any>(
              "medical_record_photos",
              1,
              1000
            ), // Fetch all photos
          ]);

        // Join photos with their records
        const recordsWithPhotos = recordResponse.data.map((record) => ({
          ...record,
          photos: photosResponse.data
            .filter((p) => p.medical_record_id === record.id)
            .map((p) => ({
              imageData: p.image_data,
              uploaded_by: p.uploaded_by,
            })),
        }));

        setRecords(recordsWithPhotos);
        setAllPets(petsResponse.data);
        setPagination(recordResponse.pagination);
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

  // Client-side filtering and searching
  const filteredData = useMemo(() => {
    return records.filter((record) => {
      const pet = allPets.find((p) => p.id === record.pet_id);
      const searchMatch = searchTerm
        ? record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pet?.name.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const petMatch =
        filters.petId === "all" || String(record.pet_id) === filters.petId;

      const date = new Date(record.date);
      const startDate = filters.startDate ? new Date(filters.startDate) : null;
      const endDate = filters.endDate ? new Date(filters.endDate) : null;
      if (startDate) startDate.setHours(0, 0, 0, 0);
      if (endDate) endDate.setHours(23, 59, 59, 999);
      const dateMatch =
        (!startDate || date >= startDate) && (!endDate || date <= endDate);

      return searchMatch && petMatch && dateMatch;
    });
  }, [records, allPets, searchTerm, filters]);

  // Handlers
  const handleUpdate = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    setModalError(null);
    try {
      // Update the main record details (like hospital_details)
      await AdminService.updateRecord(tableName, selectedItem.id, {
        hospital_details: editedData.hospital_details,
      });

      // If there are new photos, create them
      if (newHospitalPhotos.length > 0) {
        // This would ideally be a single bulk-create API call
        for (const photoData of newHospitalPhotos) {
          // CORRECTED: Use a createRecord method.
          // NOTE: You must add a generic `createRecord` method to your AdminService and a corresponding POST endpoint to your backend.
          await (AdminService as any).createRecord("medical_record_photos", {
            medical_record_id: selectedItem.id,
            image_data: photoData,
            uploaded_by: "hospital",
          });
        }
      }
      closeModal();
      fetchData(pagination.page);
    } catch (err) {
      console.error("Failed to update record:", err);
      setModalError("Failed to update record. Please try again.");
    } finally {
      setIsSaving(false);
      setNewHospitalPhotos([]);
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
    const formattedData = filteredData.map((record) => {
      const pet = allPets.find((p) => p.id === record.pet_id);
      return {
        "Record ID": record.id,
        "Pet Name": pet?.name || "N/A",
        Title: record.title,
        Date: new Date(record.date).toLocaleDateString(),
        "User Details": record.user_details,
        "Hospital Details": record.hospital_details,
      };
    });
    exportToExcel(formattedData, "Medical_Records");
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewHospitalPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Modal and selection functions
  const openModal = (
    item: MedicalRecord | null,
    mode: "view" | "edit" | "delete"
  ) => {
    setSelectedItem(item);
    if (item) setEditedData({ ...item });
    setModalMode(mode);
    setIsModalOpen(true);
    setModalError(null); // Reset error on open
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
    setNewHospitalPhotos([]);
    setModalError(null);
  };
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

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Medical Records
                </h1>
                <p className="text-gray-500 text-sm mt-1">
                  Manage all medical history and documents.
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
                        placeholder="Search by title, pet..."
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
                      Pet
                    </label>
                    <select
                      value={filters.petId}
                      onChange={(e) =>
                        setFilters((f) => ({ ...f, petId: e.target.value }))
                      }
                      className="mt-1 w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="all">All Pets</option>
                      {allPets.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
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
                        setFilters({ petId: "all", startDate: "", endDate: "" })
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
                  filteredData.map((record) => {
                    const pet = allPets.find((p) => p.id === record.pet_id);
                    return (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedItems.has(record.id)}
                            onChange={() => toggleSelectItem(record.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="p-4 text-sm text-gray-700 flex items-center gap-3">
                          <img
                            src={pet?.image || "https://placehold.co/40x40"}
                            alt={pet?.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          {pet?.name || "N/A"}
                        </td>

                        <td className="p-4 text-sm text-gray-700">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm text-gray-500 truncate  max-w-3xs">
                          {record.user_details || "—"}
                        </td>
                        <td className="p-4 text-sm text-gray-500 truncate max-w-3xs">
                          {record.hospital_details || "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(record, "view")}
                              title="View"
                            >
                              <Eye className="w-5 h-5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => openModal(record, "edit")}
                              title="Edit"
                            >
                              <Edit className="w-5 h-5 text-green-600" />
                            </button>
                            <button
                              onClick={() => openModal(record, "delete")}
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5 text-red-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16 text-gray-500"
                    >
                      No records found.
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

      {/* Modals */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            {modalMode === "delete" ? (
              <div className="p-8 text-center flex flex-col items-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold mb-2">Confirm Deletion</h2>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to delete{" "}
                  {selectedItems.size > 0
                    ? `${selectedItems.size} records`
                    : `this record`}
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
            ) : (
              <>
                <div className="p-6 border-b flex justify-between items-center">
                  <h2 className="text-xl font-bold">
                    {modalMode === "view"
                      ? "Medical Record Details"
                      : "Edit Medical Record"}
                  </h2>
                  <button onClick={closeModal}>
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
                  {/* Pet Info */}
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <img
                      src={
                        allPets.find((p) => p.id === selectedItem?.pet_id)
                          ?.image || "https://placehold.co/60x60"
                      }
                      alt="pet"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-bold text-lg">
                        {
                          allPets.find((p) => p.id === selectedItem?.pet_id)
                            ?.name
                        }
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedItem?.title} -{" "}
                        {new Date(selectedItem!.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {/* Details */}
                  <div>
                    <label className="text-sm font-medium">User Details</label>
                    <p className="mt-1 p-3 bg-gray-100 rounded-md min-h-[100px] text-sm">
                      {selectedItem?.user_details ||
                        "No details provided by user."}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Hospital Details
                    </label>
                    {modalMode === "view" ? (
                      <p className="mt-1 p-3 bg-gray-100 rounded-md min-h-[100px] text-sm">
                        {selectedItem?.hospital_details ||
                          "No details provided by hospital."}
                      </p>
                    ) : (
                      <textarea
                        value={editedData.hospital_details || ""}
                        onChange={(e) =>
                          setEditedData((prev) => ({
                            ...prev,
                            hospital_details: e.target.value,
                          }))
                        }
                        className="mt-1 w-full p-2 border rounded-md h-28"
                        placeholder="Enter hospital notes, diagnosis, etc."
                      ></textarea>
                    )}
                  </div>
                  {/* Photos */}
                  <div>
                    <h3 className="text-md font-semibold mb-2">Photos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedItem?.photos.map((photo, i) => (
                        <div key={i} className="relative">
                          <img
                            src={photo.imageData}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <span
                            className={`absolute top-1 left-1 text-xs px-2 py-0.5 rounded-full text-white ${
                              photo.uploaded_by === "user"
                                ? "bg-blue-500"
                                : "bg-green-500"
                            }`}
                          >
                            {photo.uploaded_by}
                          </span>
                        </div>
                      ))}
                      {newHospitalPhotos.map((photo, i) => (
                        <div key={`new-${i}`} className="relative">
                          <img
                            src={photo}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <span className="absolute top-1 left-1 text-xs px-2 py-0.5 rounded-full text-white bg-purple-500">
                            New
                          </span>
                        </div>
                      ))}
                      {modalMode === "edit" && (
                        <label className="cursor-pointer w-full h-32 bg-gray-100 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 hover:bg-gray-200">
                          <UploadCloud className="w-8 h-8" />
                          <span className="text-sm mt-1">Add Photo</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  {modalError && (
                    <p className="text-red-500 text-sm text-center">
                      {modalError}
                    </p>
                  )}
                </div>
                {modalMode === "edit" && (
                  <div className="p-6 border-t flex justify-end">
                    <button
                      onClick={handleUpdate}
                      disabled={isSaving}
                      className="px-6 py-3 bg-green-600 text-white rounded-md flex items-center disabled:bg-green-400"
                    >
                      {isSaving && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}{" "}
                      Save Changes
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecordsPage;
