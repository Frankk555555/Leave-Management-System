import React, { useEffect, useState } from "react";
import { FiX, FiInfo, FiBookOpen, FiCheckCircle } from "react-icons/fi";
import "./LeaveRegulationsModal.css";

const LeaveRegulationsModal = ({ isOpen, onClose }) => {
  const [isRendered, setIsRendered] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      document.body.style.overflow = "hidden";
    } else {
      setTimeout(() => {
        setIsRendered(false);
      }, 300); // match transition duration
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isRendered) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const leaveTypes = [
    {
      name: "1. การลาป่วย",
      days: "ไม่เกิน 60 วันทำการ/ปี",
      condition: "ลาติดต่อกัน 30 วันขึ้นไปต้องมีใบรับรองแพทย์จากผู้ประกอบวิชาชีพเวชกรรม",
    },
    {
      name: "2. การลาคลอดบุตร",
      days: "90 วัน (นับรวมวันหยุดราชการ)",
      condition: "ได้รับเงินเดือนเต็มจำนวน ไม่ต้องมีใบรับรองแพทย์",
    },
    {
      name: "3. การลาไปช่วยเหลือภริยาที่คลอดบุตร",
      days: "ไม่เกิน 15 วันทำการ",
      condition: "สำหรับข้าราชการชาย ต้องเสนอใบลาภายใน 90 วันนับแต่วันคลอด",
    },
    {
      name: "4. การลากิจส่วนตัว",
      days: "ไม่เกิน 45 วันทำการ/ปี",
      condition: "หากลาเพื่อเลี้ยงดูบุตร (ต่อเนื่องจากลาคลอด) ลาได้ไม่เกิน 150 วันทำการ แต่ไม่ได้รับเงินเดือน",
    },
    {
      name: "5. การลาพักผ่อน",
      days: "10 วันทำการ/ปี (สะสมได้)",
      condition: "สะสมได้สูงสุด 20 วัน (อายุราชการ <10 ปี) หรือ 30 วัน (อายุราชการ ≥10 ปี) ผู้เริ่มรับราชการยังไม่ถึง 6 เดือนไม่มีสิทธิ์",
    },
    {
      name: "6. การลาอุปสมบท/ประกอบพิธีฮัจย์",
      days: "ไม่เกิน 120 วัน",
      condition: "ต้องเสนอใบลาล่วงหน้าไม่น้อยกว่า 60 วัน",
    },
    {
      name: "7. การลาเข้ารับการตรวจเลือก/เตรียมพล",
      days: "ตามจำนวนวันที่ทางราชการกำหนด",
      condition: "ได้รับเงินเดือนระหว่างลา",
    },
    {
      name: "8. การลาไปศึกษา ฝึกอบรม หรือดูงาน",
      days: "ไม่เกิน 4 ปี (รวมขยายเวลาไม่เกิน 6 ปี)",
      condition: "ได้รับเงินเดือนระหว่างลา",
    },
    {
      name: "9. การลาไปปฏิบัติงานในองค์การระหว่างประเทศ",
      days: "ตามระยะเวลาที่ได้รับอนุมัติ",
      condition: "ขึ้นอยู่กับหลักเกณฑ์ที่กำหนด",
    },
    {
      name: "10. การลาติดตามคู่สมรส",
      days: "ไม่เกิน 2 ปี (ต่อได้รวมไม่เกิน 4 ปี)",
      condition: "ไม่ได้รับเงินเดือนระหว่างลา",
    },
    {
      name: "11. การลาไปฟื้นฟูสมรรถภาพด้านอาชีพ",
      days: "ไม่เกิน 12 เดือน",
      condition: "สำหรับผู้ได้รับอันตรายจากการปฏิบัติหน้าที่ ได้รับเงินเดือนระหว่างลา",
    },
  ];

  return (
    <div
      className={`regulations-overlay ${isOpen ? "active" : ""}`}
      onClick={handleBackdropClick}
    >
      <div className={`regulations-modal ${isOpen ? "active" : ""}`}>
        <button className="regulations-close-btn" onClick={onClose} aria-label="Close">
          <FiX />
        </button>

        <div className="regulations-header">
          <h2>ความหมายและความสำคัญของการลา</h2>
          <p>ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555</p>
        </div>

        <div className="regulations-content">
          <div className="regulation-intro-card">
            <div className="regulation-intro-icon">
              <FiInfo />
            </div>
            <div className="regulation-text">
              <p>
                การลาของข้าราชการถือเป็นสวัสดิการประเภทหนึ่งที่ข้าราชการได้รับนอกเหนือจากเงินเดือนซึ่งเป็นค่าตอบแทนในการปฏิบัติงาน โดยมีวัตถุประสงค์เพื่อให้ข้าราชการได้รับทราบถึงสิทธิของตนเองเกี่ยวกับการลา การได้รับเงินเดือน และการเลื่อนเงินเดือนระหว่างลา
              </p>
            </div>
          </div>

          <div className="regulation-intro-card highlight">
            <div className="regulation-intro-icon">
              <FiBookOpen />
            </div>
            <div className="regulation-text">
              <p>
                <strong>ระเบียบหลัก:</strong> ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555 บังคับใช้แก่ข้าราชการพลเรือน ข้าราชการพลเรือนในสถาบันอุดมศึกษา ข้าราชการการเมือง และข้าราชการตำรวจ
              </p>
            </div>
          </div>

          <div className="regulation-types-section">
            <h3>ประเภทของการลา (11 ประเภท ตามข้อ 17)</h3>
            <ul className="regulation-types-list">
              {leaveTypes.map((type, index) => (
                <li key={index} className="leave-type-detailed">
                  <FiCheckCircle className="type-icon" />
                  <div className="leave-type-info">
                    <span className="leave-name">{type.name}</span>
                    <span className="leave-days">{type.days}</span>
                    <span className="leave-condition">{type.condition}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="regulations-footer">
          <button className="regulations-accept-btn" onClick={onClose}>
            รับทราบและปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRegulationsModal;
