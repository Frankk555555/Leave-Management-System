import React, { useState, useEffect } from "react";
import { usersAPI, departmentsAPI, facultiesAPI } from "../services/api";
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

const UserManagement = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [supervisors, setSupervisors] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState("");

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

  useEffect(() => {
    fetchUsers();
    fetchSupervisors();
    fetchFaculties();
  }, []);

  // เมื่อเลือกคณะ ให้โหลดสาขาของคณะนั้น
  useEffect(() => {
    if (selectedFacultyId) {
      fetchDepartments(selectedFacultyId);
    } else {
      setDepartments([]);
    }
  }, [selectedFacultyId]);

  const fetchFaculties = async () => {
    try {
      const response = await facultiesAPI.getAll();
      setFaculties(response.data);
    } catch (error) {
      console.error("Error fetching faculties:", error);
    }
  };

  const fetchDepartments = async (facultyId) => {
    try {
      const response = await departmentsAPI.getAll(facultyId);
      setDepartments(response.data);
    } catch (error) {
      console.error("Error fetching departments:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getAll();
      // Sort by employeeId
      const sortedUsers = response.data.sort((a, b) =>
        a.employeeId.localeCompare(b.employeeId, undefined, { numeric: true })
      );
      setUsers(sortedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisors = async () => {
    try {
      const response = await usersAPI.getSupervisors();
      setSupervisors(response.data);
    } catch (error) {
      console.error("Error fetching supervisors:", error);
    }
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
        fetchDepartments(userFacultyId);
      } else {
        setSelectedFacultyId("");
        setDepartments([]);
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
        leaveBalance: user.leaveBalance || {
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
        await usersAPI.update(editingUser.id || editingUser._id, dataToSend);
        toast.success("แก้ไขข้อมูลบุคลากรเรียบร้อยแล้ว");
      } else {
        await usersAPI.create(dataToSend);
        toast.success("เพิ่มบุคลากรเรียบร้อยแล้ว");
      }
      fetchUsers();
      fetchSupervisors();
      handleCloseModal();
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await toast.confirm("คุณต้องการลบบุคลากรนี้หรือไม่?");
    if (!confirmed) return;
    try {
      await usersAPI.delete(id);
      fetchUsers();
      fetchSupervisors();
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
        newPassword
      );
      toast.success(
        `รีเซ็ตรหัสผ่านของ ${userToReset.firstName} ${userToReset.lastName} เรียบร้อยแล้ว`
      );
      setResetModalOpen(false);
      setUserToReset(null);
      setNewPassword("");
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน"
      );
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: {
        bg: "linear-gradient(135deg, #ff6b6b, #ee5a5a)",
        color: "white",
      },
      head: {
        bg: "linear-gradient(135deg, #667eea, #764ba2)",
        color: "white",
      },
      employee: { bg: "#e2e8f0", color: "#4a5568" },
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

  const openImportModal = () => {
    setImportModalOpen(true);
    setImportFile(null);
    setImportResults(null);
    setImportTab("file");
    setIsPreviewed(false);
    setSourceColumns([]);
    setPreviewRows([]);
  };

  const closeImportModal = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResults(null);
  };

  const handleImportUsers = async (e) => {
    e.preventDefault();
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
      fetchUsers();
      fetchSupervisors();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล"
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
        employeeId: columns.find(c => ["employeeid", "empid", "emp_id", "id", "รหัส"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        firstName: columns.find(c => ["firstname", "name", "first_name", "fname", "ชื่อ", "ชื่อจริง"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        lastName: columns.find(c => ["lastname", "last_name", "lname", "นามสกุล"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        email: columns.find(c => ["email", "emailaddress", "email_address", "mail", "อีเมล", "อีเมล์"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        position: columns.find(c => ["position", "positiontitle", "position_title", "job", "ตำแหน่ง"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        role: columns.find(c => ["role", "rolename", "role_name", "บทบาท"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        departmentId: columns.find(c => ["department", "departmentid", "department_id", "dept", "deptname", "dept_name", "สาขา", "แผนก"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        supervisorId: columns.find(c => ["supervisor", "supervisorid", "supervisor_id", "หัวหน้า"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        phone: columns.find(c => ["phone", "phonenumber", "phone_no", "tel", "เบอร์โทร", "โทรศัพท์"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        startDate: columns.find(c => ["startdate", "start_date", "hiredate", "วันเริ่มงาน"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        governmentDivision: columns.find(c => ["governmentdivision", "government_division", "ส่วนราชการ"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        documentNumber: columns.find(c => ["documentnumber", "document_number", "เลขหนังสือ"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        unit: columns.find(c => ["unit", "หน่วยงาน"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        affiliation: columns.find(c => ["affiliation", "faculty", "faculty_name", "สังกัด", "คณะ"].includes(c.toLowerCase().replace(/[^a-zก-๙]/g, ""))) || "",
        defaultPassword: "TempPassword123",
      };
      
      setMapping(detectedMapping);
      setIsPreviewed(true);
      toast.success("เชื่อมต่อสำเร็จ ดึงข้อมูลตัวอย่างเรียบร้อย");
    } catch (error) {
      toast.error(error.response?.data?.message || "เชื่อมต่อล้มเหลว ตรวจสอบการตั้งค่าอีกครั้ง");
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
      fetchUsers();
      fetchSupervisors();
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการซิงค์ข้อมูล");
    } finally {
      setImporting(false);
    }
  };

  const handleSetupMockDb = async () => {
    setImporting(true);
    try {
      const response = await usersAPI.setupMockDb();
      toast.success(response.data.message);
      setDbConfig(prev => ({
        ...prev,
        query: "SELECT * FROM mock_university_personnel",
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการสร้างตารางจำลอง");
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
                  setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
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
    return (
      <div className="preview-section">
        <h4 className="section-subtitle">
          <FaUsers /> ข้อมูลตัวอย่างจากแหล่งข้อมูล (5 แถวแรก)
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
              {previewRows.map((row, idx) => (
                <tr key={idx}>
                  {sourceColumns.map((col) => (
                    <td key={col}>{String(row[col] !== null && row[col] !== undefined ? row[col] : "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Download CSV template สำหรับนำเข้าข้อมูลบุคลากร
  const downloadTemplate = () => {
    const headers = [
      "employeeId",
      "firstName",
      "lastName",
      "email",
      "password",
      "position",
      "role",
      "departmentId",
    ];
    const exampleRow = [
      "EMP001",
      "นายสมชาย",
      "ใจดี",
      "somchai@example.com",
      "Password1",
      "อาจารย์",
      "employee",
      "",
    ];
    const csvContent = [
      headers.join(","),
      exampleRow.join(","),
    ].join("\n");
    const bom = "\uFEFF"; // UTF-8 BOM เพื่อให้ Excel เปิดภาษาไทยได้
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ตัวอย่างนำเข้าบุคลากร.csv";
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const selectedSupervisor = supervisors.find(
    (sup) => String(sup.id) === String(formData.supervisorId)
  );
  const selectedSupervisorName = selectedSupervisor
    ? `${selectedSupervisor.firstName} ${selectedSupervisor.lastName}`
    : "";

  const filteredSupervisors = supervisors.filter((sup) => {
    const fullName = `${sup.firstName} ${sup.lastName}`.toLowerCase();
    const query = supervisorSearchQuery.toLowerCase();
    const deptName = sup.department?.name?.toLowerCase() || "";
    const position = sup.position?.toLowerCase() || "";
    return fullName.includes(query) || deptName.includes(query) || position.includes(query);
  });

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
              <FaFileImport style={{ marginRight: "6px" }} /> นำเข้าข้อมูล
            </button>
            <button className="add-btn" onClick={() => openModal()}>
              <FaPlus style={{ marginRight: "6px" }} /> เพิ่มบุคลากร
            </button>
          </div>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
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
              {users.map((user) => (
                <tr key={user.id || user._id}>
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
                        <FaClipboardList /> {user.leaveBalance?.personal || 0}
                      </span>
                      <span title="ลาพักร้อน">
                        <FaUmbrellaBeach /> {user.leaveBalance?.vacation || 0}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="action-btns">
                      <button
                        className="edit-btn-admin"
                        onClick={() => openModal(user)}
                        title="แก้ไข"
                      >
                        <FaEdit style={{ color: "white" }} />
                      </button>
                      <button
                        className="reset-btn-admin"
                        onClick={() => openResetModal(user)}
                        title="รีเซ็ตรหัสผ่าน"
                      >
                        <FaKey style={{ color: "white" }} />
                      </button>
                      <button
                        className="delete-btn-admin"
                        onClick={() => handleDelete(user.id || user._id)}
                        title="ลบ"
                      >
                        <FaTrash style={{ color: "white" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                    <label>รหัสพนักงาน</label>
                    <input
                      type="text"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleChange}
                      required
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
                      <div 
                        className="searchable-select-trigger" 
                        onClick={() => setSupervisorDropdownOpen(!supervisorDropdownOpen)}
                      >
                        <span>{selectedSupervisorName || "-- ไม่มีหัวหน้างาน --"}</span>
                        <span className="arrow">▼</span>
                      </div>
                      
                      {supervisorDropdownOpen && (
                        <>
                          <div className="select-overlay" onClick={() => setSupervisorDropdownOpen(false)} />
                          <div className="searchable-select-dropdown">
                            <input
                              type="text"
                              className="search-input"
                              placeholder="ค้นหาชื่อ, ตำแหน่ง หรือแผนก..."
                              value={supervisorSearchQuery}
                              onChange={(e) => setSupervisorSearchQuery(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                            <div className="options-list">
                              <div
                                className={`option-item ${!formData.supervisorId ? "selected" : ""}`}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, supervisorId: "" }));
                                  setSupervisorDropdownOpen(false);
                                  setSupervisorSearchQuery("");
                                }}
                              >
                                -- ไม่มีหัวหน้างาน --
                              </div>
                              {filteredSupervisors.map((sup) => (
                                <div
                                  key={sup.id}
                                  className={`option-item ${formData.supervisorId === sup.id ? "selected" : ""}`}
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, supervisorId: sup.id }));
                                    setSupervisorDropdownOpen(false);
                                    setSupervisorSearchQuery("");
                                  }}
                                >
                                  <div className="option-name">{sup.firstName} {sup.lastName}</div>
                                  <div className="option-sub">
                                    {sup.position} {sup.department?.name ? `(${sup.department.name})` : ""}
                                  </div>
                                </div>
                              ))}
                              {filteredSupervisors.length === 0 && (
                                <div className="no-options">ไม่พบรายชื่อหัวหน้างาน</div>
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
                    <form onSubmit={handleImportUsers}>
                      <div className="import-info">
                        <p>อัปโหลดไฟล์ CSV หรือ Excel (.xlsx) ที่มีข้อมูลบุคลากร</p>
                        <div className="template-info">
                          <div style={{ marginBottom: "6px" }}>
                            <strong>คอลัมน์บังคับ (Required):</strong>
                            <br />
                            <code>employeeId, firstName, lastName, email, position</code>
                            <br />
                            <small style={{ color: "#e53e3e" }}>
                              * หากไม่มีคอลัมน์ password ระบบจะสร้างรหัสผ่านเริ่มต้นให้อัตโนมัติ
                            </small>
                          </div>
                          <div>
                            <strong>คอลัมน์เสริมที่รองรับ (Optional):</strong>
                            <br />
                            <code>password, role, departmentId, supervisorId, phone, startDate, affiliation</code>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="download-template-btn"
                          onClick={downloadTemplate}
                        >
                          <FaDownload style={{ marginRight: "6px" }} />
                          ดาวน์โหลดไฟล์ตัวอย่าง (.csv)
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

                      <div className="modal-actions">
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
                              กำลังนำเข้า...
                            </>
                          ) : (
                            <>
                              <FaFileImport style={{ marginRight: "6px" }} />
                              นำเข้าข้อมูล
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* TAB 2: DATABASE SYNC */}
                  {importTab === "db" && (
                    <div>
                      <div className="sync-help-banner">
                        <p>
                          เชื่อมโยงและนำเข้าข้อมูลโดยตรงจากฐานข้อมูล SQL อื่น เช่น ระบบทะเบียนหรือบุคลากรของมหาวิทยาลัย
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
                            onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                            placeholder="127.0.0.1"
                          />
                        </div>
                        <div className="form-group">
                          <label>Port *</label>
                          <input
                            type="text"
                            value={dbConfig.port}
                            onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
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
                            onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                            placeholder="leave_management"
                          />
                        </div>
                        <div className="form-group">
                          <label>ชื่อผู้ใช้ (Username) *</label>
                          <input
                            type="text"
                            value={dbConfig.user}
                            onChange={(e) => setDbConfig({ ...dbConfig, user: e.target.value })}
                            placeholder="root"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label>รหัสผ่าน (Password)</label>
                        <input
                          type="password"
                          value={dbConfig.password}
                          onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                          placeholder="••••••••"
                        />
                      </div>

                      <div className="form-group">
                        <label>คำสั่ง SQL Query ดึงข้อมูล *</label>
                        <textarea
                          className="sql-query-input"
                          value={dbConfig.query}
                          onChange={(e) => setDbConfig({ ...dbConfig, query: e.target.value })}
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
                            disabled={isTestingConn || !dbConfig.host || !dbConfig.database || !dbConfig.user || !dbConfig.query}
                          >
                            {isTestingConn ? (
                              <>
                                <FaSpinner className="icon-spin" /> กำลังตรวจสอบ...
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
                                  <FaSpinner className="icon-spin" /> กำลังนำเข้าและซิงค์...
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
                          ดึงข้อมูลและนำเข้าจากเว็บบริการ (REST API Endpoint) ของมหาวิทยาลัย ซึ่งตอบกลับในรูปแบบ JSON Array
                        </p>
                        <button
                          type="button"
                          className="mock-setup-btn"
                          onClick={() => {
                            setApiConfig({
                              url: "http://localhost:5000/api/users/mock-university-api",
                              headers: ""
                            });
                            toast.success("กรอกที่อยู่ Mock API มหาวิทยาลัย เรียบร้อย");
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
                          onChange={(e) => setApiConfig({ ...apiConfig, url: e.target.value })}
                          placeholder="https://api.university.ac.th/v1/personnel"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Authorization Header / API Key (ระบุเป็น JSON หรือ Token ดิบ)</label>
                        <input
                          type="text"
                          value={apiConfig.headers}
                          onChange={(e) => setApiConfig({ ...apiConfig, headers: e.target.value })}
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
                                <FaSpinner className="icon-spin" /> กำลังตรวจสอบ...
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
                                  <FaSpinner className="icon-spin" /> กำลังนำเข้าและซิงค์...
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
                            <FaCheckCircle style={{ color: "#38a169", marginRight: "6px", flexShrink: 0 }} />
                            <span>
                              <strong>{item.name}</strong> ({item.employeeId}) -{" "}
                              <span className={`badge-action ${item.action}`}>
                                {item.action === "created" ? "สร้างใหม่" : "อัปเดตข้อมูล"}
                              </span>
                              {item.tempPassword && (
                                <span className="temp-password-badge">
                                  รหัสผ่านเริ่มต้น: <code>{item.tempPassword}</code>
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
                            แถว/รายการที่ {item.row} ({item.employeeId || "-"}): {item.reason}
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
