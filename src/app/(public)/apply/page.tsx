"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComboBox } from "@/components/ui/combobox";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PURPOSES, CATEGORIES, SERVICE_OPTIONS, MATERIAL_TYPES, COPYRIGHT_RISK_OPTIONS, REPRINT_OPTIONS, STERILIZATION_OPTIONS } from "@/lib/constants";

const BASE_OPTIONS: Record<string, string[]> = {
  department: ["SURG","ANA","ONC","COS","ORT","NS","ENT","DENTAL","RAD","PAED","Other"],
  hospital: ["QEH","Other"],
  rank: ["CON","COS","Physicist","MO","Other"],
  service_option: [...SERVICE_OPTIONS],
  sterilization: [...STERILIZATION_OPTIONS],
};

interface ApplyFormData {
  // Part I
  applicantName: string;
  expectedCompletionDate: string;
  hospital: string;
  rank: string;
  department: string;
  telephone: string;
  email: string;
  // Purpose
  purposeCategory: string;
  purposeCheckboxes: Record<string, boolean>;
  purposeOthers: string;
  isReprint: string;
  fundingSource: string;
  // Service & Printing
  serviceRequirement: string;
  printingSegmentation: boolean;
  printingSegmentationROI: string;
  printingDesign: boolean;
  printingDesignRequirement: string;
  printingService: boolean;
  printingQuantity: number;
  printingOthers: boolean;
  printingOthersSpec: string;
  modelMaterialRigid: boolean;
  modelMaterialSoft: boolean;
  materialSpecify: string;
  colourRequirement: boolean;
  colourRequirementSpec: string;
  sterilization: string;
  otherRequirements: boolean;
  otherRequirementsSpec: string;
  // Copyright
  copyrightRisk: string;
  copyrightDetails: string;
  // Signature
  signature: string;
  signatureDate: string;
}

const EMPTY_FORM: ApplyFormData = {
  applicantName: "", expectedCompletionDate: "", hospital: "QEH", rank: "", department: "", telephone: "", email: "",
  purposeCategory: "", purposeCheckboxes: {}, purposeOthers: "", isReprint: "", fundingSource: "",
  serviceRequirement: "",
  printingSegmentation: false, printingSegmentationROI: "",
  printingDesign: false, printingDesignRequirement: "",
  printingService: false, printingQuantity: 1,
  printingOthers: false, printingOthersSpec: "",
  modelMaterialRigid: false, modelMaterialSoft: false, materialSpecify: "",
  colourRequirement: false, colourRequirementSpec: "",
  sterilization: "", otherRequirements: false, otherRequirementsSpec: "",
  copyrightRisk: "", copyrightDetails: "",
  signature: "", signatureDate: "",
};

