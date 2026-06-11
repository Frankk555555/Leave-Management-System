import React, { useState } from "react";
import {
  FaBookOpen,
  FaInfoCircle,
  FaCalendarAlt,
  FaFileAlt,
  FaGavel,
  FaHospital,
  FaClipboardList,
  FaUmbrellaBeach,
  FaPray,
  FaBaby,
  FaChild,
  FaUserFriends,
  FaMedal,
  FaListOl,
  FaMoneyBillWave,
  FaCalculator,
  FaGraduationCap,
  FaPlane,
  FaWheelchair,
  FaQuestionCircle,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import "./LeaveRegulations.css";

// FAQ Component with Accordion
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      question: "ลาป่วยกี่วันถึงต้องใช้ใบรับรองแพทย์?",
      answer:
        "หากลาป่วยติดต่อกันตั้งแต่ 30 วันขึ้นไป จะต้องมีใบรับรองแพทย์จากผู้ประกอบวิชาชีพเวชกรรมแนบด้วย สำหรับการลาป่วยน้อยกว่า 30 วัน ไม่จำเป็นต้องมีใบรับรองแพทย์",
    },
    {
      question: "ข้าราชการใหม่สามารถลาพักผ่อนได้เมื่อไหร่?",
      answer:
        "ผู้ที่เริ่มรับราชการยังไม่ถึง 6 เดือน จะยังไม่มีสิทธิ์ลาพักผ่อน หลังจากรับราชการครบ 6 เดือนแล้ว จึงจะมีสิทธิ์ลาพักผ่อนได้ 10 วันทำการต่อปี",
    },
    {
      question: "วันลาพักผ่อนสะสมได้สูงสุดกี่วัน?",
      answer:
        "ขึ้นอยู่กับอายุราชการ หากรับราชการน้อยกว่า 10 ปี สะสมได้สูงสุด 20 วันทำการ หากรับราชการ 10 ปีขึ้นไป สะสมได้สูงสุด 30 วันทำการ",
    },
    {
      question: "ลากิจส่วนตัวเพื่อเลี้ยงดูบุตรได้รับเงินเดือนหรือไม่?",
      answer:
        "ไม่ได้รับเงินเดือนระหว่างลา แต่สามารถลาได้ไม่เกิน 150 วันทำการ (ต่อเนื่องจากการลาคลอดบุตร หรือลาช่วยภรรยาคลอดบุตร)",
    },
    {
      question: "การลามีผลต่อการเลื่อนเงินเดือนอย่างไร?",
      answer:
        "มีผลกระทบหากลาป่วยและลากิจส่วนตัวเกิน 10 ครั้งต่อครึ่งปี หรือมีวันลารวมเกิน 23 วัน (ไม่นับลาคลอด ลาอุปสมบท ลาพักผ่อน) หรือมาทำงานสายเกิน 20 ครั้ง อาจไม่ได้รับการพิจารณาเลื่อนเงินเดือน",
    },
    {
      question: "ลาอุปสมบทต้องยื่นล่วงหน้ากี่วัน?",
      answer:
        "ต้องเสนอใบลาล่วงหน้าไม่น้อยกว่า 60 วัน และต้องอุปสมบทภายใน 10 วันนับแต่วันเริ่มลา ใช้สิทธิ์ได้ 1 ครั้งตลอดรับราชการ หากรับราชการมาไม่น้อยกว่า 12 เดือน จะได้รับเงินเดือนระหว่างลาไม่เกิน 120 วัน",
    },
    {
      question: "การนับวันลา นับรวมวันหยุดหรือไม่?",
      answer:
        "แล้วแต่ประเภทการลา โดยทั่วไปให้นับต่อเนื่องรวมวันหยุดราชการ ยกเว้นการลาป่วย ลากิจส่วนตัว ลาพักผ่อน และลาช่วยภรรยาคลอดบุตร ให้นับเฉพาะวันทำการ",
    },
    {
      question: "ลาคลอดบุตรต้องมีใบรับรองแพทย์หรือไม่?",
      answer:
        "ไม่ต้องมีใบรับรองแพทย์ มีสิทธิ์ลาได้ 90 วัน (นับรวมวันหยุดราชการ) และได้รับเงินเดือนเต็มจำนวน",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-section">
      <h2 className="section-title">
        <FaQuestionCircle style={{ marginRight: "0.5rem" }} />
        คำถามที่พบบ่อย (FAQ)
      </h2>
      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`faq-item ${openIndex === index ? "open" : ""}`}
          >
            <button className="faq-question" onClick={() => toggleFAQ(index)}>
              <span>{faq.question}</span>
              {openIndex === index ? <FaChevronUp /> : <FaChevronDown />}
            </button>
            {openIndex === index && (
              <div className="faq-answer">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaveRegulations = () => {
  // 11 ประเภทการลาตาม ระเบียบสำนักนายกรัฐมนตรี พ.ศ. 2555 ข้อ 17
  const leaveTypes = [
    {
      name: "1. การลาป่วย",
      days: "ไม่เกิน 60 วันทำการ/ปี",
      condition:
        "ลาติดต่อกัน 30 วันขึ้นไปต้องมีใบรับรองแพทย์จากผู้ประกอบวิชาชีพเวชกรรม",
      icon: <FaHospital />,
    },
    {
      name: "2. การลาคลอดบุตร",
      days: "90 วัน (นับรวมวันหยุดราชการ)",
      condition: "ได้รับเงินเดือนเต็มจำนวน ไม่ต้องมีใบรับรองแพทย์",
      icon: <FaBaby />,
    },
    {
      name: "3. การลาไปช่วยเหลือภริยาที่คลอดบุตร",
      days: "ไม่เกิน 15 วันทำการ",
      condition:
        "สำหรับข้าราชการชาย ต้องเสนอใบลาภายใน 90 วันนับแต่วันคลอด หากลาภายใน 30 วันนับแต่วันคลอดจะได้รับเงินเดือนระหว่างลา",
      icon: <FaUserFriends />,
    },
    {
      name: "4. การลากิจส่วนตัว",
      days: "ไม่เกิน 45 วันทำการ/ปี",
      condition:
        "หากลาเพื่อเลี้ยงดูบุตร (ต่อเนื่องจากลาคลอด) ลาได้ไม่เกิน 150 วันทำการ แต่ไม่ได้รับเงินเดือน",
      icon: <FaClipboardList />,
    },
    {
      name: "5. การลาพักผ่อน",
      days: "10 วันทำการ/ปี (สะสมได้)",
      condition:
        "สะสมได้สูงสุด 20 วัน (อายุราชการ <10 ปี) หรือ 30 วัน (อายุราชการ ≥10 ปี) ผู้เริ่มรับราชการยังไม่ถึง 6 เดือนไม่มีสิทธิ์",
      icon: <FaUmbrellaBeach />,
    },
    {
      name: "6. การลาอุปสมบท/ประกอบพิธีฮัจย์",
      days: "ไม่เกิน 120 วัน",
      condition:
        "ต้องเสนอใบลาล่วงหน้าไม่น้อยกว่า 60 วัน ต้องอุปสมบท/เดินทางภายใน 10 วันนับแต่วันเริ่มลา หากรับราชการมาไม่น้อยกว่า 12 เดือนจะได้รับเงินเดือน",
      icon: <FaPray />,
    },
    {
      name: "7. การลาเข้ารับการตรวจเลือก/เตรียมพล",
      days: "ตามจำนวนวันที่ทางราชการกำหนด",
      condition:
        "รายงานลาต่อผู้บังคับบัญชา (ก่อน 48 ชม. สำหรับตรวจเลือก หรือภายใน 48 ชม. สำหรับเตรียมพล) ได้รับเงินเดือนระหว่างลา",
      icon: <FaMedal />,
    },
    {
      name: "8. การลาไปศึกษา ฝึกอบรม หรือดูงาน",
      days: "ไม่เกิน 4 ปี (รวมขยายเวลาไม่เกิน 6 ปี)",
      condition: "ได้รับเงินเดือนระหว่างลา",
      icon: <FaGraduationCap />,
    },
    {
      name: "9. การลาไปปฏิบัติงานในองค์การระหว่างประเทศ",
      days: "ตามระยะเวลาที่ได้รับอนุมัติ",
      condition: "ขึ้นอยู่กับหลักเกณฑ์ที่กำหนด",
      icon: <FaPlane />,
    },
    {
      name: "10. การลาติดตามคู่สมรส",
      days: "ไม่เกิน 2 ปี (ต่อได้รวมไม่เกิน 4 ปี)",
      condition:
        "คู่สมรสต้องเป็นข้าราชการหรือพนักงานรัฐวิสาหกิจที่ไปปฏิบัติหน้าที่ต่างประเทศ ไม่ได้รับเงินเดือนระหว่างลา",
      icon: <FaUserFriends />,
    },
    {
      name: "11. การลาไปฟื้นฟูสมรรถภาพด้านอาชีพ",
      days: "ไม่เกิน 12 เดือน",
      condition:
        "สำหรับผู้ได้รับอันตรายจากการปฏิบัติหน้าที่ ลาได้ตามหลักสูตร ได้รับเงินเดือนระหว่างลา",
      icon: <FaWheelchair />,
    },
  ];

  return (
    <>
      <div className="regulations-page">
        <div className="page-header">
          <h1>
            <FaBookOpen style={{ marginRight: "0.5rem" }} />
            ระเบียบการลาของข้าราชการ
          </h1>
          <p>
            ข้อมูลสิทธิ์การลาตามระเบียบสำนักนายกรัฐมนตรี
            ว่าด้วยการลาของข้าราชการ พ.ศ. 2555
          </p>
        </div>

        <div className="regulations-content">
          {/* Section 1: ความหมายและความสำคัญ */}
          <div className="info-card highlight">
            <div className="info-icon">
              <FaGavel />
            </div>
            <div className="info-text">
              <h3>ความหมายและความสำคัญของการลา</h3>
              <p>
                การลาของข้าราชการถือเป็นสวัสดิการประเภทหนึ่งที่ข้าราชการได้รับนอกเหนือจากเงินเดือนซึ่งเป็นค่าตอบแทนในการปฏิบัติงาน
                โดยมีวัตถุประสงค์เพื่อให้ข้าราชการได้รับทราบถึงสิทธิของตนเองเกี่ยวกับการลา
                การได้รับเงินเดือน และการเลื่อนเงินเดือนระหว่างลา
              </p>
              <p style={{ marginTop: "0.5rem" }}>
                <strong>ระเบียบหลัก:</strong>{" "}
                ระเบียบสำนักนายกรัฐมนตรีว่าด้วยการลาของข้าราชการ พ.ศ. 2555
                บังคับใช้แก่ข้าราชการพลเรือน ข้าราชการพลเรือนในสถาบันอุดมศึกษา
                ข้าราชการการเมือง และข้าราชการตำรวจ
              </p>
            </div>
          </div>

          {/* Section 2: ประเภทการลา */}
          <h2 className="section-title">
            <FaListOl style={{ marginRight: "0.5rem" }} />
            1. ประเภทของการลา (11 ประเภท ตามข้อ 17)
          </h2>
          <div className="leave-types-grid">
            {leaveTypes.map((type, index) => (
              <div key={index} className="leave-type-card">
                <div className="leave-type-icon">{type.icon}</div>
                <h3>{type.name}</h3>
                <p className="leave-days">{type.days}</p>
                <p className="leave-condition">{type.condition}</p>
              </div>
            ))}
          </div>

          {/* Section 4: ระเบียบการนับวันลา */}
          <div className="notes-section">
            <h2 className="section-title">
              <FaCalculator style={{ marginRight: "0.5rem" }} />
              2. ระเบียบการนับวันลา
            </h2>
            <ul className="notes-list">
              <li>
                <strong>การนับวันลา:</strong> ให้นับตามปีงบประมาณ
              </li>
              <li>
                <strong>การนับรวมวันหยุด:</strong>{" "}
                โดยทั่วไปให้นับต่อเนื่องกันรวมวันหยุดราชการที่อยู่ระหว่างวันลาด้วย
                ยกเว้น การลาป่วย (ที่ไม่ใช่อันตรายจากการปฏิบัติงาน)
                ลาไปช่วยเหลือภริยาที่คลอดบุตร ลากิจส่วนตัว และลาพักผ่อน
                ให้นับเฉพาะวันทำการ
              </li>
              <li>
                <strong>การยกเลิกวันลา:</strong>{" "}
                หากได้รับอนุญาตแล้วแต่ไม่ได้หยุดหรือหยุดไม่ครบ
                สามารถขอยกเลิกวันลาได้
                โดยให้ถือว่าวันลาสิ้นสุดก่อนวันมาปฏิบัติราชการ
              </li>
            </ul>
          </div>

          {/* Section 5: หลักเกณฑ์การเลื่อนเงินเดือน */}
          <div className="notes-section">
            <h2 className="section-title">
              <FaMoneyBillWave style={{ marginRight: "0.5rem" }} />
              3. หลักเกณฑ์การเลื่อนเงินเดือนระหว่างลา
            </h2>
            <p style={{ marginBottom: "1rem", color: "#475569" }}>
              การลาของข้าราชการมีผลต่อการพิจารณาเลื่อนเงินเดือน
              ซึ่งมีการเลื่อนปีละ 2 ครั้ง
              โดยข้าราชการที่จะได้รับการเลื่อนเงินเดือนต้องเข้าเงื่อนไข:
            </p>
            <ul className="notes-list">
              <li>มีเวลาปฏิบัติราชการในครึ่งปีที่แล้วมาไม่น้อยกว่า 4 เดือน</li>
              <li>ลาป่วยและลากิจส่วนตัวไม่เกิน 10 ครั้ง (นับเฉพาะวันทำการ)</li>
              <li>
                มีวันลาไม่เกิน 23 วัน (ไม่นับรวมวันลาบางประเภท เช่น ลาอุปสมบท
                ลาคลอดบุตร ลาพักผ่อน เป็นต้น)
              </li>
              <li>มาทำงานสายไม่เกิน 20 ครั้ง</li>
            </ul>
          </div>

          {/* ข้อควรรู้ */}
          <div className="notes-section">
            <h2 className="section-title">
              <FaInfoCircle style={{ marginRight: "0.5rem" }} />
              ข้อควรรู้เพิ่มเติม
            </h2>
            <ul className="notes-list">
              <li>
                การลาทุกประเภทต้องได้รับอนุมัติจากผู้บังคับบัญชาก่อนวันลา
                (ยกเว้นกรณีฉุกเฉิน)
              </li>
              <li>
                การลาป่วยติดต่อกันเกิน 30 วัน
                ต้องแนบใบรับรองแพทย์จากสถานพยาบาลของรัฐ
              </li>
              <li>
                ข้าราชการที่ลาเกินสิทธิ์จะถูกหักเงินเดือนตามจำนวนวันที่ลาเกิน
              </li>
              <li>
                พนักงานมหาวิทยาลัยและลูกจ้างชั่วคราวอาจมีสิทธิ์การลาแตกต่างกันตามข้อบังคับมหาวิทยาลัย
              </li>
            </ul>
          </div>

          {/* FAQ Section */}
          <FAQSection />

          {/* Download Link */}
          <div className="download-section">
            <a
              href="https://www.m-society.go.th/ewtadmin/ewt/mso_web/article_attach/1261/1855.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="download-btn"
            >
              <FaFileAlt style={{ marginRight: "0.5rem" }} />
              ดาวน์โหลดระเบียบฉบับเต็ม (PDF)
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default LeaveRegulations;
