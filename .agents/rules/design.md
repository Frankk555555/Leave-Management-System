---
trigger: always_on
---

---
name: Leave Management System
description: Clean, high-utility leave management app for employees, supervisors, and HR
colors:
  primary: "#667eea"
  primary-gradient-start: "#667eea"
  primary-gradient-end: "#764ba2"
  accent-amethyst: "#a855f7"
  neutral-bg: "#f5f7fa"
  neutral-text: "#2d3748"
  neutral-secondary: "#4a5568"
  neutral-muted: "#6c757d"
  neutral-placeholder: "#a0aec0"
  border: "#e2e8f0"
  success: "#059669"
  success-toast: "#10b981"
  error: "#dc2626"
  error-toast: "#ef4444"
  warning: "#f59e0b"
  info: "#3b82f6"
  submit: "#059669"
  cancel: "#dc2626"
  notification-badge: "#ff6b6b"
typography:
  display:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.2
  headline:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Sarabun, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "8px"
  default: "10px"
  lg: "12px"
  card-inner: "14px"
  card: "16px"
  xl: "20px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section-padding: "2.5rem 3.5rem"
components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, {colors.primary} 0%, {colors.primary-gradient-end} 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.default}"
    padding: "0.75rem 1.5rem"
    minHeight: "44px"
  button-submit:
    backgroundColor: "{colors.submit}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.875rem"
    height: "45px"
  button-cancel:
    backgroundColor: "{colors.cancel}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "0.875rem"
    height: "45px"
breakpoints:
  mobile: "480px"
  tablet: "768px"
  sidebar-collapse: "1024px"
---