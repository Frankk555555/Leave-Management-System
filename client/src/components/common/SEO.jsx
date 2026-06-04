import { useEffect } from "react";

/**
 * SEO Component - Manages document title and meta tags
 * Usage: <SEO title="หน้าแดชบอร์ด" description="ภาพรวมการลาของคุณ" />
 */
const SEO = ({ title, description, keywords, ogImage, ogType = "website" }) => {
  const siteName = "ระบบบริหารการลา - มหาวิทยาลัยราชภัฏบุรีรัมย์";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription =
    "ระบบบริหารการลางานของบุคลากร มหาวิทยาลัยราชภัฏบุรีรัมย์ - ขอลา อนุมัติลา และติดตามสถานะได้ง่ายๆ";

  useEffect(() => {
    // Update document title
    document.title = fullTitle;

    // Update or create meta description
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.name = "description";
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = description || defaultDescription;

    // Update or create meta keywords
    if (keywords) {
      let keywordsMeta = document.querySelector('meta[name="keywords"]');
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.name = "keywords";
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.content = keywords;
    }

    // Open Graph tags
    const ogTags = {
      "og:title": fullTitle,
      "og:description": description || defaultDescription,
      "og:type": ogType,
      "og:site_name": siteName,
    };

    if (ogImage) {
      ogTags["og:image"] = ogImage;
    }

    Object.entries(ogTags).forEach(([property, content]) => {
      let ogMeta = document.querySelector(`meta[property="${property}"]`);
      if (!ogMeta) {
        ogMeta = document.createElement("meta");
        ogMeta.setAttribute("property", property);
        document.head.appendChild(ogMeta);
      }
      ogMeta.content = content;
    });

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = siteName;
    };
  }, [
    fullTitle,
    description,
    keywords,
    ogImage,
    ogType,
    defaultDescription,
    siteName,
  ]);

  return null; // This component doesn't render anything
};

// Page-specific SEO configs
export const SEOConfig = {
  dashboard: {
    title: "หน้าหลัก",
    description: "ภาพรวมการลาและสถิติการใช้วันลาของคุณ",
    keywords: "หน้าหลัก, สถิติการลา, วันลาคงเหลือ",
  },
  leaveRequest: {
    title: "ขอลาหยุด",
    description: "ส่งคำขอลาหยุดงาน เลือกประเภทการลาและระบุวันที่ต้องการลา",
    keywords: "ขอลา, ลาป่วย, ลากิจ, ลาพักร้อน",
  },
  leaveHistory: {
    title: "ประวัติการลา",
    description:
      "ดูประวัติการลาทั้งหมดของคุณ ทั้งที่อนุมัติ รออนุมัติ และถูกปฏิเสธ",
    keywords: "ประวัติการลา, สถานะการลา, รายการลา",
  },
  calendar: {
    title: "ปฏิทิน",
    description: "ดูปฏิทินวันหยุดราชการและวันลาของคุณ",
    keywords: "ปฏิทิน, วันหยุด, วันลา",
  },
  teamCalendar: {
    title: "ปฏิทินทีม",
    description: "ดูตารางการลาของสมาชิกในทีม",
    keywords: "ปฏิทินทีม, วันลาทีม, ตารางการลา",
  },
  approvals: {
    title: "อนุมัติการลา",
    description: "ตรวจสอบและอนุมัติคำขอลาของทีมงาน",
    keywords: "อนุมัติลา, ตรวจสอบการลา, หัวหน้างาน",
  },
  profile: {
    title: "โปรไฟล์",
    description: "จัดการข้อมูลส่วนตัวและตั้งค่าบัญชีของคุณ",
    keywords: "โปรไฟล์, ข้อมูลส่วนตัว, ตั้งค่าบัญชี",
  },
  users: {
    title: "จัดการบุคลากร",
    description: "จัดการข้อมูลบุคลากร เพิ่ม แก้ไข และลบผู้ใช้ในระบบ",
    keywords: "จัดการผู้ใช้, บุคลากร, ผู้ดูแลระบบ",
  },
  reports: {
    title: "รายงาน",
    description: "ดูรายงานสถิติการลาและส่งออกข้อมูล",
    keywords: "รายงาน, สถิติ, ส่งออก Excel, PDF",
  },
  leaveTypes: {
    title: "ประเภทการลา",
    description: "จัดการประเภทการลาในระบบ",
    keywords: "ประเภทการลา, ตั้งค่าการลา",
  },
  holidays: {
    title: "วันหยุด",
    description: "จัดการวันหยุดราชการและวันหยุดพิเศษ",
    keywords: "วันหยุด, วันหยุดราชการ, วันหยุดพิเศษ",
  },
  login: {
    title: "เข้าสู่ระบบ",
    description: "เข้าสู่ระบบบริหารการลางานของบุคลากร",
    keywords: "เข้าสู่ระบบ, ล็อกอิน",
  },
  forgotPassword: {
    title: "ลืมรหัสผ่าน",
    description: "ขอลิงก์ตั้งรหัสผ่านใหม่สำหรับระบบบริหารการลา",
    keywords: "ลืมรหัสผ่าน, กู้คืนรหัสผ่าน",
  },
  resetPassword: {
    title: "ตั้งรหัสผ่านใหม่",
    description: "ตั้งรหัสผ่านใหม่สำหรับระบบบริหารการลา",
    keywords: "ตั้งรหัสผ่านใหม่, รีเซ็ตรหัสผ่าน",
  },
};

export default SEO;
