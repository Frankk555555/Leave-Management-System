import React, { useState, useMemo } from "react";
import { usersAPI, departmentsAPI, facultiesAPI } from "../services/api";
import {
  useUsers,
  useSupervisors,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from "../hooks/queries/useUsers";
import {
  useFaculties,
  useDepartments,
} from "../hooks/queries/useReferenceData";
import { useToast } from "../components/common/Toast";
import Loading from "../components/common/Loading";
import {
  FaUsers,
  FaPlus,
  FaEdit,
  FaTrash,
  FaHospital,
  FaClipboardList,
  FaUmbrellaBeach,
  FaKey,
  FaFileImport,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle,
  FaBaby,
  FaUserFriends,
  FaChild,
  FaPray,
  FaMedal,
  FaDatabase,
  FaNetworkWired,
  FaCog,
  FaLink,
  FaSpinner,
} from "react-icons/fa";
import "./UserManagement.css";

const mapUserBalances = (u) => {
  const leaveBalance = {
    sick: 0,
    personal: 0,
    vacation: 0,
    maternity: 0,
    paternity: 0,
    childcare: 0,
    ordination: 0,
    military: 0,
  };
  const leaveBalanceTotal = {
    sick: 60,
    personal: 45,
    vacation: 10,
    maternity: 90,
    paternity: 15,
    childcare: 150,
    ordination: 120,
    military: 60,
  };
  if (u.leaveBalances && Array.isArray(u.leaveBalances)) {
    u.leaveBalances.forEach((bal) => {
      const code = bal.leaveType?.code;
      if (code && leaveBalance[code] !== undefined) {
        const total = parseFloat(bal.totalDays || 0);
        const carried = parseFloat(bal.carriedOverDays || 0);
        const used = parseFloat(bal.usedDays || 0);
        leaveBalance[code] = total + carried - used;
        leaveBalanceTotal[code] = total;
      }
    });
  }
  return {
    ...u,
    leaveBalance,
    leaveBalanceTotal,
  };
};

const UserManagement = () => {
  const toast = useToast();

  const { data: usersData = [], isLoading: loading } = useUsers();
  const { data: supervisors = [] } = useSupervisors();
  const { data: faculties = [] } = useFaculties();

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const { data: departments = [] } = useDepartments(selectedFacultyId);

  // Reset password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [userToReset, setUserToReset] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  // Searchable supervisor state
  const [supervisorDropdownOpen, setSupervisorDropdownOpen] = useState(false);
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState("");

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  // Search & Filter state for user directory
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const { data: filterDepartments = [] } = useDepartments(filterFaculty);

  // Collapsible user details state
  const [expandedUserId, setExpandedUserId] = useState(null);

  const users = useMemo(() => {
    return [...usersData]
      .sort((a, b) =>
        a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true }),
      )
      .map(mapUserBalances);
  }, [usersData]);

  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    departmentId: "",
    position: "",
    role: "employee",
    supervisorId: "",
    startDate: "",
    governmentDivision: "",
    documentNumber: "",
    unit: "",
    affiliation: "",
    leaveBalance: {
      sick: 60,
      personal: 45,
      vacation: 10,
      maternity: 90,
      paternity: 15,
      childcare: 150,
      ordination: 120,
      military: 60,
    },
  });

  // Memoized user filter selector
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // ค้นหาข้อความ
      const fullName =
        `${user.firstName || ""} ${user.lastName || ""}`.toLowerCase();
      const empId = (user.employeeId || "").toLowerCase();
      const email = (user.email || "").toLowerCase();
      const pos = (user.position || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        fullName.includes(q) ||
        empId.includes(q) ||
        email.includes(q) ||
        pos.includes(q);

      // บทบาท
      const matchesRole = filterRole === "all" || user.role === filterRole;

      // คณะ
      const userFacultyId =
        user.department?.facultyId || user.department?.faculty?.id || "";
      const matchesFaculty =
        filterFaculty === "all" ||
        String(userFacultyId) === String(filterFaculty);

      // สาขา
      const userDeptId = user.departmentId || user.department?.id || "";
      const matchesDept =
        filterDepartment === "all" ||
        String(userDeptId) === String(filterDepartment);

      return matchesSearch && matchesRole && matchesFaculty && matchesDept;
    });
  }, [users, searchQuery, filterRole, filterFaculty, filterDepartment]);

  const toggleUserExpand = (userId) => {
    setExpandedUserId(expandedUserId === userId ? null : userId);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("leaveBalance.")) {
      const field = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        leaveBalance: { ...prev.leaveBalance, [field]: parseInt(value) || 0 },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const openModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      // Set faculty and fetch departments for this user
      const userFacultyId =
        user.department?.facultyId || user.department?.faculty?.id || "";
      if (userFacultyId) {
        setSelectedFacultyId(userFacultyId.toString());
      } else {
        setSelectedFacultyId("");
      }
      setFormData({
        employeeId: user.employeeId,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: "",
        departmentId: user.departmentId || user.department?.id || "",
        position: user.position || "",
        role: user.role,
        supervisorId: user.supervisorId || user.supervisor?.id || "",
        startDate: user.startDate ? user.startDate.split("T")[0] : "",
        governmentDivision: user.governmentDivision || "",
        documentNumber: user.documentNumber || "",
        unit: user.unit || "",
        affiliation: user.affiliation || "",
        leaveBalance: user.leaveBalanceTotal ||
          user.leaveBalance || {
            sick: 60,
            personal: 45,
            vacation: 10,
            maternity: 90,
            paternity: 15,
            childcare: 150,
            ordination: 120,
            military: 60,
          },
      });
    } else {
      setEditingUser(null);
      setFormData({
        employeeId: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        departmentId: "",
        position: "",
        role: "employee",
        supervisorId: "",
        startDate: "",
        governmentDivision: "",
        documentNumber: "",
        unit: "",
        affiliation: "",
        leaveBalance: {
          sick: 60,
          personal: 45,
          vacation: 10,
          maternity: 90,
          paternity: 15,
          childcare: 150,
          ordination: 120,
          military: 60,
        },
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSupervisorDropdownOpen(false);
    setSupervisorSearchQuery("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (!dataToSend.password) delete dataToSend.password;
      if (!dataToSend.supervisorId) dataToSend.supervisorId = null;

      if (editingUser) {
        // Map the flat leaveBalance object back to leaveBalances array for backend
        const leaveBalances = Object.keys(formData.leaveBalance)
          .map((code) => {
            const origBal = editingUser.leaveBalances?.find(
              (b) => b.leaveType?.code === code,
            );
            return {
              leaveTypeId: origBal?.leaveTypeId,
              totalDays: formData.leaveBalance[code],
              usedDays: origBal?.usedDays || 0,
              carriedOverDays: origBal?.carriedOverDays || 0,
              year: origBal?.year || new Date().getFullYear(),
            };
          })
          .filter((lb) => lb.leaveTypeId !== undefined);

        dataToSend.leaveBalances = leaveBalances;
        delete dataToSend.leaveBalance;

        await updateUserMutation.mutateAsync({
          id: editingUser.id || editingUser._id,
          data: dataToSend,
        });
        toast.success("แก้ไขข้อมูลบุคลากรเรียบร้อยแล้ว");
      } else {
        await createUserMutation.mutateAsync(dataToSend);
        toast.success("เพิ่มบุคลากรเรียบร้อยแล้ว");
      }
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (user) => {
    const confirmed = await toast.confirm(`คุณต้องการลบ ${user.firstName} ${user.lastName} หรือไม่?`);
    if (!confirmed) return;
    try {
      await deleteUserMutation.mutateAsync(user.id || user._id);
      toast.success("ลบบุคลากรเรียบร้อยแล้ว");
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const getRoleName = (role) => {
    const roles = {
      admin: "ผู้ดูแลระบบ",
      head: "หัวหน้างาน",
      employee: "บุคลากร",
    };
    return roles[role] || role;
  };

  // Reset password handlers
  const openResetModal = (user) => {
    setUserToReset(user);
    setNewPassword("");
    setResetModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!userToReset) return;

    try {
      await usersAPI.resetPassword(
        userToReset.id || userToReset._id,
        newPassword,
      );
      toast.success(
        `รีเซ็ตรหัสผ่านของ ${userToReset.firstName} ${userToReset.lastName} เรียบร้อยแล้ว`,
      );
      setResetModalOpen(false);
      setUserToReset(null);
      setNewPassword("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน",
      );
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: {
        bg: "#fee2e2",
        color: "#991b1b",
      },
      head: {
        bg: "#e0e7ff",
        color: "#3730a3",
      },
      employee: {
        bg: "#f1f5f9",
        color: "#334155",
      },
    };
    const style = styles[role] || styles.employee;
    return (
      <span
        className="role-badge"
        style={{ background: style.bg, color: style.color }}
      >
        {getRoleName(role)}
      </span>
    );
  };

  // Import & Sync states
  const [importTab, setImportTab] = useState("file"); // "file", "db", "api"
  const [dbConfig, setDbConfig] = useState({
    host: "localhost",
    port: "3307",
    database: "leave_management",
    user: "root",
    password: "",
    query: "SELECT * FROM mock_university_personnel",
  });
  const [apiConfig, setApiConfig] = useState({
    url: "http://localhost:5000/api/users/mock-university-api",
    headers: "",
  });
  const [sourceColumns, setSourceColumns] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [mapping, setMapping] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    role: "",
    departmentId: "",
    supervisorId: "",
    phone: "",
    startDate: "",
    governmentDivision: "",
    documentNumber: "",
    unit: "",
    affiliation: "",
    defaultPassword: "TempPassword123",
  });
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);

  const openImportModal = () => {
    setImportModalOpen(true);
    setImportFile(null);
    setImportResults(null);
    setImportTab("file");
    setIsPreviewed(false);
    setSourceColumns([]);
    setPreviewRows([]);
    setPreviewPage(1);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResults(null);
  };

  const handlePreviewFile = async (e) => {
    e.preventDefault();
    if (!importFile) {
      toast.error("กรุณาเลือกไฟล์");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const response = await usersAPI.previewImportFile(formData);

      const { columns, preview } = response.data;
      setSourceColumns(columns);
      setPreviewRows(preview);
      setPreviewPage(1);
      setIsPreviewed(true);
      toast.success("อ่านไฟล์สำเร็จ ตรวจสอบข้อมูลก่อนยืนยันนำเข้า");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการอ่านไฟล์",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleImportUsers = async () => {
    if (!importFile) {
      toast.error("กรุณาเลือกไฟล์");
      return;
    }

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const response = await usersAPI.importUsers(formData);
      setImportResults(response.data.results);
      toast.success(response.data.message);
      queryClient.invalidateQueries(["users"]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    try {
      let response;
      if (importTab === "db") {
        response = await usersAPI.previewDbSync(dbConfig);
      } else {
        response = await usersAPI.previewApiSync(apiConfig);
      }

      const { columns, preview } = response.data;
      setSourceColumns(columns);
      setPreviewRows(preview);

      // Auto-detect mappings based on column names (fuzzy matching!)
      const detectedMapping = {
        employeeId:
          columns.find((c) =>
            ["employeeid", "empid", "emp_id", "id", "รหัส"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        firstName:
          columns.find((c) =>
            [
              "firstname",
              "name",
              "first_name",
              "fname",
              "ชื่อ",
              "ชื่อจริง",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        lastName:
          columns.find((c) =>
            ["lastname", "last_name", "lname", "นามสกุล"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        email:
          columns.find((c) =>
            [
              "email",
              "emailaddress",
              "email_address",
              "mail",
              "อีเมล",
              "อีเมล์",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        position:
          columns.find((c) =>
            [
              "position",
              "positiontitle",
              "position_title",
              "job",
              "ตำแหน่ง",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        role:
          columns.find((c) =>
            ["role", "rolename", "role_name", "บทบาท"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        departmentId:
          columns.find((c) =>
            [
              "department",
              "departmentid",
              "department_id",
              "dept",
              "deptname",
              "dept_name",
              "สาขา",
              "แผนก",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        supervisorId:
          columns.find((c) =>
            ["supervisor", "supervisorid", "supervisor_id", "หัวหน้า"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        phone:
          columns.find((c) =>
            [
              "phone",
              "phonenumber",
              "phone_no",
              "tel",
              "เบอร์โทร",
              "โทรศัพท์",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        startDate:
          columns.find((c) =>
            ["startdate", "start_date", "hiredate", "วันเริ่มงาน"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        governmentDivision:
          columns.find((c) =>
            [
              "governmentdivision",
              "government_division",
              "ส่วนราชการ",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        documentNumber:
          columns.find((c) =>
            ["documentnumber", "document_number", "เลขหนังสือ"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        unit:
          columns.find((c) =>
            ["unit", "หน่วยงาน"].includes(
              c.toLowerCase().replace(/[^a-zก-๙]/g, ""),
            ),
          ) || "",
        affiliation:
          columns.find((c) =>
            [
              "affiliation",
              "faculty",
              "faculty_name",
              "สังกัด",
              "คณะ",
            ].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, "")),
          ) || "",
        defaultPassword: "TempPassword123",
      };

      setMapping(detectedMapping);
      setIsPreviewed(true);
      toast.success("เชื่อมต่อสำเร็จ ดึงข้อมูลตัวอย่างเรียบร้อย");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "เชื่อมต่อล้มเหลว ตรวจสอบการตั้งค่าอีกครั้ง",
      );
    } finally {
      setIsTestingConn(false);
    }
  };

  const handleSyncSubmit = async (e) => {
    e.preventDefault();
    setImporting(true);
    try {
      let response;
      if (importTab === "db") {
        response = await usersAPI.executeDbSync({
          ...dbConfig,
          mapping,
        });
      } else {
        response = await usersAPI.executeApiSync({
          ...apiConfig,
          mapping,
        });
      }
      setImportResults(response.data.results);
      toast.success(response.data.message);
      queryClient.invalidateQueries(["users"]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล",
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSetupMockDb = async () => {
    setImporting(true);
    try {
      const response = await usersAPI.setupMockDb();
      toast.success(response.data.message);
      setDbConfig((prev) => ({
        ...prev,
        query: "SELECT * FROM mock_university_personnel",
      }));
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการสร้างตารางจำลอง",
      );
    } finally {
      setImporting(false);
    }
  };

  const renderMappingUI = () => {
    const targetFields = [
      { key: "employeeId", label: "รหัสพนักงาน *", required: true },
      { key: "firstName", label: "ชื่อจริง *", required: true },
      { key: "lastName", label: "นามสกุล *", required: true },
      { key: "email", label: "อีเมล *", required: true },
      { key: "position", label: "ตำแหน่งงาน *", required: true },
      { key: "role", label: "บทบาทระบบ", required: false },
      { key: "departmentId", label: "แผนก/สาขาวิชา", required: false },
      { key: "supervisorId", label: "หัวหน้างาน", required: false },
      { key: "phone", label: "เบอร์โทรศัพท์", required: false },
      { key: "startDate", label: "วันเริ่มงาน", required: false },
      { key: "governmentDivision", label: "ส่วนราชการ", required: false },
      { key: "documentNumber", label: "เลขหนังสือ", required: false },
      { key: "unit", label: "หน่วยงาน", required: false },
      { key: "affiliation", label: "คณะ/สังกัด", required: false },
      { key: "password", label: "รหัสผ่านในระบบเดิม (ถ้ามี)", required: false },
    ];

    return (
      <div className="mapping-section">
        <h4 className="section-subtitle">
          <FaCog /> กำหนดความเชื่อมโยงของข้อมูล (Field Mapping)
        </h4>
        <p className="section-help-text">
          จับคู่คอลัมน์คีย์จากฐานข้อมูลต้นทางให้ตรงกับฟิลด์ข้อมูลในระบบวันลา
        </p>
        <div className="mapping-grid">
          {targetFields.map((field) => (
            <div className="form-group mapping-item" key={field.key}>
              <label>{field.label}</label>
              <select
                value={mapping[field.key] || ""}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [field.key]: e.target.value,
                  }))
                }
                required={field.required}
              >
                <option value="">-- ไม่เชื่อมโยง (เว้นว่าง/ข้าม) --</option>
                {sourceColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div className="form-group mapping-item">
            <label>รหัสผ่านเริ่มต้น (กรณีไม่มีคอลัมน์รหัสผ่าน)</label>
            <input
              type="text"
              value={mapping.defaultPassword || ""}
              onChange={(e) =>
                setMapping((prev) => ({
                  ...prev,
                  defaultPassword: e.target.value,
                }))
              }
              placeholder="Welcome@2026"
            />
          </div>
        </div>
      </div>
    );
  };

  const renderDataPreview = () => {
    if (!previewRows || previewRows.length === 0) return null;

    const rowsPerPage = 5;
    const totalPages = Math.ceil(previewRows.length / rowsPerPage);
    const startIdx = (previewPage - 1) * rowsPerPage;
    const currentRows = previewRows.slice(startIdx, startIdx + rowsPerPage);

    return (
      <div className="preview-section">
        <h4 className="section-subtitle">
          <FaUsers /> ข้อมูลตัวอย่าง (พบทั้งหมด {previewRows.length} แถว)
        </h4>
        <div className="preview-table-wrapper">
          <table className="preview-table">
            <thead>
              <tr>
                {sourceColumns.map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row, idx) => (
                <tr key={startIdx + idx}>
                  {sourceColumns.map((col) => (
                    <td key={col}>
                      {String(
                        row[col] !== null && row[col] !== undefined
                          ? row[col]
                          : "",
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div
            className="pagination"
            style={{
              marginTop: "1rem",
              display: "flex",
              justifyContent: "center",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              className="page-btn"
              disabled={previewPage === 1}
              onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: previewPage === 1 ? "#eee" : "#fff",
                cursor: previewPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              ก่อนหน้า
            </button>
            <span style={{ fontSize: "0.9rem" }}>
              หน้า {previewPage} จาก {totalPages}
            </span>
            <button
              type="button"
              className="page-btn"
              disabled={previewPage === totalPages}
              onClick={() => setPreviewPage((p) => Math.min(totalPages, p + 1))}
              style={{
                padding: "6px 12px",
                borderRadius: "4px",
                border: "1px solid #ccc",
                background: previewPage === totalPages ? "#eee" : "#fff",
                cursor: previewPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              ถัดไป
            </button>
          </div>
        )}
      </div>
    );
  };

  // Download Excel template สำหรับนำเข้าข้อมูลบุคลากร
  const downloadTemplate = async () => {
    try {
      const response = await usersAPI.downloadImportTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "user_import_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("ไม่สามารถดาวน์โหลดไฟล์ตัวอย่างได้");
    }
  };

  const selectedSupervisor = supervisors.find(
    (sup) => String(sup.id) === String(formData.supervisorId),
  );
  const selectedSupervisorName = selectedSupervisor
    ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}`
    : "";

  const filteredSupervisors = useMemo(() => {
    return supervisors.filter((sup) => {
      const fullName = `${sup.firstName} ${sup.lastName}`.toLowerCase();
      const query = supervisorSearchQuery.toLowerCase();
      const deptName = sup.department?.name?.toLowerCase() || "";
      const position = sup.position?.toLowerCase() || "";
      return (
        fullName.includes(query) ||
        deptName.includes(query) ||
        position.includes(query)
      );
    });
  }, [supervisors, supervisorSearchQuery]);

  if (loading) {
    return (
      <>
        <Loading size="fullpage" text="กำลังโหลด..." />
      </>
    );
  }

  return (
    <>
      <div className="user-management-page">
        <div className="page-header">
          <div>
            <h1>จัดการบุคลากร</h1>
            <p>จัดการข้อมูลบุคลากรในระบบ ({users.length} คน)</p>
          </div>
          <div className="header-actions">
            <button className="import-btn" onClick={openImportModal}>
              <FaFileImport />
              นำเข้าข้อมูล
            </button>
            <button className="add-btn" onClick={() => openModal()}>
              <FaPlus />
              เพิ่มบุคลากร
            </button>
          </div>
        </div>

        {/* Directory Filters & Search Bar */}
        <div className="directory-filter-bar">
          <div className="search-wrapper">
            <input
              type="text"
              placeholder="ค้นหาบุคลากร (ชื่อ, รหัส, อีเมล, ตำแหน่ง)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="directory-search-input"
              aria-label="ค้นหารายชื่อบุคลากร"
            />
          </div>
          <div className="selects-wrapper">
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="directory-filter-select"
              aria-label="กรองตามบทบาท"
            >
              <option value="all">ทุกบทบาท</option>
              <option value="admin">ผู้ดูแลระบบ (Admin)</option>
              <option value="head">หัวหน้างาน (Head)</option>
              <option value="employee">บุคลากร (Employee)</option>
            </select>

            <select
              value={filterFaculty}
              onChange={(e) => {
                setFilterFaculty(e.target.value);
                setFilterDepartment("all");
              }}
              className="directory-filter-select"
              aria-label="กรองตามคณะ/สถาบัน"
            >
              <option value="all">ทุกคณะ/ส่วนงาน</option>
              {faculties.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name}
                </option>
              ))}
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="directory-filter-select"
              disabled={filterFaculty === "all"}
              aria-label="กรองตามสาขา/ฝ่ายงาน"
            >
              <option value="all">ทุกสาขา/หน่วยงาน</option>
              {filterDepartments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop View: Table Layout */}
        <div className="users-table-container desktop-only">
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}></th>
                <th>รหัส</th>
                <th>ชื่อ-นามสกุล</th>
                <th>อีเมล</th>
                <th>สาขาวิชา/หน่วยงาน</th>
                <th>ตำแหน่ง</th>
                <th>บทบาท</th>
                <th>วันลาคงเหลือ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const isExpanded = expandedUserId === (user.id || user._id);
                return (
                  <React.Fragment key={user.id || user._id}>
                    <tr className={isExpanded ? "row-expanded" : ""}>
                      <td>
                        <button
                          type="button"
                          className={`row-expand-btn ${isExpanded ? "active" : ""}`}
                          onClick={() => toggleUserExpand(user.id || user._id)}
                          aria-expanded={isExpanded}
                          aria-label="แสดงรายละเอียดวันลาคงเหลือทั้งหมด"
                        >
                          ▶
                        </button>
                      </td>
                      <td>{user.employeeId}</td>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            {user.firstName?.charAt(0)}
                          </div>
                          <span>
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.department?.name || user.department || "-"}</td>
                      <td>{user.position}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>
                        <div className="leave-balance-cell">
                          <span title="ลาป่วย">
                            <FaHospital /> {user.leaveBalance?.sick || 0}
                          </span>
                          <span title="ลากิจ">
                            <FaClipboardList />{" "}
                            {user.leaveBalance?.personal || 0}
                          </span>
                          <span title="ลาพักร้อน">
                            <FaUmbrellaBeach />{" "}
                            {user.leaveBalance?.vacation || 0}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button
                            className="edit-btn-admin"
                            onClick={() => openModal(user)}
                            title="แก้ไข"
                            aria-label={`แก้ไขข้อมูลของ ${user.firstName} ${user.lastName}`}
                          >
                            <FaEdit style={{ color: "white" }} />
                            <span>แก้ไข</span>
                          </button>
                          <button
                            className="reset-btn-admin"
                            onClick={() => openResetModal(user)}
                            title="รีเซ็ตรหัสผ่าน"
                            aria-label={`รีเซ็ตรหัสผ่านของ ${user.firstName} ${user.lastName}`}
                          >
                            <FaKey style={{ color: "white" }} />
                            <span>รีเซ็ต</span>
                          </button>
                          <button
                            className="delete-btn-admin"
                            onClick={() => handleDelete(user)}
                            title="ลบ"
                            aria-label={`ลบรายชื่อของ ${user.firstName} ${user.lastName}`}
                          >
                            <FaTrash style={{ color: "white" }} />
                            <span>ลบ</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="expanded-details-row">
                        <td colSpan="9">
                          <div className="expanded-details-wrapper">
                            <div className="details-header-title">
                              รายละเอียดวันลาคงเหลือทั้งหมด
                            </div>
                            <div className="leave-details-grid">
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaHospital />
                                </span>
                                <span className="detail-label">ลาป่วย:</span>
                                <span className="detail-value">
                                  {user.leaveBalance?.sick || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaClipboardList />
                                </span>
                                <span className="detail-label">ลากิจ:</span>
                                <span className="detail-value">
                                  {user.leaveBalance?.personal || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaUmbrellaBeach />
                                </span>
                                <span className="detail-label">ลาพักร้อน:</span>
                                <span className="detail-value">
                                  {user.leaveBalance?.vacation || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaBaby />
                                </span>
                                <span className="detail-label">
                                  ลาคลอดบุตร:
                                </span>
                                <span className="detail-value">
                                  {user.leaveBalance?.maternity || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaUserFriends />
                                </span>
                                <span className="detail-label">
                                  ลาช่วยภรรยาคลอด:
                                </span>
                                <span className="detail-value">
                                  {user.leaveBalance?.paternity || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaChild />
                                </span>
                                <span className="detail-label">
                                  ลาเลี้ยงดูบุตร:
                                </span>
                                <span className="detail-value">
                                  {user.leaveBalance?.childcare || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaPray />
                                </span>
                                <span className="detail-label">ลาอุปสมบท:</span>
                                <span className="detail-value">
                                  {user.leaveBalance?.ordination || 0} วัน
                                </span>
                              </div>
                              <div className="detail-item">
                                <span className="detail-icon">
                                  <FaMedal />
                                </span>
                                <span className="detail-label">
                                  ลาตรวจเลือก:
                                </span>
                                <span className="detail-value">
                                  {user.leaveBalance?.military || 0} วัน
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td
                    colSpan="9"
                    style={{
                      textAlign: "center",
                      padding: "2.5rem 1rem",
                      color: "#a0aec0",
                    }}
                  >
                    {searchQuery ||
                    filterRole !== "all" ||
                    filterFaculty !== "all" ||
                    filterDepartment !== "all"
                      ? `ไม่พบบุคลากรที่ตรงกับการค้นหา`
                      : "ยังไม่มีข้อมูลบุคลากรในระบบ"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Card-Stack Layout */}
        <div className="users-cards-list mobile-only">
          {filteredUsers.map((user) => {
            const isExpanded = expandedUserId === (user.id || user._id);
            return (
              <div className="user-card" key={user.id || user._id}>
                <div className="user-card-header">
                  <div className="user-cell">
                    <div className="user-avatar">
                      {user.firstName?.charAt(0)}
                    </div>
                    <div>
                      <div className="user-card-name">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="user-card-email">{user.email}</div>
                    </div>
                  </div>
                  <div>{getRoleBadge(user.role)}</div>
                </div>

                <div className="user-card-body">
                  <div className="user-card-info">
                    <span className="info-label">รหัส:</span>
                    <span className="info-value">{user.employeeId}</span>
                  </div>
                  <div className="user-card-info">
                    <span className="info-label">หน่วยงาน:</span>
                    <span className="info-value">
                      {user.department?.name || user.department || "-"}
                    </span>
                  </div>
                  <div className="user-card-info">
                    <span className="info-label">ตำแหน่ง:</span>
                    <span className="info-value">{user.position}</span>
                  </div>
                  <div className="user-card-info balances">
                    <span className="info-label">วันลาคงเหลือ:</span>
                    <div className="leave-balance-cell">
                      <span title="ลาป่วย">
                        <FaHospital /> {user.leaveBalance?.sick || 0}
                      </span>
                      <span title="ลากิจ">
                        <FaClipboardList /> {user.leaveBalance?.personal || 0}
                      </span>
                      <span title="ลาพักร้อน">
                        <FaUmbrellaBeach /> {user.leaveBalance?.vacation || 0}
                      </span>
                    </div>
                  </div>

                  {/* Collapsible Mobile Balances section */}
                  <div className="user-card-expand-section">
                    <button
                      type="button"
                      className="card-expand-btn"
                      onClick={() => toggleUserExpand(user.id || user._id)}
                      aria-expanded={isExpanded}
                    >
                      {isExpanded
                        ? "ซ่อนรายละเอียดวันลาทั้งหมด ▲"
                        : "แสดงรายละเอียดวันลาทั้งหมด ▼"}
                    </button>
                    {isExpanded && (
                      <div className="card-expanded-balances">
                        <div className="balance-grid-mini">
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaHospital /> ลาป่วย:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.sick || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaClipboardList /> ลากิจ:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.personal || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaUmbrellaBeach /> ลาพักร้อน:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.vacation || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaBaby /> ลาคลอดบุตร:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.maternity || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaUserFriends /> ลาช่วยภรรยาคลอด:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.paternity || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaChild /> ลาเลี้ยงดูบุตร:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.childcare || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaPray /> ลาอุปสมบท:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.ordination || 0} วัน
                            </span>
                          </div>
                          <div className="balance-item-mini">
                            <span className="balance-label">
                              <FaMedal /> ลาตรวจเลือก:
                            </span>
                            <span className="balance-value">
                              {user.leaveBalance?.military || 0} วัน
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="user-card-actions">
                  <button
                    className="edit-btn-admin"
                    onClick={() => openModal(user)}
                    title="แก้ไข"
                    aria-label={`แก้ไขข้อมูลของ ${user.firstName} ${user.lastName}`}
                  >
                    <FaEdit style={{ color: "white" }} />
                    <span>แก้ไข</span>
                  </button>
                  <button
                    className="reset-btn-admin"
                    onClick={() => openResetModal(user)}
                    title="รีเซ็ตรหัสผ่าน"
                    aria-label={`รีเซ็ตรหัสผ่านของ ${user.firstName} ${user.lastName}`}
                  >
                    <FaKey style={{ color: "white" }} />
                    <span>รีเซ็ต</span>
                  </button>
                  <button
                    className="delete-btn-admin"
                    onClick={() => handleDelete(user.id || user._id)}
                    title="ลบ"
                    aria-label={`ลบรายชื่อของ ${user.firstName} ${user.lastName}`}
                  >
                    <FaTrash style={{ color: "white" }} />
                    <span>ลบ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {modalOpen && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div
              className="modal-content user-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>
                {editingUser ? (
                  <>
                    <FaEdit style={{ marginRight: "8px" }} /> แก้ไขบุคลากร
                  </>
                ) : (
                  <>
                    <FaPlus style={{ marginRight: "8px" }} /> เพิ่มบุคลากร
                  </>
                )}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>
                      {editingUser
                        ? "รหัสพนักงาน"
                        : "รหัสพนักงาน (เว้นว่างเพื่อสร้างอัตโนมัติ)"}
                    </label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      disabled={!!editingUser}
                    />
                  </div>
                  <div className="form-group">
                    <label>อีเมล</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ชื่อ (โปรดระบุคำนำหน้า)</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>นามสกุล</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>คณะ/สำนัก/สถาบัน</label>
                    <select
                      name="facultyId"
                      value={selectedFacultyId}
                      onChange={(e) => {
                        setSelectedFacultyId(e.target.value);
                        setFormData({ ...formData, departmentId: "" });
                      }}
                      required
                    >
                      <option value="">-- เลือกคณะ --</option>
                      {faculties.map((fac) => (
                        <option key={fac.id} value={fac.id}>
                          {fac.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>สาขาวิชา/หน่วยงาน</label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleChange}
                      required
                      disabled={!selectedFacultyId}
                    >
                      <option value="">
                        {selectedFacultyId
                          ? "-- เลือกสาขา --"
                          : "-- เลือกคณะก่อน --"}
                      </option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ตำแหน่ง</label>
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>วันเริ่มรับราชการ</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>ส่วนราชการ</label>
                    <input
                      type="text"
                      name="governmentDivision"
                      value={formData.governmentDivision}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>ที่ (เลขหนังสือ)</label>
                    <input
                      type="text"
                      name="documentNumber"
                      value={formData.documentNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>บทบาท</label>
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                    >
                      <option value="employee">บุคลากร</option>
                      <option value="head">หัวหน้างาน</option>
                      <option value="admin">ผู้ดูแลระบบ</option>
                    </select>
                  </div>
                  <div className="form-group supervisor-search-container">
                    <label>หัวหน้างาน</label>
                    <div className="searchable-select">
                      <button
                        type="button"
                        className="searchable-select-trigger"
                        onClick={() =>
                          setSupervisorDropdownOpen(!supervisorDropdownOpen)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSupervisorDropdownOpen(!supervisorDropdownOpen);
                          } else if (e.key === "Escape") {
                            setSupervisorDropdownOpen(false);
                          }
                        }}
                        role="combobox"
                        aria-expanded={supervisorDropdownOpen}
                        aria-haspopup="listbox"
                        aria-label="เลือกหัวหน้างาน"
                      >
                        <span>
                          {selectedSupervisorName || "-- ไม่มีหัวหน้างาน --"}
                        </span>
                        <span className="arrow">▼</span>
                      </button>

                      {supervisorDropdownOpen && (
                        <>
                          <div
                            className="select-overlay"
                            onClick={() => setSupervisorDropdownOpen(false)}
                          />
                          <div
                            className="searchable-select-dropdown"
                            role="listbox"
                          >
                            <input
                              type="text"
                              className="search-input"
                              placeholder="ค้นหาชื่อ, ตำแหน่ง หรือแผนก..."
                              value={supervisorSearchQuery}
                              onChange={(e) =>
                                setSupervisorSearchQuery(e.target.value)
                              }
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              aria-label="ค้นหารายชื่อหัวหน้างาน"
                            />
                            <div className="options-list">
                              <div
                                className={`option-item ${!formData.supervisorId ? "selected" : ""}`}
                                onClick={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    supervisorId: "",
                                  }));
                                  setSupervisorDropdownOpen(false);
                                  setSupervisorSearchQuery("");
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setFormData((prev) => ({
                                      ...prev,
                                      supervisorId: "",
                                    }));
                                    setSupervisorDropdownOpen(false);
                                    setSupervisorSearchQuery("");
                                  }
                                }}
                                role="option"
                                aria-selected={!formData.supervisorId}
                                tabIndex={0}
                              >
                                -- ไม่มีหัวหน้างาน --
                              </div>
                              {filteredSupervisors.map((sup) => (
                                <div
                                  key={sup.id}
                                  className={`option-item ${formData.supervisorId === sup.id ? "selected" : ""}`}
                                  onClick={() => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      supervisorId: sup.id,
                                    }));
                                    setSupervisorDropdownOpen(false);
                                    setSupervisorSearchQuery("");
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      setFormData((prev) => ({
                                        ...prev,
                                        supervisorId: sup.id,
                                      }));
                                      setSupervisorDropdownOpen(false);
                                      setSupervisorSearchQuery("");
                                    }
                                  }}
                                  role="option"
                                  aria-selected={
                                    formData.supervisorId === sup.id
                                  }
                                  tabIndex={0}
                                >
                                  <div className="option-name">
                                    {sup.firstName} {sup.lastName}
                                  </div>
                                  <div className="option-sub">
                                    {sup.position}{" "}
                                    {sup.department?.name
                                      ? `(${sup.department.name})`
                                      : ""}
                                  </div>
                                </div>
                              ))}
                              {filteredSupervisors.length === 0 && (
                                <div className="no-options" role="status">
                                  ไม่พบรายชื่อหัวหน้างาน
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!editingUser && (
                  <div className="form-group">
                    <label>รหัสผ่าน</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required={!editingUser}
                      minLength={6}
                    />
                  </div>
                )}

                <div className="form-section-title">วันลาคงเหลือ</div>
                <div className="form-row three-cols">
                  <div className="form-group">
                    <label>
                      <FaHospital style={{ marginRight: "6px" }} /> ลาป่วย
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.sick"
                      value={formData.leaveBalance.sick}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaClipboardList style={{ marginRight: "6px" }} /> ลากิจ
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.personal"
                      value={formData.leaveBalance.personal}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaUmbrellaBeach style={{ marginRight: "6px" }} />{" "}
                      ลาพักร้อน
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.vacation"
                      value={formData.leaveBalance.vacation}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                </div>
                <div className="form-row three-cols">
                  <div className="form-group">
                    <label>
                      <FaBaby style={{ marginRight: "6px" }} /> ลาคลอดบุตร
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.maternity"
                      value={formData.leaveBalance.maternity}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaUserFriends style={{ marginRight: "6px" }} />{" "}
                      ลาช่วยภรรยาคลอด
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.paternity"
                      value={formData.leaveBalance.paternity}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaChild style={{ marginRight: "6px" }} /> ลาเลี้ยงดูบุตร
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.childcare"
                      value={formData.leaveBalance.childcare}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                </div>
                <div className="form-row three-cols">
                  <div className="form-group">
                    <label>
                      <FaPray style={{ marginRight: "6px" }} /> ลาอุปสมบท
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.ordination"
                      value={formData.leaveBalance.ordination}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                  <div className="form-group">
                    <label>
                      <FaMedal style={{ marginRight: "6px" }} /> ลาตรวจเลือก
                    </label>
                    <input
                      type="number"
                      name="leaveBalance.military"
                      value={formData.leaveBalance.military}
                      onChange={handleChange}
                      min={0}
                    />
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn-form-edit"
                    onClick={handleCloseModal}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="submit-btn-form-edit">
                    {editingUser ? "บันทึก" : "เพิ่ม"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetModalOpen && (
          <div
            className="modal-overlay"
            onClick={() => setResetModalOpen(false)}
          >
            <div
              className="modal-content reset-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>
                <FaKey style={{ marginRight: "8px" }} /> รีเซ็ตรหัสผ่าน
              </h3>
              <p className="reset-info">
                รีเซ็ตรหัสผ่านให้{" "}
                <strong>
                  {userToReset?.firstName} {userToReset?.lastName}
                </strong>
              </p>
              <form onSubmit={handleResetPassword}>
                <div className="form-group">
                  <label>รหัสผ่านใหม่</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn-form-editpass"
                    onClick={() => setResetModalOpen(false)}
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="submit-btn-form-editpass">
                    รีเซ็ตรหัสผ่าน
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {importModalOpen && (
          <div className="modal-overlay" onClick={closeImportModal}>
            <div
              className="modal-content import-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="import-modal-tabs">
                <button
                  type="button"
                  className={`tab-btn ${importTab === "file" ? "active" : ""}`}
                  onClick={() => {
                    setImportTab("file");
                    setImportResults(null);
                    setIsPreviewed(false);
                  }}
                >
                  <FaFileImport /> นำเข้าไฟล์ CSV/Excel
                </button>
                <button
                  type="button"
                  className={`tab-btn ${importTab === "db" ? "active" : ""}`}
                  onClick={() => {
                    setImportTab("db");
                    setImportResults(null);
                    setIsPreviewed(false);
                  }}
                >
                  <FaDatabase /> ซิงค์ฐานข้อมูล (SQL)
                </button>
                <button
                  type="button"
                  className={`tab-btn ${importTab === "api" ? "active" : ""}`}
                  onClick={() => {
                    setImportTab("api");
                    setImportResults(null);
                    setIsPreviewed(false);
                  }}
                >
                  <FaNetworkWired /> ซิงค์จาก API (JSON)
                </button>
              </div>

              {!importResults ? (
                <div>
                  {/* TAB 1: FILE UPLOAD */}
                  {importTab === "file" && (
                    <form
                      onSubmit={
                        isPreviewed ? handleImportUsers : handlePreviewFile
                      }
                    >
                      {!isPreviewed ? (
                        <>
                          <div className="import-info">
                            <p>
                              อัปโหลดไฟล์ CSV หรือ Excel (.xlsx)
                              ที่มีข้อมูลบุคลากร
                            </p>
                            <div className="template-info">
                              <div style={{ marginBottom: "6px" }}>
                                <strong>คอลัมน์บังคับ (Required):</strong>
                                <br />
                                <code>
                                  firstName, lastName, email, position
                                </code>
                                <br />
                                <small style={{ color: "#e53e3e" }}>
                                  * หากไม่มีคอลัมน์ password
                                  ระบบจะสร้างให้อัตโนมัติ
                                </small>
                              </div>
                              <div>
                                <strong>
                                  คอลัมน์เสริมที่รองรับ (Optional):
                                </strong>
                                <br />
                                <code>
                                  password, role(บทบาท), facultyId(คณะ),
                                  departmentId(สาขาวิชา/หน่วยงาน),
                                  supervisorId(หัวหน้างาน), phone, startDate,
                                  affiliation
                                </code>
                              </div>
                            </div>

                            <button
                              type="button"
                              className="download-template-btn"
                              onClick={downloadTemplate}
                            >
                              <FaDownload style={{ marginRight: "6px" }} />
                              ดาวน์โหลดไฟล์ตัวอย่าง (.xlsx)
                            </button>
                          </div>

                          <div className="form-group">
                            <label>เลือกไฟล์</label>
                            <input
                              type="file"
                              className="import-file-input"
                              accept=".csv,.xlsx,.xls"
                              onChange={(e) => setImportFile(e.target.files[0])}
                              required
                            />
                          </div>
                        </>
                      ) : (
                        <>{renderDataPreview()}</>
                      )}

                      <div className="modal-actions">
                        {isPreviewed ? (
                          <>
                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={() => {
                                setIsPreviewed(false);
                                setPreviewRows([]);
                                setSourceColumns([]);
                              }}
                            >
                              กลับไปเลือกไฟล์ใหม่
                            </button>
                            <button
                              type="submit"
                              className="submit-btn-import-submit"
                              disabled={importing || !previewRows.length}
                            >
                              {importing ? (
                                <>
                                  <span className="import-spinner" />
                                  กำลังนำเข้า...
                                </>
                              ) : (
                                <>
                                  <FaFileImport
                                    style={{ marginRight: "6px" }}
                                  />
                                  ยืนยันการนำเข้า
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={closeImportModal}
                            >
                              ยกเลิก
                            </button>
                            <button
                              type="submit"
                              className="submit-btn-import-submit"
                              disabled={importing || !importFile}
                            >
                              {importing ? (
                                <>
                                  <span className="import-spinner" />
                                  กำลังตรวจสอบ...
                                </>
                              ) : (
                                <>
                                  <FaUsers style={{ marginRight: "6px" }} />
                                  ตรวจสอบข้อมูล (Preview)
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </form>
                  )}

                  {/* TAB 2: DATABASE SYNC */}
                  {importTab === "db" && (
                    <div>
                      <div className="sync-help-banner">
                        <p>
                          เชื่อมโยงและนำเข้าข้อมูลโดยตรงจากฐานข้อมูล SQL อื่น
                          เช่น ระบบทะเบียนหรือบุคลากรของมหาวิทยาลัย
                        </p>
                        <button
                          type="button"
                          className="mock-setup-btn"
                          onClick={handleSetupMockDb}
                          disabled={importing}
                        >
                          <FaCog /> ตั้งค่าตารางจำลองในระบบเพื่อทดสอบ
                        </button>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>Host / IP *</label>
                          <input
                            type="text"
                            value={dbConfig.host}
                            onChange={(e) =>
                              setDbConfig({ ...dbConfig, host: e.target.value })
                            }
                            placeholder="127.0.0.1"
                          />
                        </div>
                        <div className="form-group">
                          <label>Port *</label>
                          <input
                            type="text"
                            value={dbConfig.port}
                            onChange={(e) =>
                              setDbConfig({ ...dbConfig, port: e.target.value })
                            }
                            placeholder="3306"
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label>ชื่อฐานข้อมูล (Database) *</label>
                          <input
                            type="text"
                            value={dbConfig.database}
                            onChange={(e) =>
                              setDbConfig({
                                ...dbConfig,
                                database: e.target.value,
                              })
                            }
                            placeholder="leave_management"
                          />
                        </div>
                        <div className="form-group">
                          <label>ชื่อผู้ใช้ (Username) *</label>
                          <input
                            type="text"
                            value={dbConfig.user}
                            onChange={(e) =>
                              setDbConfig({ ...dbConfig, user: e.target.value })
                            }
                            placeholder="root"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>รหัสผ่าน (Password)</label>
                        <input
                          type="password"
                          value={dbConfig.password}
                          onChange={(e) =>
                            setDbConfig({
                              ...dbConfig,
                              password: e.target.value,
                            })
                          }
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="form-group">
                        <label>คำสั่ง SQL Query ดึงข้อมูล *</label>
                        <textarea
                          className="sql-query-input"
                          value={dbConfig.query}
                          onChange={(e) =>
                            setDbConfig({ ...dbConfig, query: e.target.value })
                          }
                          placeholder="SELECT * FROM personnel_table"
                          rows={3}
                        />
                      </div>

                      {!isPreviewed ? (
                        <div className="modal-actions">
                          <button
                            type="button"
                            className="cancel-btn"
                            onClick={closeImportModal}
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            className="test-conn-btn"
                            onClick={handleTestConnection}
                            disabled={
                              isTestingConn ||
                              !dbConfig.host ||
                              !dbConfig.database ||
                              !dbConfig.user ||
                              !dbConfig.query
                            }
                          >
                            {isTestingConn ? (
                              <>
                                <FaSpinner className="icon-spin" />{" "}
                                กำลังตรวจสอบ...
                              </>
                            ) : (
                              <>
                                <FaLink /> ทดสอบเชื่อมต่อและดึงคอลัมน์
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleSyncSubmit}>
                          {renderMappingUI()}
                          {renderDataPreview()}
                          <div className="modal-actions">
                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={() => setIsPreviewed(false)}
                            >
                              แก้ไขการเชื่อมต่อ
                            </button>
                            <button
                              type="submit"
                              className="submit-btn-sync-execute"
                              disabled={importing}
                            >
                              {importing ? (
                                <>
                                  <FaSpinner className="icon-spin" />{" "}
                                  กำลังนำเข้าและซิงค์...
                                </>
                              ) : (
                                <>
                                  <FaDatabase /> ดำเนินการซิงค์ข้อมูล
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}

                  {/* TAB 3: REST API SYNC */}
                  {importTab === "api" && (
                    <div>
                      <div className="sync-help-banner">
                        <p>
                          ดึงข้อมูลและนำเข้าจากเว็บบริการ (REST API Endpoint)
                          ของมหาวิทยาลัย ซึ่งตอบกลับในรูปแบบ JSON Array
                        </p>
                        <button
                          type="button"
                          className="mock-setup-btn"
                          onClick={() => {
                            setApiConfig({
                              url: "http://localhost:5000/api/users/mock-university-api",
                              headers: "",
                            });
                            toast.success(
                              "กรอกที่อยู่ Mock API มหาวิทยาลัย เรียบร้อย",
                            );
                          }}
                        >
                          <FaLink /> ใช้ที่อยู่ Mock API มหาวิทยาลัย
                        </button>
                      </div>

                      <div className="form-group">
                        <label>API Endpoint URL *</label>
                        <input
                          type="url"
                          value={apiConfig.url}
                          onChange={(e) =>
                            setApiConfig({ ...apiConfig, url: e.target.value })
                          }
                          placeholder="https://api.university.ac.th/v1/personnel"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>
                          Authorization Header / API Key (ระบุเป็น JSON หรือ
                          Token ดิบ)
                        </label>
                        <input
                          type="text"
                          value={apiConfig.headers}
                          onChange={(e) =>
                            setApiConfig({
                              ...apiConfig,
                              headers: e.target.value,
                            })
                          }
                          placeholder='{"Authorization": "Bearer key_here"} หรือ key_here'
                        />
                      </div>

                      {!isPreviewed ? (
                        <div className="modal-actions">
                          <button
                            type="button"
                            className="cancel-btn"
                            onClick={closeImportModal}
                          >
                            ยกเลิก
                          </button>
                          <button
                            type="button"
                            className="test-conn-btn"
                            onClick={handleTestConnection}
                            disabled={isTestingConn || !apiConfig.url}
                          >
                            {isTestingConn ? (
                              <>
                                <FaSpinner className="icon-spin" />{" "}
                                กำลังตรวจสอบ...
                              </>
                            ) : (
                              <>
                                <FaLink /> ดึงข้อมูลเพื่อตั้งค่าคอลัมน์
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleSyncSubmit}>
                          {renderMappingUI()}
                          {renderDataPreview()}
                          <div className="modal-actions">
                            <button
                              type="button"
                              className="cancel-btn"
                              onClick={() => setIsPreviewed(false)}
                            >
                              แก้ไขการเชื่อมต่อ
                            </button>
                            <button
                              type="submit"
                              className="submit-btn-sync-execute"
                              disabled={importing}
                            >
                              {importing ? (
                                <>
                                  <FaSpinner className="icon-spin" />{" "}
                                  กำลังนำเข้าและซิงค์...
                                </>
                              ) : (
                                <>
                                  <FaNetworkWired /> ดำเนินการซิงค์ข้อมูล
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="import-results">
                  <div className="results-summary">
                    <div className="result-success">
                      <FaCheckCircle />
                      <span>สำเร็จ: {importResults.success.length} รายการ</span>
                    </div>
                    <div className="result-failed">
                      <FaTimesCircle />
                      <span>ล้มเหลว: {importResults.failed.length} รายการ</span>
                    </div>
                  </div>

                  {importResults.success.length > 0 && (
                    <div className="success-list">
                      <strong>รายการที่ซิงค์สำเร็จ:</strong>
                      <ul>
                        {importResults.success.map((item, index) => (
                          <li key={index} className="success-item">
                            <FaCheckCircle
                              style={{
                                color: "#38a169",
                                marginRight: "6px",
                                flexShrink: 0,
                              }}
                            />
                            <span>
                              <strong>{item.name}</strong> ({item.employeeId}) -{" "}
                              <span className={`badge-action ${item.action}`}>
                                {item.action === "created"
                                  ? "สร้างใหม่"
                                  : "อัปเดตข้อมูล"}
                              </span>
                              {item.tempPassword && (
                                <span className="temp-password-badge">
                                  รหัสผ่านเริ่มต้น:{" "}
                                  <code>{item.tempPassword}</code>
                                </span>
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importResults.failed.length > 0 && (
                    <div className="failed-list">
                      <strong>รายการที่ล้มเหลว:</strong>
                      <ul>
                        {importResults.failed.map((item, index) => (
                          <li key={index}>
                            แถว/รายการที่ {item.row} ({item.employeeId || "-"}):{" "}
                            {item.reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button
                      className="cancel-btn"
                      onClick={() => {
                        setImportResults(null);
                        setIsPreviewed(false);
                        setImportFile(null);
                      }}
                    >
                      ซิงค์เพิ่มเติม
                    </button>
                    <button className="submit-btn" onClick={closeImportModal}>
                      ปิดหน้านี้
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserManagement;
