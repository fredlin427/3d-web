import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaSqlite } from "prisma-adapter-sqlite";

const prisma = new PrismaClient({ adapter: new PrismaSqlite({ url: "file:./dev.db" }) });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.auditLog.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.caseMaterialUsage.deleteMany();
  await prisma.caseProgressStep.deleteMany();
  await prisma.case.deleteMany();
  await prisma.material.deleteMany();
  await prisma.setting.deleteMany();

  // ========== SETTINGS ==========
  console.log("Seeding settings...");

  const departments = ["SURG", "ANA", "ONC", "COS", "ORT", "NS", "ENT", "DENTAL", "RAD", "PAED", "Other"];
  const categories = ["Clinical Use", "Rehabilitation", "Training/ Education"];
  const purposes = [
    "Pre-op planning", "Intra-operative guide", "Patient education",
    "Device adaptation and modification", "OSH device", "Prosthesis and Orthosis",
    "Patient device for activity of daily living", "Patient device for training",
    "Medical training / education", "Research use", "Others",
  ];
  const modelTypes = ["Anatomical Model", "Device / Tool", "Anatomical + Device"];
  const ownershipTypes = ["3DPO", "Co-owned", "Applicant", "External"];
  const priorities = ["Routine", "Urgent", "High priority"];
  const caseStatuses = ["Draft", "In progress", "On hold", "Completed", "Cancelled"];
  const materialCategories = ["FDM Filaments", "SLA Resins", "Resin Tanks", "IPA"];
  const materialUnits = ["roll", "bottle", "cartridge", "litre", "ml", "kg", "g", "unit"];
  const progressSteps = ["Application Received", "Approval", "Segmentation / Design", "Verify Segmentation / Design", "Printing", "Post-processing", "Final Product", "Completion"];
  const ranks = ["CON", "COS", "Physicist", "MO", "Other"];
  const hospitals = ["QEH", "Other"];
  const serviceOptions = ["Segmentation", "Design", "Printing", "Segmentation, Design", "Segmentation, Printing", "Design, Printing", "Segmentation, Design, Printing"];
  const technicians = ["Madeleine", "Tiffany", "Other"];
  const printingParties = ["3DPO", "AMMA", "Printrite", "Other"];
  const materialStatuses = ["In stock", "Opened", "Low stock", "Expired", "Disposed"];
  const sterilizationOptions = ["Yes", "No"];
  const caseFormFields = [
    "caseNumber", "applicationDate", "expectedCompletionDate",
    "applicantName", "hospital", "rank", "department", "contact",
    "category", "purpose", "specification", "modelType",
    "projectTitle", "requiredService", "serviceRequirements",
    "requiresSterilization", "description", "quantity", "totalComponents",
    "approvalDate", "ownership", "priority", "currentStatus",
    "technician", "printingParty", "completionDate", "staffName",
    "modelImageUrl", "photoFolderUrl", "remarks",
  ];
  const materialFormFields = [
    "category", "materialName", "brand", "materialType", "colour", "batchNumber",
    "supplier", "initialQuantity", "currentQuantity", "unit",
    "reorderThreshold", "storageLocation", "status",
    "purchaseDate", "receivedDate", "openDate", "expiryDate", "disposalDate",
    "remarks",
  ];

  const allSettings = [
    ...departments.map((v, i) => ({ type: "department", value: v, sortOrder: i + 1 })),
    ...categories.map((v, i) => ({ type: "case_category", value: v, sortOrder: i + 1 })),
    ...purposes.map((v, i) => ({ type: "purpose", value: v, sortOrder: i + 1 })),
    ...modelTypes.map((v, i) => ({ type: "model_type", value: v, sortOrder: i + 1 })),
    ...ownershipTypes.map((v, i) => ({ type: "ownership", value: v, sortOrder: i + 1 })),
    ...priorities.map((v, i) => ({ type: "priority", value: v, sortOrder: i + 1 })),
    ...caseStatuses.map((v, i) => ({ type: "case_status", value: v, sortOrder: i + 1 })),
    ...hospitals.map((v, i) => ({ type: "hospital", value: v, sortOrder: i + 1 })),
    ...serviceOptions.map((v, i) => ({ type: "service_option", value: v, sortOrder: i + 1 })),
    ...technicians.map((v, i) => ({ type: "technician", value: v, sortOrder: i + 1 })),
    ...printingParties.map((v, i) => ({ type: "printing_party", value: v, sortOrder: i + 1 })),
    ...materialCategories.map((v, i) => ({ type: "material_category", value: v, sortOrder: i + 1 })),
    ...materialUnits.map((v, i) => ({ type: "material_unit", value: v, sortOrder: i + 1 })),
    ...materialStatuses.map((v, i) => ({ type: "material_status", value: v, sortOrder: i + 1 })),
    ...sterilizationOptions.map((v, i) => ({ type: "sterilization", value: v, sortOrder: i + 1 })),
    ...caseFormFields.map((v, i) => ({ type: "case_form_field", value: v, sortOrder: i + 1 })),
    ...materialFormFields.map((v, i) => ({ type: "material_form_field", value: v, sortOrder: i + 1 })),
    ...caseFormFields.map((v, i) => ({ type: "apply_form_field", value: v, sortOrder: i + 1 })),
    ...progressSteps.map((v, i) => ({ type: "progress_step", value: v, sortOrder: i + 1 })),
    ...ranks.map((v, i) => ({ type: "rank", value: v, sortOrder: i + 1 })),
  ];

  for (const s of allSettings) {
    await prisma.setting.create({ data: s });
  }

  // ========== MATERIALS (20) ==========
  console.log("Seeding materials...");

  const now = new Date();
  const materialData: Array<{
    category: string; materialName: string; brand: string; materialType: string; colour: string;
    batchNumber: string; initialQty: number; currentQty: number; unit: string; threshold: number;
    location: string; status: string; expiryOffset: number; supplier?: string; opened?: boolean;
  }> = [
    { category: "FDM Filaments", materialName: "PLA White", brand: "eSun", materialType: "PLA", colour: "White", batchNumber: "PLA-WH-2026-001", initialQty: 5, currentQty: 3, unit: "roll", threshold: 2, location: "Shelf A", status: "In stock", expiryOffset: 720, supplier: "3D Printing Supplies Ltd", opened: true },
    { category: "FDM Filaments", materialName: "PLA Black", brand: "eSun", materialType: "PLA", colour: "Black", batchNumber: "PLA-BK-2026-002", initialQty: 4, currentQty: 1, unit: "roll", threshold: 2, location: "Shelf A", status: "Low stock", expiryOffset: 720, opened: true },
    { category: "FDM Filaments", materialName: "PLA Blue", brand: "Polymaker", materialType: "PLA", colour: "Blue", batchNumber: "PLA-BL-2026-003", initialQty: 3, currentQty: 3, unit: "roll", threshold: 1, location: "Shelf A", status: "In stock", expiryOffset: 600, opened: false },
    { category: "FDM Filaments", materialName: "PETG Clear", brand: "eSun", materialType: "PETG", colour: "Clear", batchNumber: "PETG-CL-2026-004", initialQty: 2, currentQty: 2, unit: "roll", threshold: 1, location: "Shelf B", status: "In stock", expiryOffset: 540, opened: false },
    { category: "FDM Filaments", materialName: "ABS Natural", brand: "eSun", materialType: "ABS", colour: "White", batchNumber: "ABS-WH-2026-005", initialQty: 3, currentQty: 0.5, unit: "roll", threshold: 1, location: "Shelf B", status: "Low stock", expiryOffset: 15, opened: true },
    { category: "FDM Filaments", materialName: "TPU Flexible Black", brand: "NinjaTek", materialType: "TPU", colour: "Black", batchNumber: "TPU-BK-2026-006", initialQty: 2, currentQty: 1.5, unit: "roll", threshold: 1, location: "Shelf B", status: "In stock", expiryOffset: 365, opened: true },
    { category: "FDM Filaments", materialName: "PLA Silk Gold", brand: "eSun", materialType: "PLA Silk", colour: "Gold", batchNumber: "PLA-GD-2025-007", initialQty: 2, currentQty: 0, unit: "roll", threshold: 1, location: "Shelf A", status: "Expired", expiryOffset: -30, opened: true },
    { category: "SLA Resins", materialName: "Grey Resin", brand: "Formlabs", materialType: "Standard", colour: "Grey", batchNumber: "RES-GR-2026-008", initialQty: 10, currentQty: 6, unit: "litre", threshold: 3, location: "Cold Storage", status: "In stock", expiryOffset: 365, supplier: "Jadason", opened: true },
    { category: "SLA Resins", materialName: "Clear Resin", brand: "Formlabs", materialType: "Standard", colour: "Clear", batchNumber: "RES-CL-2026-009", initialQty: 8, currentQty: 5, unit: "litre", threshold: 2, location: "Cold Storage", status: "In stock", expiryOffset: 365, opened: false },
    { category: "SLA Resins", materialName: "Tough 2000 Resin", brand: "Formlabs", materialType: "Tough", colour: "Amber", batchNumber: "RES-TF-2026-010", initialQty: 5, currentQty: 2, unit: "litre", threshold: 2, location: "Cold Storage", status: "Low stock", expiryOffset: 25, opened: true },
    { category: "SLA Resins", materialName: "Flexible 80A Resin", brand: "Formlabs", materialType: "Flexible", colour: "Black", batchNumber: "RES-FL-2026-011", initialQty: 4, currentQty: 3, unit: "litre", threshold: 1, location: "Cold Storage", status: "Opened", expiryOffset: 240, opened: true },
    { category: "SLA Resins", materialName: "BioMed Clear Resin", brand: "Formlabs", materialType: "Biomedical", colour: "Clear", batchNumber: "RES-BM-2026-012", initialQty: 3, currentQty: 3, unit: "litre", threshold: 1, location: "Cold Storage", status: "In stock", expiryOffset: 180, opened: false, supplier: "Jadason" },
    { category: "SLA Resins", materialName: "Draft Resin", brand: "Formlabs", materialType: "Draft", colour: "Grey", batchNumber: "RES-DR-2026-013", initialQty: 6, currentQty: 4, unit: "litre", threshold: 2, location: "Cold Storage", status: "In stock", expiryOffset: 180, opened: true },
    { category: "SLA Resins", materialName: "Surgical Guide Resin", brand: "Formlabs", materialType: "Surgical Guide", colour: "Clear", batchNumber: "RES-SG-2026-021", initialQty: 3, currentQty: 3, unit: "litre", threshold: 1, location: "Cold Storage", status: "In stock", expiryOffset: 240, opened: false },
    { category: "Resin Tanks", materialName: "Form 3L Resin Tank V2", brand: "Formlabs", materialType: "Tank", colour: "Clear", batchNumber: "TNK-F3L02-2022-001", initialQty: 4, currentQty: 2, unit: "unit", threshold: 2, location: "Printer Station 1", status: "Opened", expiryOffset: 180, supplier: "Jadason", opened: true },
    { category: "Resin Tanks", materialName: "Form 3L Resin Tank V3", brand: "Formlabs", materialType: "Tank", colour: "Clear", batchNumber: "TNK-F3L03-2024-002", initialQty: 3, currentQty: 1, unit: "unit", threshold: 2, location: "Printer Station 1", status: "Low stock", expiryOffset: 20, supplier: "Jadason", opened: true },
    { category: "Resin Tanks", materialName: "Form 4 Resin Tank", brand: "Formlabs", materialType: "Tank", colour: "Clear", batchNumber: "TNK-F401-2025-003", initialQty: 2, currentQty: 2, unit: "unit", threshold: 1, location: "Printer Station 2", status: "In stock", expiryOffset: 180, supplier: "Jadason", opened: false },
    { category: "IPA", materialName: "99% Isopropyl Alcohol", brand: "Jadason", materialType: "Solvent", colour: "Clear", batchNumber: "IPA-3110834970", initialQty: 36, currentQty: 12, unit: "litre", threshold: 10, location: "Hazardous Cabinet", status: "Opened", expiryOffset: 720, supplier: "Jadason", opened: true },
    { category: "IPA", materialName: "99% Isopropyl Alcohol", brand: "Jadason", materialType: "Solvent", colour: "Clear", batchNumber: "IPA-3110913634", initialQty: 10.8, currentQty: 8, unit: "litre", threshold: 5, location: "Hazardous Cabinet", status: "In stock", expiryOffset: 720, supplier: "Jadason", opened: false },
    { category: "IPA", materialName: "99% Isopropyl Alcohol", brand: "Jadason", materialType: "Solvent", colour: "Clear", batchNumber: "IPA-3110958663", initialQty: 8.6, currentQty: 8.6, unit: "litre", threshold: 3, location: "Hazardous Cabinet", status: "In stock", expiryOffset: 720, supplier: "Jadason", opened: false },
  ];

  const createdMaterials = [];
  for (const m of materialData) {
    const purchaseDate = new Date(2025, 0, Math.floor(Math.random() * 5) + 1);
    const receivedDate = new Date(purchaseDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const openDate = m.opened ? new Date(receivedDate.getTime() + 14 * 24 * 60 * 60 * 1000) : null;
    const expiryDate = new Date(now.getTime() + m.expiryOffset * 24 * 60 * 60 * 1000);

    const material = await prisma.material.create({
      data: {
        category: m.category, materialName: m.materialName, brand: m.brand,
        materialType: m.materialType, colour: m.colour, batchNumber: m.batchNumber,
        supplier: m.supplier || null, purchaseDate, receivedDate, openDate,
        expiryDate, disposalDate: null,
        initialQuantity: m.initialQty, currentQuantity: m.currentQty, unit: m.unit,
        reorderThreshold: m.threshold, storageLocation: m.location, status: m.status,
      },
    });
    await prisma.stockTransaction.create({
      data: { materialId: material.id, transactionType: "Refill", quantityChange: m.initialQty, quantityAfter: m.initialQty, transactionDate: receivedDate, staffName: "System", notes: "Initial stock" },
    });
    createdMaterials.push(material);
  }

  // ========== CASES (from real QEH data + extras) ==========
  console.log("Seeding cases...");

  const progressStepNames = ["Application Received", "Approval", "Segmentation / Design", "Verify Segmentation / Design", "Printing", "Post-processing", "Final Product", "Completion"];

  const caseData = [
    { // From Case Master List: QEH3D-2627-001
      caseNumber: "QEH3D-2627-001", applicationDate: "2026-04-01", expectedCompletion: "2026-08-31",
      approvalDate: "2026-04-01", completionDate: "2026-05-17", ownership: "3DPO",
      department: "SURG", hospital: "QEH", applicantName: "Dr. Irene Lo",
      contact: "irenelo@qeh.nhs.uk", rank: "CON",
      category: "Rehabilitation", purpose: "Device adaptation and modification",
      specification: "N/A", projectTitle: "Liver Model for Training",
      description: "Liver model for training purposes",
      modelType: "Anatomical + Device", requiredService: "Segmentation, Design, Printing",
      serviceRequirements: "Liver model for training", requiresSterilization: "No",
      quantity: 1, totalComponents: 1, priority: "Routine",
      status: "Completed", progressStepIndex: 7,
      technician: "Madeleine", printingParty: "3DPO",
    },
    { // From Case Master List: QEH3D-2627-002
      caseNumber: "QEH3D-2627-002", applicationDate: "2026-04-17", expectedCompletion: "2026-05-10",
      approvalDate: "2026-04-17", completionDate: "2026-05-02", ownership: "Co-owned",
      department: "ANA", hospital: "QEH", applicantName: "Dr. Viki Yung",
      contact: "vikiyung@qeh.nhs.uk", rank: "COS",
      category: "Training/ Education", purpose: "Medical training / education",
      specification: "N/A", projectTitle: "Clavicle & 1st Ribs Anatomical Model",
      description: "Anatomical model for medical training",
      modelType: "Anatomical Model", requiredService: "Segmentation, Printing",
      serviceRequirements: "Rigid material, look like real bones", requiresSterilization: "No",
      quantity: 1, totalComponents: 4, priority: "Urgent",
      status: "Completed", progressStepIndex: 7,
      technician: "Tiffany", printingParty: "AMMA",
    },
    { // From Case Master List: QEH3D-2627-003 (in progress)
      caseNumber: "QEH3D-2627-003", applicationDate: "2026-04-27", expectedCompletion: "2026-05-25",
      approvalDate: "2026-04-28", completionDate: null, ownership: "Applicant",
      department: "ONC", hospital: "QEH", applicantName: "Mr. Terry Tsang",
      contact: "terrytsang@qeh.nhs.uk", rank: "Physicist",
      category: "Clinical Use", purpose: "Intra-operative guide",
      specification: "N/A", projectTitle: "Needle Insertion Tool (3cm)",
      description: "Intra-operative needle insertion guide tool",
      modelType: "Device / Tool", requiredService: "Printing",
      serviceRequirements: "Rigid material", requiresSterilization: "Yes",
      quantity: 1, totalComponents: 1, priority: "High priority",
      status: "In progress", progressStepIndex: 5,
      technician: "Tiffany", printingParty: "Printrite",
    },
    { // Extra case
      caseNumber: "QEH3D-2627-004", applicationDate: "2026-05-10", expectedCompletion: "2026-07-15",
      approvalDate: "2026-05-12", completionDate: null, ownership: "3DPO",
      department: "ORT", hospital: "QEH", applicantName: "Dr. Ken Wong",
      contact: "kenwong@qeh.nhs.uk", rank: "CON",
      category: "Clinical Use", purpose: "Pre-op planning",
      specification: "", projectTitle: "Hip Replacement Pre-op Planning",
      description: "Pre-operative planning model for total hip replacement",
      modelType: "Anatomical Model", requiredService: "Segmentation, Design, Printing",
      serviceRequirements: "Rigid material, colour print", requiresSterilization: "No",
      quantity: 1, totalComponents: 2, priority: "Routine",
      status: "In progress", progressStepIndex: 3,
      technician: "Madeleine", printingParty: "3DPO",
    },
    { caseNumber: "QEH3D-2627-005", applicationDate: "2026-05-20", expectedCompletion: "2026-08-01", approvalDate: null, completionDate: null, ownership: null, department: "SURG", hospital: "QEH", applicantName: "Dr. Mary Chan", contact: "marychan@qeh.nhs.uk", rank: "MO", category: "Clinical Use", purpose: "Patient education", specification: "", projectTitle: "Patient Education Heart Model", description: "3D printed heart model for patient education", modelType: "Anatomical Model", requiredService: "Design, Printing", serviceRequirements: "Soft material preferred", requiresSterilization: "No", quantity: 2, totalComponents: 2, priority: "Routine", status: "Draft", progressStepIndex: 0, technician: null, printingParty: null },
    { caseNumber: "QEH3D-2627-006", applicationDate: "2026-06-01", expectedCompletion: "2026-07-20", approvalDate: "2026-06-02", completionDate: null, ownership: "Co-owned", department: "DENTAL", hospital: "QEH", applicantName: "Dr. Peter Lam", contact: "peterlam@qeh.nhs.uk", rank: "CON", category: "Clinical Use", purpose: "Device adaptation and modification", specification: "", projectTitle: "Dental Implant Surgical Guide", description: "Custom surgical guide for dental implant", modelType: "Device / Tool", requiredService: "Segmentation, Design, Printing", serviceRequirements: "Rigid material, sterilizable", requiresSterilization: "Yes", quantity: 1, totalComponents: 1, priority: "Urgent", status: "In progress", progressStepIndex: 2, technician: "Tiffany", printingParty: "3DPO" },
    { caseNumber: "QEH3D-2627-007", applicationDate: "2026-06-08", expectedCompletion: "2026-09-01", approvalDate: null, completionDate: null, ownership: null, department: "ONC", hospital: "QEH", applicantName: "Dr. Lisa Wong", contact: "lisawong@qeh.nhs.uk", rank: "CON", category: "Training/ Education", purpose: "Research use", specification: "Research study approved by ethics committee", projectTitle: "3D Printed Model Accuracy Validation Study", description: "Research study comparing 3D printed anatomical models to CT scans", modelType: "Anatomical Model", requiredService: "Segmentation, Printing", serviceRequirements: "Accurate segmentation required for validation", requiresSterilization: "No", quantity: 5, totalComponents: 5, priority: "Routine", status: "Draft", progressStepIndex: 0, technician: null, printingParty: null },
    { caseNumber: "QEH3D-2627-008", applicationDate: "2026-03-15", expectedCompletion: "2026-05-01", approvalDate: "2026-03-16", completionDate: "2026-04-28", ownership: "3DPO", department: "NS", hospital: "QEH", applicantName: "Dr. Alan Cheung", contact: "alancheung@qeh.nhs.uk", rank: "COS", category: "Clinical Use", purpose: "Pre-op planning", specification: "", projectTitle: "Spine Fusion Surgical Planning", description: "Lumbar spine model for fusion surgery planning", modelType: "Anatomical Model", requiredService: "Segmentation, Design, Printing", serviceRequirements: "Rigid material, bone-like colour", requiresSterilization: "No", quantity: 1, totalComponents: 1, priority: "High priority", status: "Completed", progressStepIndex: 7, technician: "Madeleine", printingParty: "3DPO" },
    { caseNumber: "QEH3D-2627-009", applicationDate: "2026-02-20", expectedCompletion: "2026-04-15", approvalDate: "2026-02-21", completionDate: null, ownership: null, department: "ENT", hospital: "QEH", applicantName: "Dr. Rachel Ho", contact: "rachelho@qeh.nhs.uk", rank: "CON", category: "Rehabilitation", purpose: "OSH device", specification: "", projectTitle: "Custom OSH Device for Tracheostomy Patient", description: "Custom oral-surgical-hyoid device", modelType: "Device / Tool", requiredService: "Design, Printing", serviceRequirements: "Flexible material, biocompatible", requiresSterilization: "Yes", quantity: 1, totalComponents: 1, priority: "Urgent", status: "On hold", progressStepIndex: 1, technician: "Tiffany", printingParty: "AMMA" },
    { caseNumber: "QEH3D-2627-010", applicationDate: "2026-06-10", expectedCompletion: "2026-07-30", approvalDate: null, completionDate: null, ownership: null, department: "PAED", hospital: "QEH", applicantName: "Dr. Carmen Lau", contact: "carmenlau@qeh.nhs.uk", rank: "MO", category: "Clinical Use", purpose: "Prosthesis and Orthosis", specification: "", projectTitle: "Paediatric Hand Prosthesis", description: "Custom hand prosthesis for paediatric patient", modelType: "Anatomical + Device", requiredService: "Segmentation, Design, Printing", serviceRequirements: "Flexible and durable, child-safe materials", requiresSterilization: "No", quantity: 1, totalComponents: 3, priority: "High priority", status: "Draft", progressStepIndex: 0, technician: null, printingParty: null },
  ];

  const createdCases = [];
  for (const c of caseData) {
    const appDate = new Date(c.applicationDate);
    const newCase = await prisma.case.create({
      data: {
        caseNumber: c.caseNumber, applicationDate: appDate,
        expectedCompletionDate: c.expectedCompletion ? new Date(c.expectedCompletion) : null,
        approvalDate: c.approvalDate ? new Date(c.approvalDate) : null,
        completionDate: c.completionDate ? new Date(c.completionDate) : null,
        ownership: c.ownership, department: c.department, hospital: c.hospital,
        applicantName: c.applicantName, contact: c.contact, rank: c.rank,
        category: c.category, purpose: c.purpose, specification: c.specification || null,
        projectTitle: c.projectTitle, description: c.description || null,
        modelType: c.modelType, requiredService: c.requiredService,
        serviceRequirements: c.serviceRequirements || null,
        requiresSterilization: c.requiresSterilization,
        quantity: c.quantity, totalComponents: c.totalComponents,
        priority: c.priority, currentStatus: c.status,
        currentProgressStep: progressStepNames[c.progressStepIndex] || progressStepNames[0],
        technician: c.technician, printingParty: c.printingParty,
        modelImageUrl: null, photoFolderUrl: null, remarks: null,
      },
    });

    createdCases.push(newCase);

    // Create progress steps
    for (let i = 0; i < progressStepNames.length; i++) {
      let stepStatus = "Not started";
      let completedDate: Date | null = null;
      if (i < c.progressStepIndex) {
        stepStatus = "Completed";
        completedDate = new Date(appDate.getTime() + (i + 1) * 2 * 24 * 60 * 60 * 1000);
      } else if (i === c.progressStepIndex) {
        stepStatus = c.status === "Completed" ? "Completed" : c.status === "Cancelled" ? "Skipped" : c.status === "On hold" ? "Not started" : "In progress";
        completedDate = c.status === "Completed" ? new Date() : null;
      }

      await prisma.caseProgressStep.create({
        data: {
          caseId: newCase.id, stepName: progressStepNames[i], stepOrder: i + 1,
          status: stepStatus, completedDate,
          staffName: stepStatus === "Completed" || stepStatus === "In progress" ? c.technician || c.applicantName : null,
          notes: stepStatus === "Completed" ? "Step completed" : null,
        },
      });
    }

    await prisma.auditLog.create({
      data: { entityType: "Case", entityId: newCase.id, action: "case_created", staffName: c.applicantName, details: `Case ${c.caseNumber} created`, createdAt: appDate },
    });
  }

  // ========== MATERIAL USAGE ==========
  console.log("Seeding material usage...");

  const usageData = [
    { caseIdx: 0, materialIdx: 0, qty: 0.3, printer: "Prusa i3 MK4" },
    { caseIdx: 0, materialIdx: 7, qty: 1.0, printer: "Form 3B" },
    { caseIdx: 1, materialIdx: 1, qty: 0.4, printer: "Prusa i3 MK4" },
    { caseIdx: 1, materialIdx: 8, qty: 0.5, printer: "Form 3B" },
    { caseIdx: 2, materialIdx: 9, qty: 0.5, printer: "Form 4B" },
    { caseIdx: 3, materialIdx: 0, qty: 0.3, printer: "Prusa i3 MK4" },
    { caseIdx: 3, materialIdx: 7, qty: 0.8, printer: "Form 3BL" },
    { caseIdx: 5, materialIdx: 7, qty: 0.5, printer: "Form 3B" },
    { caseIdx: 7, materialIdx: 2, qty: 0.3, printer: "Prusa i3 MK4" },
    { caseIdx: 7, materialIdx: 7, qty: 1.0, printer: "Form 3BL" },
    { caseIdx: 5, materialIdx: 16, qty: 0.3, printer: "Form 4B" },
    { caseIdx: 6, materialIdx: 4, qty: 0.2, printer: "Prusa XL" },
    { caseIdx: 6, materialIdx: 18, qty: 2.0, printer: "Form 3B" },
  ];

  for (const u of usageData) {
    const theCase = createdCases[u.caseIdx];
    const theMaterial = createdMaterials[u.materialIdx];
    if (!theCase || !theMaterial) continue;

    const usageDate = new Date(new Date(theCase.applicationDate).getTime() + 5 * 24 * 60 * 60 * 1000);
    await prisma.caseMaterialUsage.create({
      data: { caseId: theCase.id, materialId: theMaterial.id, usageDate, quantityUsed: u.qty, unit: theMaterial.unit, staffName: theCase.applicantName, printerOrTank: u.printer, notes: `Used for case ${theCase.caseNumber}` },
    });
    await prisma.stockTransaction.create({
      data: { materialId: theMaterial.id, transactionType: "Usage", quantityChange: -u.qty, quantityAfter: Math.max(0, theMaterial.currentQuantity - u.qty), relatedCaseId: theCase.id, transactionDate: usageDate, staffName: theCase.applicantName, notes: `Used for case ${theCase.caseNumber}` },
    });
    await prisma.auditLog.create({
      data: { entityType: "CaseMaterialUsage", entityId: theCase.id, action: "material_usage_added", staffName: theCase.applicantName, details: `${u.qty} ${theMaterial.unit} of ${theMaterial.materialName} used`, createdAt: usageDate },
    });
  }

  console.log("Seed complete!");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
