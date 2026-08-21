import { useEffect } from "react";

/**
 * SEO Component - Manages document title, meta tags, canonical links, and robots indexing rules
 * Usage: <SEO {...SEOConfig.dashboard} /> or <SEO title="หน้าแดชบอร์ด" noIndex={true} />
 */
const SEO = ({
  title,
  description,
  keywords,
  ogImage = "/bru-logo-color.png",
  ogType = "website",
  canonicalUrl,
  noIndex = false,
}) => {
  const siteName = "ระบบบริหารการลางาน - มหาวิทยาลัยราชภัฏบุรีรัมย์";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription =
    "ระบบบริหารจัดการการลาของบุคลากรมหาวิทยาลัยราชภัฏบุรีรัมย์ - ขอลา อนุมัติลา และติดตามสถานะได้ง่ายๆ";

  useEffect(() => {
    // 1. Update Document Title
    document.title = fullTitle;

    // 2. Update or create Meta Description
    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.name = "description";
      document.head.appendChild(descriptionMeta);
    }
    descriptionMeta.content = description || defaultDescription;

    // 3. Update or create Meta Keywords
    if (keywords) {
      let keywordsMeta = document.querySelector('meta[name="keywords"]');
      if (!keywordsMeta) {
        keywordsMeta = document.createElement("meta");
        keywordsMeta.name = "keywords";
        document.head.appendChild(keywordsMeta);
      }
      keywordsMeta.content = keywords;
    }

    // 4. Update or create Robots Meta (index/noindex)
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement("meta");
      robotsMeta.name = "robots";
      document.head.appendChild(robotsMeta);
    }
    robotsMeta.content = noIndex ? "noindex, nofollow" : "index, follow";

    // 5. Update or create Canonical Link
    const currentCanonical =
      canonicalUrl ||
      (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");
    if (currentCanonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement("link");
        canonicalLink.rel = "canonical";
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.href = currentCanonical;
    }

    // 6. Open Graph Tags
    const currentUrl =
      typeof window !== "undefined" ? window.location.href : "";
    const ogTags = {
      "og:title": fullTitle,
      "og:description": description || defaultDescription,
      "og:type": ogType,
      "og:site_name": siteName,
      "og:url": currentUrl,
      "og:image": ogImage,
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      if (!content) return;
      let ogMeta = document.querySelector(`meta[property="${property}"]`);
      if (!ogMeta) {
        ogMeta = document.createElement("meta");
        ogMeta.setAttribute("property", property);
        document.head.appendChild(ogMeta);
      }
      ogMeta.content = content;
    });

    // 7. Twitter Tags
    const twitterTags = {
      "twitter:card": "summary_large_image",
      "twitter:title": fullTitle,
      "twitter:description": description || defaultDescription,
      "twitter:image": ogImage,
    };

    Object.entries(twitterTags).forEach(([name, content]) => {
      if (!content) return;
      let twMeta = document.querySelector(`meta[name="${name}"]`);
      if (!twMeta) {
        twMeta = document.createElement("meta");
        twMeta.name = name;
        document.head.appendChild(twMeta);
      }
      twMeta.content = content;
    });

    // Cleanup function to reset on unmount
    return () => {
      document.title = siteName;
    };
  }, [
    fullTitle,
    description,
    keywords,
    ogImage,
    ogType,
    canonicalUrl,
    noIndex,
    defaultDescription,
    siteName,
  ]);

  return null;
};

