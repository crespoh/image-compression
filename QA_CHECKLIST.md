# QA Checklist – Easy Image Compress

Use this checklist before every release or major update.

---

## ✅ Functional Tests

| Test Item                      | Expected Result                                     | Status |
|-------------------------------|-----------------------------------------------------|--------|
| **Homepage loads**            | Page loads without error, displays main UI         | [ ]    |
| **Preset options visible**    | Etsy, Shopee, LinkedIn Banner, Custom shown        | [ ]    |
| **Custom input fields**       | Width, height, and size inputs appear for Custom   | [ ]    |
| **Switching presets**         | Presets update without affecting Custom fields      | [ ]    |
| **File upload (drag-drop)**   | Drag an image file, UI accepts it                  | [ ]    |
| **File upload (file picker)** | Click to upload works                              | [ ]    |
| **Unsupported file rejection**| Invalid files (e.g. .txt) are rejected             | [ ]    |
| **File compression**          | Image compresses according to preset/custom rules  | [ ]    |
| **File download**             | Download button triggers file download             | [ ]    |
| **Download size check**       | Compressed file size meets preset constraint       | [ ]    |

---

## ✅ UI/UX Tests

| Test Item                      | Expected Result                                     | Status |
|-------------------------------|-----------------------------------------------------|--------|
| **Responsive layout**         | Works on desktop, tablet, mobile widths            | [ ]    |
| **Dropdown layout**           | Preset selector fits and stays visible             | [ ]    |
| **After upload UI**           | "Upload new image" returns to top of page          | [ ]    |
| **Page refresh from scroll**  | Refresh resets scroll to top                       | [ ]    |
| **No broken layout**          | Text and buttons don't overflow or misalign        | [ ]    |

---

## ✅ Miscellaneous

| Test Item                      | Expected Result                                     | Status |
|-------------------------------|-----------------------------------------------------|--------|
| **Favicon displays**          | Custom icon shows in browser tab                   | [ ]    |
| **Links work**                | Footer links (Privacy, About, Contact) open        | [ ]    |
| **Privacy policy accuracy**   | Uses correct email (info@codedcheese.com)          | [ ]    |
| **No console errors**         | Open DevTools → no red errors in console           | [ ]    |
| **HTTPS certificate valid**   | HTTPS works, lock icon shows in browser            | [ ]    |

---

## 📱 Device Tests (Optional)

| Device                         | Browser     | Tested? |
|--------------------------------|-------------|---------|
| iPhone (Safari/Chrome)         | Safari/Chrome | [ ]    |
| Android (Chrome)               | Chrome        | [ ]    |
| macOS (Chrome/Firefox/Safari)  | All           | [ ]    |
| Windows (Edge/Chrome)          | All           | [ ]    |

---

_Last updated: {{ DATE }}_