import React, { useState } from "react";
import { FaKey } from "react-icons/fa";
import { usersAPI } from "../../services/api";
import { useToast } from "../common/Toast";

const PasswordResetModal = ({ isOpen, onClose, user, onSuccess }) => {
  const toast = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !user) return null;

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)/;
    if (!passwordRegex.test(newPassword)) {
      toast.error("รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขอย่างน้อยอย่างละ 1 ตัว");
      return;
    }

    try {
      setLoading(true);
      await usersAPI.resetPassword(user.id || user._id, { newPassword });
      toast.success(
        `รีเซ็ตรหัสผ่านให้ ${user.firstName} ${user.lastName} เรียบร้อยแล้ว`
      );
      setNewPassword("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
            {user.firstName} {user.lastName}
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
              minLength={8}
              placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)"
            />
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="cancel-btn-form-editpass"
              onClick={onClose}
              disabled={loading}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="submit-btn-form-editpass"
              disabled={loading}
            >
              {loading ? "กำลังรีเซ็ต..." : "รีเซ็ตรหัสผ่าน"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordResetModal;
