"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { AdminService, PaginatedResponse } from "@/utils/services"; // Adjust the import path

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  editable?: boolean;
}

interface CommonTableProps {
  title: string;
  tableName: string; // New prop to specify the table
  columns: Column[];
  searchableFields?: string[];
  dateField?: string;
  onExport?: (data: any[]) => void;
  itemsPerPage?: number;
}

const CommonTable: React.FC<CommonTableProps> = ({
  title,
  tableName,
  columns,
  searchableFields = [],
  dateField,
  onExport,
  itemsPerPage = 10,
}) => {
  // Data state
  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: itemsPerPage,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState({ start: "", end: "" });
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal and editing states
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit">("view");
  const [editedData, setEditedData] = useState<any>({});

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(
    new Set()
  );
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Data fetching function
  const fetchData = useCallback(
    async (page = 1, limit = itemsPerPage) => {
      setLoading(true);
      setError(null);
      try {
        const response = await AdminService.getPaginatedData(
          tableName,
          page,
          limit
        );
        setData(response.data);
        setPagination(response.pagination);
      } catch (err) {
        setError(`Failed to fetch data from ${tableName}.`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [tableName, itemsPerPage]
  );

  useEffect(() => {
    fetchData(pagination.page, pagination.limit);
  }, [fetchData, pagination.page, pagination.limit]);

  // Get unique statuses for filter dropdown
  const uniqueStatuses = useMemo(() => {
    const statuses = data.map((item) => item.status).filter(Boolean);
    return ["all", ...Array.from(new Set(statuses))];
  }, [data]);

  // Memoized data processing (search, filter, sort)
  const processedData = useMemo(() => {
    let filtered = data;
    // Client-side search (can be adapted for server-side)
    if (searchTerm && searchableFields.length > 0) {
      filtered = filtered.filter((item) =>
        searchableFields.some((field) =>
          item[field]
            ?.toString()
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )
      );
    }
    // Sorting
    if (sortField) {
      filtered.sort((a, b) => {
        if (a[sortField] < b[sortField])
          return sortDirection === "asc" ? -1 : 1;
        if (a[sortField] > b[sortField])
          return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [data, searchTerm, searchableFields, sortField, sortDirection]);

  // Handlers
  const handleUpdate = async () => {
    if (!selectedItem) return;
    try {
      await AdminService.updateRecord(tableName, selectedItem.id, editedData);
      closeModal();
      fetchData(pagination.page); // Refetch data
    } catch (err) {
      alert(`Failed to update record.`);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        await AdminService.deleteRecords(tableName, [id]);
        fetchData(pagination.page);
        closeModal();
      } catch (err) {
        alert(`Failed to delete record.`);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedItems.size} items?`
      )
    ) {
      try {
        await AdminService.deleteRecords(tableName, Array.from(selectedItems));
        setSelectedItems(new Set());
        setIsAllSelected(false);
        fetchData(1); // Go back to first page after bulk delete
      } catch (err) {
        alert(`Failed to delete records.`);
      }
    }
  };

  const handleExport = () => {
    if (onExport) {
      onExport(processedData);
    } else {
      // Default export
      const csvContent = [
        columns.map((col) => col.label).join(","),
        ...processedData.map((row) =>
          columns.map((col) => `"${row[col.key] || ""}"`).join(",")
        ),
      ].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `${tableName}_export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Modal and selection functions
  const openModal = (item: any, mode: "view" | "edit") => {
    setSelectedItem(item);
    setEditedData({ ...item });
    setModalMode(mode);
    setIsModalOpen(true);
  };
  const closeModal = () => setIsModalOpen(false);
  const toggleSelectItem = (id: string | number) => {
    const newSelected = new Set(selectedItems);
    newSelected.has(id) ? newSelected.delete(id) : newSelected.add(id);
    setSelectedItems(newSelected);
  };
  const toggleSelectAll = () => {
    if (selectedItems.size === processedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(processedData.map((item) => item.id)));
    }
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex flex-col space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#222222] tracking-tight">
                  {title}
                </h1>
                <p className="text-[#C7C7CC] text-sm mt-1">
                  Manage and view your data efficiently
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {selectedItems.size > 0 ? (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 shadow-sm font-medium"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>Delete ({selectedItems.size})</span>
                  </button>
                ) : (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#C7C7CC] w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-12 pr-4 py-3 border border-[#E5E5EA] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3cd3e1] w-full sm:w-80 shadow-sm"
                      />
                    </div>
                    <button
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-[#3cd3e1] text-white rounded-xl hover:bg-[#2bc5d3] shadow-sm font-medium"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="max-w-7xl mx-auto px-8 pb-8 mt-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-6 py-5 text-left">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        selectedItems.size === processedData.length &&
                        processedData.length > 0
                      }
                      className="w-4 h-4 text-[#3cd3e1] border-gray-300 rounded focus:ring-[#3cd3e1]"
                    />
                  </th>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-5 text-left text-gray-700 font-semibold text-sm uppercase tracking-wider"
                    >
                      {column.label}
                    </th>
                  ))}
                  <th className="px-6 py-5 text-left text-gray-700 font-semibold text-sm uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={columns.length + 2}
                      className="text-center py-16"
                    >
                      <Loader2 className="w-8 h-8 mx-auto animate-spin text-[#3cd3e1]" />
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
                ) : processedData.length > 0 ? (
                  processedData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-5">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(row.id)}
                          onChange={() => toggleSelectItem(row.id)}
                          className="w-4 h-4 text-[#3cd3e1] border-gray-300 rounded focus:ring-[#3cd3e1]"
                        />
                      </td>
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className="px-6 py-5 text-[#222222] font-medium whitespace-nowrap"
                        >
                          {row[column.key] || "—"}
                        </td>
                      ))}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openModal(row, "view")}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openModal(row, "edit")}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(row.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
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
                      No data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-8">
            <p className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchData(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 border rounded-xl disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchData(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border rounded-xl disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {modalMode === "view" ? "View Details" : "Edit Details"}
              </h2>
              <button onClick={closeModal}>
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
              {columns.map((column) => (
                <div key={column.key}>
                  <label className="block text-sm font-medium text-gray-700 capitalize">
                    {column.label}
                  </label>
                  {modalMode === "view" || !column.editable ? (
                    <p className="mt-1 p-3 bg-gray-100 rounded-lg">
                      {selectedItem[column.key] || "—"}
                    </p>
                  ) : (
                    <input
                      type="text"
                      value={editedData[column.key] || ""}
                      onChange={(e) =>
                        setEditedData((prev) => ({
                          ...prev,
                          [column.key]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full p-3 border rounded-lg focus:ring-2 focus:ring-[#3cd3e1]"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-6 py-3 border rounded-xl"
              >
                Close
              </button>
              {modalMode === "edit" && (
                <button
                  onClick={handleUpdate}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl"
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommonTable;
