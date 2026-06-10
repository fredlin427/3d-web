import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaSqlite } from "prisma-adapter-sqlite";

const prisma = new PrismaClient({
  adapter: new PrismaSqlite({ url: "file:./dev.db" }),
});

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

  // ========== SETTINGS / MASTER DATA ==========
  console.log("Seeding settings...");

  const departments = [
    "Surgery", "Orthopaedics", "Neurosurgery", "ENT", "Dental",
    "Radiology", "Oncology", "Cardiology", "Other",
  ];

  const useTypes = [
    "Surgical planning", "Patient-specific model", "Education",
    "Training", "Research", "Device / jig / guide", "Other",
  ];

  const priorities = ["Routine", "Urgent", "High priority"];
  const caseStatuses = ["Draft", "In progress", "On hold", "Completed", "Cancelled"];
  const materialCategories = ["FDM Filaments", "SLA Resins", "Resin Tanks", "IPA"];
  const materialUnits = ["roll", "bottle", "cartridge", "litre", "ml", "kg", "g", "unit"];

  const progressSteps = [
    "Application Received", "Approval", "Segmentation / Design",
    "Verify Segmentation / Design", "Printing", "Post-processing",
    "Final Product", "Completion",
  ];

  const allSettings = [
    ...departments.map((v, i) => ({ type: "department", value: v, sortOrder: i + 1 })),
    ...useTypes.map((v, i) => ({ type: "use_type", value: v, sortOrder: i + 1 })),
    ...priorities.map((v, i) => ({ type: "priority", value: v, sortOrder: i + 1 })),
    ...caseStatuses.map((v, i) => ({ type: "case_status", value: v, sortOrder: i + 1 })),
    ...materialCategories.map((v, i) => ({ type: "material_category", value: v, sortOrder: i + 1 })),
    ...materialUnits.map((v, i) => ({ type: "material_unit", value: v, sortOrder: i + 1 })),
    ...progressSteps.map((v, i) => ({ type: "progress_step", value: v, sortOrder: i + 1 })),
  ];

  for (const s of allSettings) {
    await prisma.setting.create({ data: s });
  }

  // ========== MATERIALS (20 records) ==========
  console.log("Seeding materials...");

  const now = new Date();

  const materialData = [
    // FDM Filaments
    { category: "FDM Filaments", materialName: "PLA White", brand: "eSun", materialType: "PLA", colour: "White", batchNumber: "PLA-WH-2026-001", initialQty: 5, currentQty: 3, unit: "roll", threshold: 2, location: "Shelf A", status: "In stock", expiryOffset: 720, opened: true, supplier: "3D Printing Supplies Ltd" },
    { category: "FDM Filaments", materialName: "PLA Black", brand: "eSun", materialType: "PLA", colour: "Black", batchNumber: "PLA-BK-2026-002", initialQty: 4, currentQty: 1, unit: "roll", threshold: 2, location: "Shelf A", status: "Low stock", expiryOffset: 720, opened: true, supplier: "3D Printing Supplies Ltd" },
    { category: "FDM Filaments", materialName: "PLA Blue", brand: "Polymaker", materialType: "PLA", colour: "Blue", batchNumber: "PLA-BL-2026-003", initialQty: 3, currentQty: 3, unit: "roll", threshold: 1, location: "Shelf A", status: "In stock", expiryOffset: 600, opened: false },
    { category: "FDM Filaments", materialName: "PETG Clear", brand: "eSun", materialType: "PETG", colour: "Clear", batchNumber: "PETG-CL-2026-004", initialQty: 2, currentQty: 2, unit: "roll", threshold: 1, location: "Shelf B", status: "In stock", expiryOffset: 540, opened: false },
    { category: "FDM Filaments", materialName: "ABS White", brand: "eSun", materialType: "ABS", colour: "White", batchNumber: "ABS-WH-2026-005", initialQty: 3, currentQty: 0.5, unit: "roll", threshold: 1, location: "Shelf B", status: "Low stock", expiryOffset: 15, opened: true },
    { category: "FDM Filaments", materialName: "TPU Flexible Black", brand: "NinjaTek", materialType: "TPU", colour: "Black", batchNumber: "TPU-BK-2026-006", initialQty: 2, currentQty: 1.5, unit: "roll", threshold: 1, location: "Shelf B", status: "In stock", expiryOffset: 365, opened: true },
    { category: "FDM Filaments", materialName: "PLA Silk Gold", brand: "eSun", materialType: "PLA Silk", colour: "Gold", batchNumber: "PLA-GD-2025-007", initialQty: 2, currentQty: 0, unit: "roll", threshold: 1, location: "Shelf A", status: "Expired", expiryOffset: -30, opened: true },

    // SLA Resins
    { category: "SLA Resins", materialName: "Standard Grey Resin", brand: "Formlabs", materialType: "Standard", colour: "Grey", batchNumber: "RES-GR-2026-008", initialQty: 10, currentQty: 6, unit: "litre", threshold: 3, location: "Cold Storage", status: "In stock", expiryOffset: 365, opened: true, supplier: "Formlabs UK" },
    { category: "SLA Resins", materialName: "Standard Clear Resin", brand: "Formlabs", materialType: "Standard", colour: "Clear", batchNumber: "RES-CL-2026-009", initialQty: 8, currentQty: 5, unit: "litre", threshold: 2, location: "Cold Storage", status: "In stock", expiryOffset: 365, opened: false },
    { category: "SLA Resins", materialName: "Tough 2000 Resin", brand: "Formlabs", materialType: "Tough", colour: "Amber", batchNumber: "RES-TF-2026-010", initialQty: 5, currentQty: 2, unit: "litre", threshold: 2, location: "Cold Storage", status: "Low stock", expiryOffset: 25, opened: true },
    { category: "SLA Resins", materialName: "Flexible 80A Resin", brand: "Formlabs", materialType: "Flexible", colour: "Black", batchNumber: "RES-FL-2026-011", initialQty: 4, currentQty: 3, unit: "litre", threshold: 1, location: "Cold Storage", status: "Opened", expiryOffset: 240, opened: true },
    { category: "SLA Resins", materialName: "BioMed Clear Resin", brand: "Formlabs", materialType: "Biomedical", colour: "Clear", batchNumber: "RES-BM-2026-012", initialQty: 3, currentQty: 3, unit: "litre", threshold: 1, location: "Cold Storage", status: "In stock", expiryOffset: 180, opened: false, supplier: "Formlabs UK" },
    { category: "SLA Resins", materialName: "Draft Resin", brand: "Formlabs", materialType: "Draft", colour: "Grey", batchNumber: "RES-DR-2026-013", initialQty: 6, currentQty: 4, unit: "litre", threshold: 2, location: "Cold Storage", status: "In stock", expiryOffset: 180, opened: true },
    { category: "SLA Resins", materialName: "Castable Wax Resin", brand: "Formlabs", materialType: "Castable", colour: "Purple", batchNumber: "RES-CW-2025-014", initialQty: 2, currentQty: 0, unit: "litre", threshold: 1, location: "Cold Storage", status: "Expired", expiryOffset: -60, opened: true },

    // Resin Tanks
    { category: "Resin Tanks", materialName: "Form 3 Resin Tank V2", brand: "Formlabs", materialType: "Tank", colour: "Clear", batchNumber: "TNK-F3-2026-015", initialQty: 4, currentQty: 2, unit: "unit", threshold: 2, location: "Printer Station 1", status: "Opened", expiryOffset: 180, opened: true },
    { category: "Resin Tanks", materialName: "Form 3B Resin Tank", brand: "Formlabs", materialType: "Tank", colour: "Clear", batchNumber: "TNK-3B-2026-016", initialQty: 3, currentQty: 1, unit: "unit", threshold: 2, location: "Printer Station 1", status: "Low stock", expiryOffset: 20, opened: true },
    { category: "Resin Tanks", materialName: "Form 3L Resin Tank", brand: "Formlabs", materialType: "Tank", colour: "Clear", batchNumber: "TNK-3L-2026-017", initialQty: 2, currentQty: 2, unit: "unit", threshold: 1, location: "Printer Station 2", status: "In stock", expiryOffset: 180, opened: false },

    // IPA
    { category: "IPA", materialName: "Isopropyl Alcohol 99.9%", brand: "RS Pro", materialType: "Solvent", colour: "Clear", batchNumber: "IPA-2026-018", initialQty: 20, currentQty: 8, unit: "litre", threshold: 5, location: "Hazardous Cabinet", status: "Opened", expiryOffset: 720, opened: true, supplier: "RS Components" },
    { category: "IPA", materialName: "Isopropyl Alcohol 70%", brand: "MediClean", materialType: "Solvent", colour: "Clear", batchNumber: "IPA-2026-019", initialQty: 15, currentQty: 12, unit: "litre", threshold: 5, location: "Hazardous Cabinet", status: "In stock", expiryOffset: 720, opened: false },
    { category: "IPA", materialName: "IPA Wash Solution", brand: "Formlabs", materialType: "Solvent", colour: "Clear", batchNumber: "IPA-FW-2026-020", initialQty: 10, currentQty: 3, unit: "litre", threshold: 3, location: "Hazardous Cabinet", status: "Low stock", expiryOffset: 45, opened: true },
  ];

  const createdMaterials = [];
  for (const m of materialData) {
    const purchaseDate = new Date(2026, 0, Math.floor(Math.random() * 5) + 1);
    const receivedDate = new Date(purchaseDate.getTime() + 2 * 24 * 60 * 60 * 1000);
    const openDate = m.opened ? new Date(receivedDate.getTime() + Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000) : null;
    const expiryDate = new Date(now.getTime() + m.expiryOffset * 24 * 60 * 60 * 1000);

    const material = await prisma.material.create({
      data: {
        category: m.category,
        materialName: m.materialName,
        brand: m.brand,
        materialType: m.materialType,
        colour: m.colour,
        batchNumber: m.batchNumber,
        supplier: m.supplier || null,
        purchaseDate,
        receivedDate,
        openDate,
        expiryDate,
        disposalDate: null,
        initialQuantity: m.initialQty,
        currentQuantity: m.currentQty,
        unit: m.unit,
        reorderThreshold: m.threshold,
        storageLocation: m.location,
        status: m.status,
      },
    });

    await prisma.stockTransaction.create({
      data: {
        materialId: material.id,
        transactionType: "Refill",
        quantityChange: m.initialQty,
        quantityAfter: m.initialQty,
        transactionDate: receivedDate,
        staffName: "System",
        notes: "Initial stock",
      },
    });

    createdMaterials.push(material);
  }

  // ========== CASES (12 records) ==========
  console.log("Seeding cases...");

  const caseData = [
    { caseNumber: "3DP-2026-0001", department: "Orthopaedics", applicantName: "Dr. Sarah Chen", useType: "Surgical planning", projectTitle: "Pelvic Fracture Pre-op Planning", description: "Pre-operative planning model for complex pelvic fracture reconstruction", clinicalPurpose: "Surgical planning and implant sizing for pelvic reconstruction surgery", priority: "High priority", status: "Completed", progressStepIndex: 7, monthsAgo: 5 },
    { caseNumber: "3DP-2026-0002", department: "Neurosurgery", applicantName: "Dr. James Wilson", useType: "Surgical planning", projectTitle: "Cranial Defect Reconstruction", description: "Custom cranial implant planning for post-trauma reconstruction", clinicalPurpose: "Patient-specific cranial implant design and surgical guide", priority: "Urgent", status: "Completed", progressStepIndex: 7, monthsAgo: 4 },
    { caseNumber: "3DP-2026-0003", department: "Dental", applicantName: "Dr. Emily Taylor", useType: "Device / jig / guide", projectTitle: "Dental Surgical Guide Set", description: "Series of surgical guides for dental implant placement", clinicalPurpose: "Precise implant positioning using 3D printed surgical guides", priority: "Routine", status: "Completed", progressStepIndex: 7, monthsAgo: 3 },
    { caseNumber: "3DP-2026-0004", department: "Surgery", applicantName: "Dr. Michael Brown", useType: "Patient-specific model", projectTitle: "Liver Resection Model", description: "Patient-specific liver model with tumour visualization", clinicalPurpose: "Pre-surgical planning for complex liver resection", priority: "High priority", status: "In progress", progressStepIndex: 2, monthsAgo: 2 },
    { caseNumber: "3DP-2026-0005", department: "Oncology", applicantName: "Dr. Lisa Wang", useType: "Education", projectTitle: "Tumour Board Presentation Models", description: "3D printed tumour models for MDT meetings", clinicalPurpose: "Educational models for tumour board discussions", priority: "Routine", status: "In progress", progressStepIndex: 4, monthsAgo: 1.5 },
    { caseNumber: "3DP-2026-0006", department: "Cardiology", applicantName: "Dr. Robert Kim", useType: "Surgical planning", projectTitle: "Congenital Heart Defect Model", description: "3D model of complex congenital heart defect", clinicalPurpose: "Pre-surgical assessment for paediatric cardiac surgery", priority: "Urgent", status: "In progress", progressStepIndex: 3, monthsAgo: 1 },
    { caseNumber: "3DP-2026-0007", department: "ENT", applicantName: "Dr. Anna Patel", useType: "Training", projectTitle: "Temporal Bone Dissection Models", description: "Series of temporal bone models for surgical training", clinicalPurpose: "Surgical simulation and training for ENT residents", priority: "Routine", status: "Draft", progressStepIndex: 0, monthsAgo: 0.5 },
    { caseNumber: "3DP-2026-0008", department: "Radiology", applicantName: "Dr. Thomas Lee", useType: "Research", projectTitle: "CT to 3D Print Validation Study", description: "Research study validating CT-segmented 3D printed models", clinicalPurpose: "Research validation of 3D printing accuracy", priority: "Routine", status: "In progress", progressStepIndex: 4, monthsAgo: 2.5 },
    { caseNumber: "3DP-2026-0009", department: "Orthopaedics", applicantName: "Dr. Sarah Chen", useType: "Surgical planning", projectTitle: "Knee Osteotomy Guide", description: "Patient-specific cutting guide for high tibial osteotomy", clinicalPurpose: "Custom surgical guide for precise osteotomy cuts", priority: "High priority", status: "On hold", progressStepIndex: 1, monthsAgo: 1 },
    { caseNumber: "3DP-2026-0010", department: "Neurosurgery", applicantName: "Dr. James Wilson", useType: "Patient-specific model", projectTitle: "Spine Deformity Model", description: "Full spine model for scoliosis surgical planning", clinicalPurpose: "3D visualization of spinal deformity", priority: "Urgent", status: "In progress", progressStepIndex: 5, monthsAgo: 0.8 },
    { caseNumber: "3DP-2026-0011", department: "Dental", applicantName: "Dr. Emily Taylor", useType: "Device / jig / guide", projectTitle: "Orthognathic Surgery Splints", description: "Intermediate and final splints for orthognathic surgery", clinicalPurpose: "Surgical splints for maxillofacial repositioning", priority: "Routine", status: "Draft", progressStepIndex: 0, monthsAgo: 0.3 },
    { caseNumber: "3DP-2026-0012", department: "Radiology", applicantName: "Dr. Thomas Lee", useType: "Education", projectTitle: "Anatomy Teaching Collection", description: "Collection of anatomical models for medical education", clinicalPurpose: "Teaching aids for anatomy education programme", priority: "Routine", status: "Cancelled", progressStepIndex: 1, monthsAgo: 2 },
  ];

  const createdCases = [];
  for (const c of caseData) {
    const appDate = new Date(now.getTime() - c.monthsAgo * 30 * 24 * 60 * 60 * 1000);

    const newCase = await prisma.case.create({
      data: {
        caseNumber: c.caseNumber,
        applicationDate: appDate,
        department: c.department,
        applicantName: c.applicantName,
        contact: `${c.applicantName.split(" ")[1].toLowerCase()}@qeh.nhs.uk`,
        useType: c.useType,
        projectTitle: c.projectTitle,
        description: c.description,
        clinicalPurpose: c.clinicalPurpose,
        priority: c.priority,
        requiredDate: new Date(appDate.getTime() + 14 * 24 * 60 * 60 * 1000),
        currentStatus: c.status,
        currentProgressStep: progressSteps[c.progressStepIndex] || progressSteps[0],
        modelImageUrl: null,
        photoFolderUrl: null,
      },
    });

    createdCases.push(newCase);

    // Create progress steps
    for (let i = 0; i < progressSteps.length; i++) {
      let stepStatus = "Not started";
      let completedDate: Date | null = null;

      if (i < c.progressStepIndex) {
        stepStatus = "Completed";
        completedDate = new Date(appDate.getTime() + (i + 1) * 2 * 24 * 60 * 60 * 1000);
      } else if (i === c.progressStepIndex) {
        stepStatus = c.status === "Completed" ? "Completed" : c.status === "Cancelled" ? "Skipped" : "In progress";
        completedDate = c.status === "Completed" ? new Date() : null;
      }

      await prisma.caseProgressStep.create({
        data: {
          caseId: newCase.id,
          stepName: progressSteps[i],
          stepOrder: i + 1,
          status: stepStatus,
          completedDate,
          staffName: stepStatus === "Completed" || stepStatus === "In progress" ? c.applicantName : null,
          notes: stepStatus === "Completed" ? `Step completed` : null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: "Case",
        entityId: newCase.id,
        action: "case_created",
        staffName: c.applicantName,
        details: `Case ${c.caseNumber} created`,
        createdAt: appDate,
      },
    });
  }

  // ========== MATERIAL USAGE ==========
  console.log("Seeding material usage...");

  const usageData = [
    { caseIdx: 0, materialIdx: 0, qty: 0.5, printer: "Prusa i3 MK4" },
    { caseIdx: 0, materialIdx: 7, qty: 1.5, printer: "Form 3B" },
    { caseIdx: 1, materialIdx: 1, qty: 0.8, printer: "Prusa i3 MK4" },
    { caseIdx: 1, materialIdx: 9, qty: 1.0, printer: "Form 3B" },
    { caseIdx: 2, materialIdx: 7, qty: 0.5, printer: "Form 3B" },
    { caseIdx: 3, materialIdx: 0, qty: 0.3, printer: "Prusa i3 MK4" },
    { caseIdx: 3, materialIdx: 11, qty: 0.8, printer: "Form 3B" },
    { caseIdx: 4, materialIdx: 2, qty: 0.5, printer: "Prusa i3 MK4" },
    { caseIdx: 5, materialIdx: 3, qty: 0.4, printer: "Prusa XL" },
    { caseIdx: 5, materialIdx: 8, qty: 0.5, printer: "Form 3" },
    { caseIdx: 7, materialIdx: 5, qty: 0.3, printer: "Prusa i3 MK4" },
    { caseIdx: 7, materialIdx: 12, qty: 1.0, printer: "Form 3B" },
    { caseIdx: 9, materialIdx: 4, qty: 0.3, printer: "Prusa XL" },
    { caseIdx: 9, materialIdx: 19, qty: 0.5, printer: "Form 3" },
  ];

  for (const u of usageData) {
    const theCase = createdCases[u.caseIdx];
    const theMaterial = createdMaterials[u.materialIdx];
    if (!theCase || !theMaterial) continue;

    const usageDate = new Date(new Date(theCase.applicationDate).getTime() + 5 * 24 * 60 * 60 * 1000);

    await prisma.caseMaterialUsage.create({
      data: {
        caseId: theCase.id,
        materialId: theMaterial.id,
        usageDate,
        quantityUsed: u.qty,
        unit: theMaterial.unit,
        staffName: theCase.applicantName,
        printerOrTank: u.printer,
        notes: `Material used for ${theCase.caseNumber}`,
      },
    });

    await prisma.stockTransaction.create({
      data: {
        materialId: theMaterial.id,
        transactionType: "Usage",
        quantityChange: -u.qty,
        quantityAfter: Math.max(0, theMaterial.currentQuantity - u.qty),
        relatedCaseId: theCase.id,
        transactionDate: usageDate,
        staffName: theCase.applicantName,
        notes: `Used for case ${theCase.caseNumber}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: "CaseMaterialUsage",
        entityId: theCase.id,
        action: "material_usage_added",
        staffName: theCase.applicantName,
        details: `${u.qty} ${theMaterial.unit} of ${theMaterial.materialName} used`,
        createdAt: usageDate,
      },
    });
  }

  console.log("Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