// Page-specific SEO configurations
export const SEOConfig = {
  // Public Pages (Indexable)
  login: {
    title: "เข้าสู่ระบบ",
    description: "เข้าสู่ระบบบริหารการลางานของบุคลากร มหาวิทยาลัยราชภัฏบุรีรัมย์",
    keywords: "เข้าสู่ระบบ, ล็อกอิน, ระบบลา BRU",
    noIndex: false,
  },
  forgotPassword: {
    title: "ลืมรหัสผ่าน",
    description: "ขอลิงก์ตั้งรหัสผ่านใหม่สำหรับระบบบริหารการลา มหาวิทยาลัยราชภัฏบุรีรัมย์",
    keywords: "ลืมรหัสผ่าน, กู้คืนรหัสผ่าน",
    noIndex: false,
  },
  resetPassword: {
    title: "ตั้งรหัสผ่านใหม่",
    description: "ตั้งรหัสผ่านใหม่สำหรับระบบบริหารการลา มหาวิทยาลัยราชภัฏบุรีรัมย์",
    keywords: "ตั้งรหัสผ่านใหม่, รีเซ็ตรหัสผ่าน",
    noIndex: false,
  },
  forms: {
    title: "แบบฟอร์มการลา",
    description: "ดาวน์โหลดเอกสารและแบบฟอร์มการลาประเภทต่างๆ มหาวิทยาลัยราชภัฏบุรีรัมย์",
    keywords: "แบบฟอร์มการลา, ดาวน์โหลดใบลา, เอกสารการลา, มหาวิทยาลัยราชภัฏบุรีรัมย์",
    noIndex: false,
  },
  regulations: {
    title: "ระเบียบและข้อบังคับการลา",
    description: "คู่มือ ระเบียบ และข้อบังคับการลาของบุคลากร มหาวิทยาลัยราชภัฏบุรีรัมย์",
    keywords: "ระเบียบการลา, ข้อบังคับการลา, สิทธิการลา, มหาวิทยาลัยราชภัฏบุรีรัมย์",
    noIndex: false,
  },
  register: {
    title: "ลงทะเบียนบุคลากร",
    description: "ลงทะเบียนเข้าใช้งานระบบบริหารการลางาน มหาวิทยาลัยราชภัฏบุรีรัมย์",
    keywords: "ลงทะเบียน, สมัครสมาชิก, ระบบลา BRU",
    noIndex: false,
  },

  // Authenticated / Private Portal Pages (NoIndex for privacy & PDPA)
  dashboard: {
    title: "หน้าหลัก",
    description: "ภาพรวมการลาและสถิติการใช้วันลาของคุณ",
    keywords: "หน้าหลัก, สถิติการลา, วันลาคงเหลือ",
    noIndex: true,
  },
  leaveRequest: {
    title: "ขอลาหยุด",
    description: "ส่งคำขอลาหยุดงาน เลือกประเภทการลาและระบุวันที่ต้องการลา",
    keywords: "ขอลา, ลาป่วย, ลากิจ, ลาพักร้อน",
    noIndex: true,
  },
  leaveHistory: {
    title: "ประวัติการลา",
    description: "ดูประวัติการลาทั้งหมดของคุณ ทั้งที่อนุมัติ รออนุมัติ และถูกปฏิเสธ",
    keywords: "ประวัติการลา, สถานะการลา, รายการลา",
    noIndex: true,
  },
  calendar: {
    title: "ปฏิทินวันลาและวันหยุด",
    description: "ดูปฏิทินวันหยุดราชการและวันลาของคุณ",
    keywords: "ปฏิทิน, วันหยุด, วันลา",
    noIndex: true,
  },
  teamCalendar: {
    title: "ปฏิทินวันลาทีม",
    description: "ดูตารางการลาของสมาชิกในทีมและหน่วยงาน",
    keywords: "ปฏิทินทีม, วันลาทีม, ตารางการลา",
    noIndex: true,
  },
  approvals: {
    title: "อนุมัติการลา",
    description: "ตรวจสอบและอนุมัติคำขอลาของทีมงานสำหรับหัวหน้างาน",
    keywords: "อนุมัติลา, ตรวจสอบการลา, หัวหน้างาน",
    noIndex: true,
  },
  profile: {
    title: "โปรไฟล์ส่วนตัว",
    description: "จัดการข้อมูลส่วนตัวและตั้งค่าบัญชีของคุณ",
    keywords: "โปรไฟล์, ข้อมูลส่วนตัว, ตั้งค่าบัญชี",
    noIndex: true,
  },
  users: {
    title: "จัดการบุคลากร",
    description: "จัดการข้อมูลบุคลากร เพิ่ม แก้ไข และลบผู้ใช้ในระบบ",
    keywords: "จัดการผู้ใช้, บุคลากร, ผู้ดูแลระบบ",
    noIndex: true,
  },
  reports: {
    title: "รายงานและสถิติ",
    description: "ดูรายงานสถิติการลาและส่งออกข้อมูล Excel / PDF",
    keywords: "รายงาน, สถิติ, ส่งออก Excel, PDF",
    noIndex: true,
  },
  leaveTypes: {
    title: "จัดการประเภทการลา",
    description: "จัดการประเภทการลาและสิทธิ์การลาในระบบ",
    keywords: "ประเภทการลา, ตั้งค่าการลา",
    noIndex: true,
  },
  holidays: {
    title: "จัดการวันหยุด",
    description: "จัดการวันหยุดราชการและวันหยุดพิเศษประจำปี",
    keywords: "วันหยุด, วันหยุดราชการ, วันหยุดพิเศษ",
    noIndex: true,
  },
  leaveManagement: {
    title: "จัดการใบลา",
    description: "จัดการและตรวจสอบใบลาทั้งหมดในระบบสำหรับผู้ดูแลระบบ",
    keywords: "จัดการใบลา, รายการคำขอลาทั้งหมด",
    noIndex: true,
  },
};

export default SEO;