export default function ApplyPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [form, setForm] = useState<ApplyFormData>({ ...EMPTY_FORM });
  const [optionsMap, setOptionsMap] = useState<Record<string, string[]>>(BASE_OPTIONS);

  const update = <K extends keyof ApplyFormData>(key: K, value: ApplyFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json()).then((j) => {
        if (j.success) {
          const map = { ...BASE_OPTIONS };
          for (const item of j.data) {
            if (item.isActive && !item.type.endsWith("_form_field") && item.type !== "progress_step") {
              if (!map[item.type]) map[item.type] = [];
              if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
            }
          }
          for (const cat of CATEGORIES) {
            const key = `purpose_${cat}`;
            const fromSettings = j.data.filter((s: any) => s.type === key && s.isActive).map((s: any) => s.value);
            map[key] = fromSettings.length > 0 ? fromSettings : (PURPOSES[cat] || []);
          }
          setOptionsMap(map);
        }
      }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = () => {
      fetch("/api/settings").then((r) => r.json()).then((j) => {
        if (j.success) {
          const map = { ...BASE_OPTIONS };
          for (const item of j.data) {
            if (item.isActive && !item.type.endsWith("_form_field") && item.type !== "progress_step") {
              if (!map[item.type]) map[item.type] = [];
              if (!map[item.type].includes(item.value)) map[item.type].push(item.value);
            }
          }
          for (const cat of CATEGORIES) {
            const key = `purpose_${cat}`;
            const fromSettings = j.data.filter((s: any) => s.type === key && s.isActive).map((s: any) => s.value);
            map[key] = fromSettings.length > 0 ? fromSettings : (PURPOSES[cat] || []);
          }
          setOptionsMap(map);
        }
      }).catch(() => {});
    };
    window.addEventListener("settings-updated", handler);
    return () => window.removeEventListener("settings-updated", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.applicantName) { toast.error("Please fill in Applicant name"); return; }
    if (!form.purposeCategory) { toast.error("Please select a purpose category"); return; }

    setSubmitting(true);
    try {
      const purposeOptions = optionsMap[`purpose_${form.purposeCategory}`] || PURPOSES[form.purposeCategory] || [];
      const selectedPurposes = purposeOptions.filter((p) => form.purposeCheckboxes[p]);
      const purposeStr = selectedPurposes.length > 0 ? selectedPurposes.join("; ") : form.purposeCategory;
      const fullPurpose = form.purposeOthers ? `${purposeStr} — Others: ${form.purposeOthers}` : purposeStr;

      const contactParts = [];
      if (form.telephone) contactParts.push(`Tel: ${form.telephone}`);
      if (form.email) contactParts.push(`Email: ${form.email}`);
      const contact = contactParts.join("; ") || null;

      const materials = [];
      if (form.modelMaterialRigid) materials.push("Rigid material");
      if (form.modelMaterialSoft) materials.push("Soft material");
      const modelMaterial = materials.length > 0 ? materials.join("; ") : null;
      const fullModelMaterial = form.materialSpecify ? `${modelMaterial || ""} — Specify: ${form.materialSpecify}`.trim() : modelMaterial;

      const printReqs = [];
      if (form.printingSegmentation) printReqs.push(`Segmentation${form.printingSegmentationROI ? ` (ROI: ${form.printingSegmentationROI})` : ""}`);
      if (form.printingDesign) printReqs.push(`Device/Tools Design${form.printingDesignRequirement ? ` (Req: ${form.printingDesignRequirement})` : ""}`);
      if (form.printingService) printReqs.push(`Printing Service${form.printingQuantity > 1 ? ` (QTY: ${form.printingQuantity})` : ""}`);
      if (form.printingOthers) printReqs.push(`Others${form.printingOthersSpec ? `: ${form.printingOthersSpec}` : ""}`);
      const serviceRequirementStr = printReqs.length > 0 ? printReqs.join("; ") : null;
      const serviceRequirements = serviceRequirementStr;

      const extraReqs = [];
      if (form.colourRequirement && form.colourRequirementSpec) extraReqs.push(`Colour: ${form.colourRequirementSpec}`);
      else if (form.colourRequirement) extraReqs.push("Colour required");
      if (form.otherRequirements && form.otherRequirementsSpec) extraReqs.push(`Other: ${form.otherRequirementsSpec}`);
      else if (form.otherRequirements) extraReqs.push("Other requirements noted");

      const remarksParts = [];
      if (form.isReprint === "Yes") remarksParts.push(`Reprint. Funding: ${form.fundingSource || "Not specified"}`);
      if (extraReqs.length > 0) remarksParts.push(extraReqs.join("; "));
      const remarks = remarksParts.join("; ") || null;

      const payload = {
        applicantName: form.applicantName,
        expectedCompletionDate: form.expectedCompletionDate || null,
        hospital: form.hospital, rank: form.rank, department: form.department,
        telephone: form.telephone || null, email: form.email || null,
        contact, category: form.purposeCategory, purpose: fullPurpose,
        requiredService: form.serviceRequirement || null,
        serviceRequirements,
        requiresSterilization: form.sterilization || null,
        quantity: form.printingService ? form.printingQuantity : 1,
        modelMaterial: fullModelMaterial,
        colourRequirement: form.colourRequirement ? (form.colourRequirementSpec || "Yes") : null,
        copyrightRisk: form.copyrightRisk === "Yes",
        copyrightDetails: form.copyrightRisk === "Yes" ? form.copyrightDetails : null,
        isReprint: form.isReprint === "Yes",
        fundingSource: form.isReprint === "Yes" ? form.fundingSource : null,
        signature: form.signature || null,
        signatureDate: form.signatureDate || null,
        remarks: remarks || null,
      };

      const res = await fetch("/api/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.success) { setSubmitted(json.data.caseNumber); toast.success("Submitted!"); }
      else toast.error(json.error || "Failed");
    } catch (e) { console.error(e); toast.error("Failed"); }
    finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <Card className="border-0 shadow-sm"><CardContent className="p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 mx-auto mb-5"><CheckCircle2 className="h-8 w-8 text-emerald-600" /></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Application Submitted</h2>
        <p className="text-slate-500">Your application has been received.</p>
        <p className="text-lg font-bold text-primary mt-4">Case Number: {submitted}</p>
        <p className="text-sm text-slate-400 mt-4">Please save this number. The 3D Printing Office will contact you.</p>
        <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>Submit Another</Button>
      </CardContent></Card>
    );
  }

  const sectionTitle = (t: string) => <h3 className="text-sm font-bold text-slate-800">{t}</h3>;
  const fieldLabel = (t: string, req?: boolean) => <Label className="text-sm font-medium">{t}{req ? " *" : ""}</Label>;
  const purposeOptions = form.purposeCategory ? (optionsMap[`purpose_${form.purposeCategory}`] || PURPOSES[form.purposeCategory] || []) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">QEH 3D Printing Office</p>
        <h2 className="text-2xl font-bold text-slate-900">3D Printing Service Application Form</h2>
        <p className="text-xs text-slate-400 mt-1">(The application form should be submitted <strong>at least 1 month</strong> before the expected completion date.)</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ===== PART I: APPLICANT INFO ===== */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Part I — For Applicant Use</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                {fieldLabel("Applicant", true)}
                <Input value={form.applicantName} onChange={(e) => update("applicantName", e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                {fieldLabel("Expected Completion Date")}
                <Input type="date" value={form.expectedCompletionDate} onChange={(e) => update("expectedCompletionDate", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                {fieldLabel("Hospital")}
                <ComboBox value={form.hospital} onChange={(v) => update("hospital", v)} options={optionsMap["hospital"] || BASE_OPTIONS["hospital"]} placeholder="Select hospital" settingsType="hospital" />
              </div>
              <div className="space-y-1.5">
                {fieldLabel("Rank / Department")}
                <div className="flex gap-2">
                  <ComboBox value={form.rank} onChange={(v) => update("rank", v)} options={optionsMap["rank"] || BASE_OPTIONS["rank"]} placeholder="Rank" settingsType="rank" className="flex-1" />
                  <ComboBox value={form.department} onChange={(v) => update("department", v)} options={optionsMap["department"] || BASE_OPTIONS["department"]} placeholder="Department" settingsType="department" className="flex-1" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                {fieldLabel("Telephone")}
                <Input value={form.telephone} onChange={(e) => update("telephone", e.target.value)} placeholder="Contact number" />
              </div>
              <div className="space-y-1.5">
                {fieldLabel("Email")}
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="Email address" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== PURPOSE(S) ===== */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Purpose(s) of Using 3D Printed Model</CardTitle>
            <p className="text-xs text-slate-400">Please choose only one category</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category buttons */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat} type="button"
                  onClick={() => { update("purposeCategory", cat); update("purposeCheckboxes", {}); update("purposeOthers", ""); }}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border-2 transition-all ${form.purposeCategory === cat ? "border-blue-500 bg-accent text-primary" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Checkboxes for selected category */}
            {form.purposeCategory && (
              <div className="space-y-2 pl-2 border-l-2 border-blue-100">
                {purposeOptions.map((opt, idx) => {
                  const key = `${form.purposeCategory}-${opt}-${idx}`;
                  return (
                    <div key={key}>
                      <label className="flex items-center gap-3 cursor-pointer py-1">
                        <Checkbox
                          checked={form.purposeCheckboxes[opt] || false}
                          onCheckedChange={(checked) => {
                            const v = typeof checked === "boolean" ? checked : false;
                            update("purposeCheckboxes", { ...form.purposeCheckboxes, [opt]: v });
                            if (!v && opt === "Others") update("purposeOthers", "");
                          }}
                        />
                        <span className="text-sm text-slate-700">{opt}</span>
                      </label>
                      {opt === "Others" && form.purposeCheckboxes["Others"] && (
                        <div className="ml-7 mt-1">
                          <Input value={form.purposeOthers} onChange={(e) => update("purposeOthers", e.target.value)} placeholder="Please specify" className="max-w-sm" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Reprint (only for Training/Education) */}
            {form.purposeCategory === "Training/ Education" && (
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <p className="text-sm font-medium text-slate-700">Is it a <strong>reprint model</strong> for training / education / research use?</p>
                <div className="flex gap-6">
                  {REPRINT_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="isReprint" value={opt} checked={form.isReprint === opt} onChange={(e) => update("isReprint", e.target.value)} className="text-primary" />
                      <span className="text-sm text-slate-700">{opt}</span>
                    </label>
                  ))}
                </div>
                {form.isReprint === "Yes" && (
                  <div className="ml-2 space-y-1.5">
                    <Label className="text-xs text-slate-500">Please specify the funding source</Label>
                    <Input value={form.fundingSource} onChange={(e) => update("fundingSource", e.target.value)} placeholder="Funding source" className="max-w-sm" />
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
              <strong>Remark:</strong> The first print is free, but fees for subsequent identical models <strong>will not</strong> be covered by 3D Printing Office.
            </p>
          </CardContent>
        </Card>

        {/* ===== SERVICE & PRINTING REQUIREMENTS ===== */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Service &amp; Printing Requirements</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {/* Service Requirement */}
            <div className="space-y-1.5 max-w-sm">
              <Label className="text-sm font-bold">Service Requirement:</Label>
              <ComboBox value={form.serviceRequirement} onChange={(v) => update("serviceRequirement", v)}
                options={optionsMap["service_option"] || BASE_OPTIONS["service_option"]}
                placeholder="Select service" settingsType="service_option" />
            </div>

            {/* Printing Requirement */}
            <div className="space-y-3">
              <Label className="text-sm font-bold">Printing Requirement:</Label>

              <div className="space-y-2 pl-1">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={form.printingSegmentation} onCheckedChange={(v) => { update("printingSegmentation", v === true); if (!v) update("printingSegmentationROI", ""); }} />
                    <span className="text-sm text-slate-700">Segmentation</span>
                  </label>
                  {form.printingSegmentation && (
                    <div className="ml-7"><Input value={form.printingSegmentationROI} onChange={(e) => update("printingSegmentationROI", e.target.value)} placeholder="Region of interest" className="max-w-sm" /></div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={form.printingDesign} onCheckedChange={(v) => { update("printingDesign", v === true); if (!v) update("printingDesignRequirement", ""); }} />
                    <span className="text-sm text-slate-700">Device / Tools Design</span>
                  </label>
                  {form.printingDesign && (
                    <div className="ml-7"><Input value={form.printingDesignRequirement} onChange={(e) => update("printingDesignRequirement", e.target.value)} placeholder="Requirement" className="max-w-sm" /></div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={form.printingService} onCheckedChange={(v) => { update("printingService", v === true); if (!v) update("printingQuantity", 1); }} />
                    <span className="text-sm text-slate-700">Printing Service</span>
                  </label>
                  {form.printingService && (
                    <div className="ml-7 flex items-center gap-2">
                      <Label className="text-xs text-slate-500">Quantity Required:</Label>
                      <Input type="number" min={1} value={form.printingQuantity} onChange={(e) => update("printingQuantity", parseInt(e.target.value) || 1)} className="w-20" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={form.printingOthers} onCheckedChange={(v) => { update("printingOthers", v === true); if (!v) update("printingOthersSpec", ""); }} />
                    <span className="text-sm text-slate-700">Others</span>
                  </label>
                  {form.printingOthers && (
                    <div className="ml-7"><Input value={form.printingOthersSpec} onChange={(e) => update("printingOthersSpec", e.target.value)} placeholder="Please specify" className="max-w-sm" /></div>
                  )}
                </div>
              </div>
            </div>

            {/* Material */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-wrap gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.modelMaterialRigid} onCheckedChange={(v) => update("modelMaterialRigid", v === true)} />
                  <span className="text-sm text-slate-700">Rigid material</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.modelMaterialSoft} onCheckedChange={(v) => update("modelMaterialSoft", v === true)} />
                  <span className="text-sm text-slate-700">Soft material</span>
                </label>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <Label className="text-xs text-slate-500">Please specify (if necessary):</Label>
                <Input value={form.materialSpecify} onChange={(e) => update("materialSpecify", e.target.value)} placeholder="Material specification" />
              </div>
            </div>

            {/* Colour Requirement */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.colourRequirement} onCheckedChange={(v) => { update("colourRequirement", v === true); if (!v) update("colourRequirementSpec", ""); }} />
                <span className="text-sm font-medium text-slate-700">Colour Requirement</span>
              </label>
              {form.colourRequirement && (
                <div className="ml-7"><Input value={form.colourRequirementSpec} onChange={(e) => update("colourRequirementSpec", e.target.value)} placeholder="Specify colour" className="max-w-sm" /></div>
              )}
            </div>

            {/* Sterilization */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.sterilization === "Yes"} onCheckedChange={(v) => update("sterilization", v ? "Yes" : "")} />
                <span className="text-sm font-medium text-slate-700">Sterilization</span>
              </label>
            </div>

            {/* Other Requirements */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <Checkbox checked={form.otherRequirements} onCheckedChange={(v) => { update("otherRequirements", v === true); if (!v) update("otherRequirementsSpec", ""); }} />
                <span className="text-sm font-medium text-slate-700">Others</span>
              </label>
              {form.otherRequirements && (
                <div className="ml-7"><Input value={form.otherRequirementsSpec} onChange={(e) => update("otherRequirementsSpec", e.target.value)} placeholder="Please specify" className="max-w-sm" /></div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ===== COPYRIGHT ===== */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3"><CardTitle className="text-base">Copyright</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-bold text-slate-700">Do you think the model has potential risk of copyright issue?</p>
            <div className="flex gap-8">
              {COPYRIGHT_RISK_OPTIONS.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="copyrightRisk" value={opt} checked={form.copyrightRisk === opt}
                    onChange={(e) => { update("copyrightRisk", e.target.value); if (e.target.value === "No") update("copyrightDetails", ""); }}
                    className="text-primary" />
                  <span className="text-sm font-medium text-slate-700">{opt}</span>
                </label>
              ))}
            </div>
            {form.copyrightRisk === "Yes" && (
              <div className="ml-2 space-y-1.5">
                <Label className="text-xs text-slate-500">Please specify:</Label>
                <Input value={form.copyrightDetails} onChange={(e) => update("copyrightDetails", e.target.value)} placeholder="Copyright details" className="max-w-sm" />
              </div>
            )}

            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-4 leading-relaxed">
              By signing the application form, the applicant consents to our use of model photos and information (excluding sensitive information) for publications and promotions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Signature of Applicant:</Label>
                <Input value={form.signature} onChange={(e) => update("signature", e.target.value)} placeholder="Type full name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-bold">Date:</Label>
                <Input type="date" value={form.signatureDate} onChange={(e) => update("signatureDate", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting} size="lg" className="bg-primary hover:bg-primary/90 px-12 text-base">
            {submitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}Submit Application
          </Button>
        </div>
      </form>

      <p className="text-center text-xs text-slate-400 pb-8">
        QEH 3D Printing Office — 3D Printing Service Application Form V5
      </p>
    </div>
  );
}
