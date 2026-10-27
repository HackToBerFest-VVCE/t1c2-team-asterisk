import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  FileText,
  HelpCircle,
  CheckSquare,
  List,
  Upload,
  AlertTriangle,
  Clock,
  Phone,
  ExternalLink,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  FileCheck,
  Building,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import {
  submitCropLossReport,
  fetchCropLossReports,
  fetchInsuranceSchemes,
  checkInsuranceEligibility,
  fetchInsuranceChecklist,
  uploadCropLossAttachment
} from '../services/api';
import MasterReportLayout from './MasterReportLayout';

const KARNATAKA_DISTRICTS = [
  'Bagalkot', 'Ballari', 'Belagavi', 'Bengaluru Rural', 'Bengaluru Urban',
  'Bidar', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chitradurga',
  'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Hassan',
  'Haveri', 'Kalaburagi', 'Kodagu', 'Kolar', 'Koppal',
  'Mandya', 'Mysuru', 'Raichur', 'Ramanagara', 'Shivamogga',
  'Tumakuru', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Yadgir'
];

const DAMAGE_TYPES = [
  { id: 'flood', en: 'Inundation / Flood', kn: 'ಪ್ರವಾಹ / ಮುಳುಗಡೆ' },
  { id: 'excess_rainfall', en: 'Excess Rainfall / Waterlogging', kn: 'ಅಧಿಕ ಮಳೆ / ಜಲಾವೃತ' },
  { id: 'drought', en: 'Drought / Dry Spell', kn: 'ಬರಗಾಲ / ಒಣಹವೆ' },
  { id: 'pest_attack', en: 'Pest Attack / Infestation', kn: 'ಕೀಟಬಾಧೆ' },
  { id: 'disease', en: 'Crop Disease / Blight', kn: 'ಬೆಳೆ ರೋಗ' },
  { id: 'storm', en: 'Storm / High Winds', kn: 'ಬಿರುಗಾಳಿ' },
  { id: 'hailstorm', en: 'Hailstorm', kn: 'ಆಲಿಕಲ್ಲು ಮಳೆ' },
  { id: 'other', en: 'Other Unseasonal Weather', kn: 'ಇತರ ಅಕಾಲಿಕ ಹಾನಿ' }
];

const CROPS_LIST = [
  'Tomato', 'Onion', 'Potato', 'Ragi', 'Maize', 'Paddy', 'Chilli',
  'Cotton', 'Sugarcane', 'Groundnut', 'Ginger', 'Turmeric', 'Banana'
];

export default function CropLossInsuranceView({ lang = 'en', t, userInfo }) {
  const isKn = lang === 'kn';
  const [activeTab, setActiveTab] = useState('report'); // 'report' | 'schemes' | 'eligibility' | 'checklist' | 'my_reports'

  // Master Report Modal State
  const [activeReportDoc, setActiveReportDoc] = useState(null); // null | { docType, data }

  // -------------------------------------------------------------
  // TAB 1: FORM STATE & AUTOSAVE
  // -------------------------------------------------------------
  const [form, setForm] = useState(() => {
    try {
      const draft = localStorage.getItem('farmprice_loss_draft');
      if (draft) return JSON.parse(draft);
    } catch {}
    return {
      farmer_name: userInfo?.name || 'Chethan P',
      phone: userInfo?.phone || '9876543210',
      state: 'Karnataka',
      district: userInfo?.district || 'Hassan',
      taluk: 'Hassan Taluk',
      village: '',
      location: '',
      crop_name: 'Tomato',
      crop_variety: 'Hybrid Shivam',
      growing_season: 'Kharif',
      sowing_date: new Date(Date.now() - 45 * 86400000).toISOString().slice(0, 10),
      expected_harvest_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      land_area_affected: '2.5',
      area_unit: 'Acres',
      damage_noticed_date: new Date().toISOString().slice(0, 10),
      incident_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      damage_type: 'excess_rainfall',
      damage_description: '',
      estimated_loss_percentage: '65',
      photo_urls: [],
      document_urls: []
    };
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Autosave form changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('farmprice_loss_draft', JSON.stringify(form));
    } catch {}
  }, [form]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e, type = 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(isKn ? 'ಕಡತದ ಗಾತ್ರವು 5MB ಮೀರಬಾರದು.' : 'File size cannot exceed 5MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadCropLossAttachment(file);
      if (res?.file_url) {
        if (type === 'photo') {
          setForm(prev => ({ ...prev, photo_urls: [...prev.photo_urls, res.file_url] }));
        } else {
          setForm(prev => ({ ...prev, document_urls: [...prev.document_urls, res.file_url] }));
        }
      }
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.farmer_name || !form.phone || !form.crop_name || !form.damage_description) {
      alert(isKn ? 'ದಯವಿಟ್ಟು ಅಗತ್ಯವಿರುವ ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ.' : 'Please fill all mandatory fields.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        land_area_affected: parseFloat(form.land_area_affected) || 1.0,
        estimated_loss_percentage: form.estimated_loss_percentage ? parseFloat(form.estimated_loss_percentage) : null,
        preferred_language: lang
      };
      const res = await submitCropLossReport(payload);
      setSubmitSuccess(res.data);
      setShowReviewModal(false);
      localStorage.removeItem('farmprice_loss_draft');
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: GOVERNMENT SCHEMES DISCOVERY
  // -------------------------------------------------------------
  const [schemes, setSchemes] = useState([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);

  useEffect(() => {
    if (activeTab === 'schemes' && schemes.length === 0) {
      setLoadingSchemes(true);
      fetchInsuranceSchemes()
        .then(data => setSchemes(data))
        .catch(err => console.error(err))
        .finally(() => setLoadingSchemes(false));
    }
  }, [activeTab]);

  // -------------------------------------------------------------
  // TAB 3: ELIGIBILITY WIZARD
  // -------------------------------------------------------------
  const [eligForm, setEligForm] = useState({
    district: userInfo?.district || 'Hassan',
    crop_name: 'Tomato',
    season: 'Kharif',
    is_insured: true,
    incident_date: new Date(Date.now() - 48 * 3600000).toISOString().slice(0, 10),
    damage_type: 'excess_rainfall'
  });
  const [eligResult, setEligResult] = useState(null);
  const [checkingElig, setCheckingElig] = useState(false);

  const handleCheckEligibility = async () => {
    setCheckingElig(true);
    try {
      const res = await checkInsuranceEligibility(eligForm);
      setEligResult(res);
    } catch (err) {
      alert(err.message || 'Eligibility check failed');
    } finally {
      setCheckingElig(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 4: CHECKLIST & 8-STEP WORKFLOW
  // -------------------------------------------------------------
  const [checklist, setChecklist] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    if (activeTab === 'checklist' && checklist.length === 0) {
      fetchInsuranceChecklist('PMFBY', 'excess_rainfall')
        .then(data => setChecklist(Array.isArray(data) ? data : (data.documents || [])))
        .catch(err => console.error(err));
    }
  }, [activeTab]);

  const toggleCheckItem = (id) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // -------------------------------------------------------------
  // TAB 5: MY LOSS REPORTS
  // -------------------------------------------------------------
  const [myPhone, setMyPhone] = useState(userInfo?.phone || '9876543210');
  const [myReports, setMyReports] = useState([]);
  const [loadingMyReports, setLoadingMyReports] = useState(false);

  const loadMyReports = () => {
    if (!myPhone) return;
    setLoadingMyReports(true);
    fetchCropLossReports(myPhone)
      .then(res => setMyReports(res))
      .catch(err => console.error(err))
      .finally(() => setLoadingMyReports(false));
  };

  useEffect(() => {
    if (activeTab === 'my_reports') {
      loadMyReports();
    }
  }, [activeTab]);

  // -------------------------------------------------------------
  // RENDER REPORT MODAL (IF TRIGGERED)
  // -------------------------------------------------------------
  if (activeReportDoc) {
    if (activeReportDoc.docType === 'blank_crop_loss') {
      return (
        <MasterReportLayout
          docType="blank_crop_loss"
          lang={lang}
          title={isKn ? 'ಬೆಳೆ ಹಾನಿ ಮತ್ತು ಕೀಟಬಾಧೆ ವರದಿ ನಮೂನೆ (ಆಫ್‌ಲೈನ್ ಪ್ರತಿ)' : 'Crop Loss & Crop Disease Incident Reporting Form (Offline Copy)'}
          subtitle={isKn ? 'ಗ್ರಾಮ ಆಡಳಿತಾಧಿಕಾರಿ, RSK ಕೃಷಿ ಅಧಿಕಾರಿ ಮತ್ತು ವಿಮಾ ಸಮೀಕ್ಷಕರಿಗೆ ಸಲ್ಲಿಸಲು ಅಧಿಕೃತ ಮುದ್ರಣ ಪ್ರತಿ' : 'Standardized Physical Damage Log for Village Accountant, RSK Officer & Field Surveyors'}
          metadata={[
            { label: isKn ? 'ರಾಜ್ಯ / ಜಿಲ್ಲೆ' : 'State / District', value: 'Karnataka / Hassan', strong: true },
            { label: isKn ? 'ಪ್ರಾಧಿಕಾರ' : 'Authority', value: 'Department of Agriculture / RSK' },
            { label: isKn ? 'ನಮೂನೆ ಪರಿಷ್ಕರಣೆ' : 'Form Revision', value: '2026-V2.1' },
            { label: isKn ? 'ಸೂಚನಾ ಗಡುವು' : 'Intimation Deadline', value: '72 Hours Mandatory' }
          ]}
          onClose={() => setActiveReportDoc(null)}
          disclaimerText={isKn
            ? 'ಸೂಚನೆ: ಈ ಮುದ್ರಿತ ನಮೂನೆಯನ್ನು ಭರ್ತಿ ಮಾಡಿ ಗ್ರಾಮ ಪಂಚಾಯತಿ ಅಥವಾ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರದ (RSK) ಕೃಷಿ ಅಧಿಕಾರಿಗಳಿಗೆ ಹಾನಿ ಸಂಭವಿಸಿದ 72 ಗಂಟೆಗಳ ಒಳಗೆ ಸಲ್ಲಿಸಬೇಕು.'
            : 'Notice: This physical form must be submitted to the Raitha Samparka Kendra (RSK) or Village Accountant within 72 hours of damage with supporting Pahani and Aadhaar copy.'}
        >
          <div style={{ marginTop: 24, padding: '0 8px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1B4332', borderBottom: '2px solid #C6E9D0', paddingBottom: 6, marginBottom: 16 }}>
              {isKn ? 'ಭಾಗ ೧: ರೈತರ ವಿವರಗಳು (ರೈತರು ಭರ್ತಿ ಮಾಡುವುದು)' : 'Section 1: Farmer & Land Details (To be filled by Farmer)'}
            </h3>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ರೈತರ ಹೆಸರು:' : 'Farmer Full Name:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:' : 'Mobile Number:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಆಧಾರ್ ಸಂಖ್ಯೆ:' : 'Aadhaar Number:'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಗ್ರಾಮ / ತಾಲೂಕು:' : 'Village / Taluk:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಸರ್ವೆ ನಂಬರ್:' : 'Survey / Hissa No:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಒಟ್ಟು ವಿಸ್ತೀರ್ಣ (ಎಕರೆ):' : 'Total Area (Acres):'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1B4332', borderBottom: '2px solid #C6E9D0', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
              {isKn ? 'ಭಾಗ ೨: ಬೆಳೆ ಮತ್ತು ಹಾನಿ ವಿವರಗಳು' : 'Section 2: Crop & Damage Incident Assessment'}
            </h3>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಬೆಳೆ ಹೆಸರು / ತಳಿ:' : 'Crop Name / Variety:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಬಿತ್ತನೆ ದಿನಾಂಕ:' : 'Sowing Date:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಹಾನಿಗೊಳಗಾದ ಎಕರೆ:' : 'Affected Area (Acres):'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಹಾನಿ ಸಂಭವಿಸಿದ ದಿನ:' : 'Incident Date:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಹಾನಿಯ ವಿಧ:' : 'Damage Cause (Flood/Drought):'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಅಂದಾಜು ಹಾನಿ %:' : 'Estimated Loss %:'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <div className="offline-field-row" style={{ marginTop: 12 }}>
              <span className="offline-field-label">{isKn ? 'ಹಾನಿಯ ವಿವರಣೆ:' : 'Brief Description:'}</span>
              <div className="offline-dotted-line" />
            </div>
            <div className="offline-field-row" style={{ marginTop: 16 }}>
              <div className="offline-dotted-line" style={{ width: '100%' }} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1B4332', borderBottom: '2px solid #C6E9D0', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
              {isKn ? 'ಭಾಗ ೩: ಪರಿಶೀಲನೆ ಮತ್ತು ಅಧಿಕಾರಿ ದೃಢೀಕರಣ' : 'Section 3: Verification & Official Endorsement'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 36, paddingBottom: 24 }}>
              <div>
                <div style={{ height: 40, borderBottom: '1px dashed #4A5568' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2D3748', marginTop: 6, textAlign: 'center' }}>
                  {isKn ? 'ರೈತರ ಸಹಿ / ಹೆಬ್ಬೆರಳ ಗುರುತು' : 'Farmer Signature / Thumb Impression'}
                </div>
              </div>
              <div>
                <div style={{ height: 40, borderBottom: '1px dashed #4A5568' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2D3748', marginTop: 6, textAlign: 'center' }}>
                  {isKn ? 'ಕೃಷಿ ಅಧಿಕಾರಿ / RSK ಮುದ್ರೆ ಮತ್ತು ಸಹಿ' : 'Agricultural Officer / RSK Official Seal & Signature'}
                </div>
              </div>
            </div>
          </div>
        </MasterReportLayout>
      );
    }

    if (activeReportDoc.docType === 'crop_loss_report') {
      const rep = activeReportDoc.data;
      return (
        <MasterReportLayout
          docType="crop_loss"
          lang={lang}
          title={isKn ? 'ಬೆಳೆ ಹಾನಿ ಪ್ರಾಥಮಿಕ ದಾಖಲೆ ಮತ್ತು ಮೌಲ್ಯಮಾಪನ ವರದಿ' : 'Crop Loss & Damage Assessment Report'}
          subtitle={isKn ? `ವರದಿ ಸಂಖ್ಯೆ: ${rep.report_id} | ಅಧಿಕೃತ ವಿಮಾ ಪರಿಹಾರ ದಾಖಲೆ` : `Reference: ${rep.report_id} | Preliminary Agricultural Damage Record`}
          metadata={[
            { label: isKn ? 'ರೈತರ ಹೆಸರು' : 'Farmer Name', value: rep.farmer_name, strong: true },
            { label: isKn ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Phone', value: rep.phone },
            { label: isKn ? 'ಜಿಲ್ಲೆ / ತಾಲೂಕು' : 'District / Taluk', value: `${rep.district}, ${rep.taluk || ''}` },
            { label: isKn ? 'ಬೆಳೆ & ತಳಿ' : 'Crop & Variety', value: `${rep.crop_name} (${rep.crop_variety || 'Regular'})`, highlight: true },
            { label: isKn ? 'ಹಾನಿ ಸಂಭವಿಸಿದ ದಿನ' : 'Incident Date', value: rep.incident_date },
            { label: isKn ? 'ಹಾನಿಗೊಳಗಾದ ವಿಸ್ತೀರ್ಣ' : 'Affected Area', value: `${rep.land_area_affected} ${rep.area_unit}` },
            { label: isKn ? 'ಹಾನಿಯ ವಿಧ' : 'Damage Type', value: rep.damage_type },
            { label: isKn ? 'ಅಂದಾಜು ಹಾನಿ ಶೇಕಡಾ' : 'Estimated Loss', value: `${rep.estimated_loss_percentage || '—'}%`, strong: true }
          ]}
          highlightCards={[
            {
              title: isKn ? '72-ಗಂಟೆಗಳ ನಿಯಮ' : '72-Hour Rule Notice',
              desc: isKn ? 'ಹಾನಿ ಸಂಭವಿಸಿದ 72 ಗಂಟೆಗಳ ಒಳಗೆ PMFBY ಆ್ಯಪ್ ಅಥವಾ 14447 ಸಹಾಯವಾಣಿಗೆ ತಿಳಿಸುವುದು ಕಡ್ಡಾಯವಾಗಿದೆ.' : 'Official intimation must be submitted to PMFBY within 72 hours of damage occurrence.',
              icon: 'clock'
            },
            {
              title: isKn ? 'ಅಗತ್ಯ ದಾಖಲೆಗಳು' : 'Mandatory Documents',
              desc: isKn ? 'ಪಹಣಿ (RTC), ಆಧಾರ್ ಕಾರ್ಡ್, ಬಿತ್ತನೆ ದೃಢೀಕರಣ ಪತ್ರ ಮತ್ತು ಬ್ಯಾಂಕ್ ಪಾಸ್‌ಬುಕ್ ಪ್ರತಿ ತಯಾರಾಗಿರಬೇಕು.' : 'Ensure land RTC (Pahani), Aadhaar, sowing certificate and bank passbook are ready for survey.',
              icon: 'shield'
            },
            {
              title: isKn ? 'ಜಂಟಿ ಸಮೀಕ್ಷೆ' : 'Joint Survey Inspection',
              desc: isKn ? 'ಕೃಷಿ ಇಲಾಖೆ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ವಿಮಾ ಕಂಪನಿ ಪ್ರತಿನಿಧಿಗಳು ಜಂಟಿಯಾಗಿ ಸ್ಥಳ ಪರಿಶೀಲನೆ ನಡೆಸುತ್ತಾರೆ.' : 'Agriculture Dept official and insurance surveyor will conduct mandatory joint field inspection.',
              icon: 'building'
            }
          ]}
          onClose={() => setActiveReportDoc(null)}
        >
          <div style={{ marginTop: 20 }}>
            <div className="report-section-header">
              <div className="section-title-wrap">
                <FileText size={18} color="#15803D" />
                <h2>{isKn ? 'ಹಾನಿಯ ವಿವರಣೆ ಮತ್ತು ರೈತರ ಹೇಳಿಕೆ' : 'Damage Description & Statement'}</h2>
              </div>
            </div>
            <div style={{ background: '#F8FAF9', border: '1px solid #E2E8F0', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: '#2D3748', marginTop: 8 }}>
              {rep.damage_description}
            </div>
          </div>
        </MasterReportLayout>
      );
    }
  }

  return (
    <div className="dashboard-content" style={{ maxWidth: 1240, margin: '0 auto', padding: '1.25rem 1rem' }}>
      
      {/* 1. Hero Header Banner matching Reference Image 3 */}
      <div className="fp-hero-banner">
        <div className="fp-hero-left">
          <div className="fp-hero-icon-box">
            <ShieldAlert size={26} />
          </div>
          <div>
            <h1 className="fp-hero-title">
              {isKn ? 'ಬೆಳೆ ಹಾನಿ ಮತ್ತು ಸರ್ಕಾರಿ ವಿಮಾ ಮಾರ್ಗದರ್ಶನ' : 'Crop Loss, Disease & Government Insurance Guidance'}
            </h1>
            <p className="fp-hero-subtitle">
              {isKn
                ? 'ಬೆಳೆ ಹಾನಿ ವರದಿ ಸಲ್ಲಿಸಿ, ಅಧಿಕೃತ ಸರ್ಕಾರಿ ವಿಮೆ (PMFBY, ಸಂರಕ್ಷಣೆ) ವಿವರಗಳನ್ನು ಪಡೆಯಿರಿ ಮತ್ತು 72-ಗಂಟೆಗಳ ನಿಯಮ ಪರಿಶೀಲಿಸಿ.'
                : 'Log crop damage, verify eligibility against official schemes (PMFBY, Samrakshane), and track preparation.'}
            </p>
          </div>
        </div>

        {/* Agricultural Landscape Watermark Illustration matching Reference Image 3 */}
        <div className="fp-hero-illustration">
          <svg viewBox="0 0 340 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
            <path d="M120 120 C 180 80, 240 100, 340 70 L 340 120 Z" fill="#DCFCE7" fillOpacity="0.45" />
            <path d="M0 120 C 100 90, 220 110, 340 95 L 340 120 Z" fill="#BBF7D0" fillOpacity="0.35" />
            <path d="M220 95 L 245 78 L 270 95 L 270 120 L 220 120 Z" fill="#15803D" fillOpacity="0.12" />
            <path d="M245 78 L 295 86 L 295 120 L 270 120 L 270 95 Z" fill="#166534" fillOpacity="0.10" />
            <circle cx="175" cy="85" r="5" fill="#15803D" fillOpacity="0.18" />
            <path d="M172 90 L 178 90 L 180 115 L 170 115 Z" fill="#15803D" fillOpacity="0.18" />
            <path d="M305 105 Q 315 90 325 105" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.25" />
            <path d="M315 110 Q 325 95 335 110" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.25" />
          </svg>
        </div>
      </div>

      {/* 2. Underline Navigation Tabs matching Reference Image 3 */}
      <div className="fp-underline-tabs">
        <button
          className={`fp-tab-underline-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <FileText size={16} />
          <span>{isKn ? 'ಬೆಳೆ ಹಾನಿ ವರದಿ ಸಲ್ಲಿಸಿ' : 'Report Crop Loss'}</span>
        </button>

        <button
          className={`fp-tab-underline-btn ${activeTab === 'schemes' ? 'active' : ''}`}
          onClick={() => setActiveTab('schemes')}
        >
          <Building size={16} />
          <span>{isKn ? 'ಸರ್ಕಾರಿ ವಿಮಾ ಯೋಜನೆಗಳು' : 'Government Schemes'}</span>
        </button>

        <button
          className={`fp-tab-underline-btn ${activeTab === 'eligibility' ? 'active' : ''}`}
          onClick={() => setActiveTab('eligibility')}
        >
          <Clock size={16} />
          <span>{isKn ? 'ಅರ್ಹತಾ ಪರಿಶೀಲನೆ (72-ಗಂಟೆ)' : '72-Hour Eligibility Wizard'}</span>
        </button>

        <button
          className={`fp-tab-underline-btn ${activeTab === 'checklist' ? 'active' : ''}`}
          onClick={() => setActiveTab('checklist')}
        >
          <CheckSquare size={16} />
          <span>{isKn ? 'ದಾಖಲೆಗಳ ಪಟ್ಟಿ & ಹಂತಗಳು' : 'Claim Checklist & Steps'}</span>
        </button>

        <button
          className={`fp-tab-underline-btn ${activeTab === 'my_reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_reports')}
        >
          <List size={16} />
          <span>{isKn ? 'ನನ್ನ ಹಾನಿ ವರದಿಗಳು' : 'My Loss Reports'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: REPORT CROP LOSS FORM                              */}
      {/* ========================================================= */}
      {activeTab === 'report' && (
        <div className="fp-card-box">
          {submitSuccess ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DEF7EC', color: '#0E9F6E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826', margin: 0 }}>
                {isKn ? 'ಬೆಳೆ ಹಾನಿ ವರದಿ ಯಶಸ್ವಿಯಾಗಿ ದಾಖಲಾಗಿದೆ!' : 'Crop Loss Report Successfully Recorded!'}
              </h2>
              <div style={{ display: 'inline-block', background: '#F3F4F6', border: '1px solid #D1D5DB', padding: '6px 16px', borderRadius: 20, fontWeight: 800, fontSize: 16, color: '#1F2937', margin: '14px 0' }}>
                {isKn ? 'ದಾಖಲಾತಿ ಸಂಖ್ಯೆ:' : 'Reference ID:'} {submitSuccess.report_id}
              </div>
              <p style={{ maxWidth: 640, margin: '0 auto 20px auto', fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>
                {isKn
                  ? 'ನಿಮ್ಮ ಬೆಳೆ ಹಾನಿ ವಿವರಗಳನ್ನು ಸಿಸ್ಟಂನಲ್ಲಿ ದಾಖಲಿಸಲಾಗಿದೆ. ಅಧಿಕೃತ PMFBY ಪರಿಹಾರ ಪಡೆಯಲು 14447 ಸಹಾಯವಾಣಿ ಅಥವಾ ಸ್ಥಳೀಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ (RSK) ತಕ್ಷಣ ಈ ವಿವರಗಳನ್ನು ಸಲ್ಲಿಸಿ.'
                  : 'Your crop loss incident is recorded. To lodge your formal government insurance claim, intimate PMFBY within 72 hours via the Crop Insurance App, helpline 14447, or visit your nearest Raitha Samparka Kendra.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="fp-btn-primary"
                  onClick={() => setActiveReportDoc({ docType: 'crop_loss_report', data: submitSuccess })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <FileText size={16} />
                  <span>{isKn ? 'ಅಧಿಕೃತ ಬೆಳೆ ಹಾನಿ ವರದಿ ಡೌನ್‌ಲೋಡ್' : 'Download Loss Assessment Report'}</span>
                </button>

                <button
                  className="fp-btn-secondary"
                  onClick={() => setActiveReportDoc({ docType: 'blank_crop_loss', data: null })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <Download size={16} />
                  <span>{isKn ? 'ಆಫ್‌ಲೈನ್ ಅರ್ಜಿ ನಮೂನೆ (ಮುದ್ರಣ)' : 'Download Blank Physical Form'}</span>
                </button>

                <button
                  className="fp-btn-secondary"
                  onClick={() => { setSubmitSuccess(null); setActiveTab('my_reports'); }}
                >
                  {isKn ? 'ವರದಿಗಳ ಪಟ್ಟಿಗೆ ಹೋಗಿ' : 'Go to My Reports'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Card Header matching Reference Image 3 */}
              <div className="fp-card-header">
                <div className="fp-card-title-group">
                  <div className="fp-card-icon-badge">
                    <span style={{ fontSize: 16 }}>🌱</span>
                  </div>
                  <div>
                    <h2 className="fp-card-title">
                      {isKn ? 'ಹೊಸ ಬೆಳೆ ಹಾನಿ ಅಥವಾ ರೋಗ ವರದಿ ದಾಖಲಿಸಿ' : 'Lodge New Crop Loss / Disease Incident'}
                    </h2>
                    <div className="fp-card-subtitle">
                      {isKn ? 'ಭರ್ತಿ ಮಾಡಿದ ವಿವರಗಳು ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಡ್ರಾಫ್ಟ್ ಆಗಿ ಉಳಿಯುತ್ತವೆ.' : 'Draft is automatically autosaved as you type.'}
                    </div>
                  </div>
                </div>

                <button
                  className="fp-btn-secondary"
                  onClick={() => setActiveReportDoc({ docType: 'blank_crop_loss', data: null })}
                  style={{ fontSize: 12.5, padding: '7px 14px' }}
                >
                  <Download size={14} />
                  <span>{isKn ? 'ಖಾಲಿ ಅರ್ಜಿ ಡೌನ್‌ಲೋಡ್' : 'Download Blank Physical Form'}</span>
                </button>
              </div>

              {/* 4-Column Form Grid matching Reference Image 3 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16 }}>
                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ರೈತರ ಪೂರ್ಣ ಹೆಸರು' : 'Farmer Full Name'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="text"
                    name="farmer_name"
                    value={form.farmer_name}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="Chethan Patel"
                    required
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? '೧೦-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : '10-Digit Mobile Number'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    maxLength={10}
                    placeholder="9876543210"
                    required
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಜಿಲ್ಲೆ' : 'District'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <select
                    name="district"
                    value={form.district}
                    onChange={handleFormChange}
                    className="fp-select-control"
                  >
                    {KARNATAKA_DISTRICTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ತಾಲೂಕು / ಹೋಬಳಿ' : 'Taluk / Hobli'}</span>
                  </label>
                  <input
                    type="text"
                    name="taluk"
                    value={form.taluk}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="Hassan Taluk"
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಗ್ರಾಮ / ತೋಟದ ವಿಳಾಸ' : 'Village / Farm Address'}</span>
                  </label>
                  <input
                    type="text"
                    name="village"
                    value={form.village}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="e.g. Alur Hobli, Survey 14/2"
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಹಾನಿಗೊಳಗಾದ ಬೆಳೆ' : 'Affected Crop'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <select
                    name="crop_name"
                    value={form.crop_name}
                    onChange={handleFormChange}
                    className="fp-select-control"
                  >
                    {CROPS_LIST.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಬೆಳೆ ತಳಿ' : 'Crop Variety'}</span>
                  </label>
                  <input
                    type="text"
                    name="crop_variety"
                    value={form.crop_variety}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="Hybrid Shivam"
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಬೆಳೆಯ ಋತು' : 'Growing Season'}</span>
                  </label>
                  <select
                    name="growing_season"
                    value={form.growing_season}
                    onChange={handleFormChange}
                    className="fp-select-control"
                  >
                    <option value="Kharif">{isKn ? 'ಖರೀಫ್ (ಮಳೆಗಾಲ)' : 'Kharif (Monsoon)'}</option>
                    <option value="Rabi">{isKn ? 'ರಬಿ (ಚಳಿಗಾಲ)' : 'Rabi (Winter)'}</option>
                    <option value="Summer">{isKn ? 'ಬೇಸಿಗೆ (Summer)' : 'Summer (Zaid)'}</option>
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಹಾನಿಗೊಳಗಾದ ವಿಸ್ತೀರ್ಣ (ಎಕರೆ)' : 'Affected Land Area (Acres)'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="land_area_affected"
                    value={form.land_area_affected}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="2.5"
                    required
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಘಟನೆಯ ದಿನಾಂಕ' : 'Incident Date'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <input
                    type="date"
                    name="incident_date"
                    value={form.incident_date}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    required
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಹಾನಿಯ ಕಾರಣ' : 'Damage Cause'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <select
                    name="damage_type"
                    value={form.damage_type}
                    onChange={handleFormChange}
                    className="fp-select-control"
                  >
                    {DAMAGE_TYPES.map(d => (
                      <option key={d.id} value={d.id}>{isKn ? d.kn : d.en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">
                    <span>{isKn ? 'ಅಂದಾಜು ಹಾನಿ %' : 'Estimated Loss %'}</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    name="estimated_loss_percentage"
                    value={form.estimated_loss_percentage}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="65"
                  />
                </div>
              </div>

              {/* Full Width Detailed Description */}
              <div style={{ marginTop: 16 }}>
                <label className="fp-field-label">
                  <span>{isKn ? 'ಹಾನಿಯ ಸವಿಸ್ತಾರ ವಿವರಣೆ' : 'Detailed Damage Description'}</span>
                  <span className="required-star">*</span>
                </label>
                <textarea
                  name="damage_description"
                  value={form.damage_description}
                  onChange={handleFormChange}
                  className="fp-textarea-control"
                  rows={4}
                  placeholder={isKn ? 'ಹಾನಿಯ ಲಕ್ಷಣಗಳು, ಹವಾಮಾನ ಘಟನೆ ಮತ್ತು ಬೆಳೆಗೆ ಆದ ಹಾನಿಯ ವಿವರ ಬರೆಯಿರಿ...' : 'Describe symptoms, unseasonal weather event, visual appearance of blight/waterlogging, and standing crop condition...'}
                  required
                />
              </div>

              {/* File Upload Dropzone matching Reference Image 3 */}
              <div className="fp-upload-dropzone">
                <div className="fp-upload-left">
                  <div className="fp-upload-icon-circle">
                    <Upload size={18} />
                  </div>
                  <div>
                    <div className="fp-upload-title">
                      {isKn ? 'ಬೆಳೆ ಫೋಟೋಗಳು ಅಥವಾ ಪಹಣಿ (RTC) ಲಗತ್ತಿಸಿ (ಗರಿಷ್ಠ 5MB)' : 'Attach Crop Damage Photos or Land Record (Max 5MB)'}
                    </div>
                    <div className="fp-upload-subtitle">
                      {isKn ? 'ಬೆಂಬಲಿತ ಮಾದರಿಗಳು: JPG, PNG, WEBP, PDF' : 'Supported formats: JPG, PNG, WEBP, PDF'}
                    </div>
                  </div>
                </div>

                <label className="fp-upload-btn">
                  <Upload size={14} />
                  <span>{uploading ? (isKn ? 'ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Uploading...') : (isKn ? 'ಫೈಲ್‌ಗಳನ್ನು ಆಯ್ಕೆಮಾಡಿ' : 'Choose Files')}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => handleFileUpload(e, 'photo')}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
              </div>

              {form.photo_urls.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  {form.photo_urls.map((url, i) => (
                    <div key={i} style={{ padding: '4px 12px', background: '#DEF7EC', color: '#03543F', borderRadius: 16, fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileCheck size={14} />
                      <span>Damage Photo #{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom Action Bar matching Reference Image 3 */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 22 }}>
                <button
                  type="button"
                  className="fp-btn-secondary"
                  onClick={() => setShowReviewModal(true)}
                  disabled={submitting}
                >
                  <Eye size={15} />
                  <span>{isKn ? 'ವಿವರ ಪರಿಶೀಲಿಸಿ' : 'Review Summary'}</span>
                </button>

                <button
                  type="button"
                  className="fp-btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  <span style={{ fontSize: 15 }}>✈</span>
                  <span>{submitting ? (isKn ? 'ದಾಖಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : (isKn ? 'ಹಾನಿ ವರದಿ ಸಲ್ಲಿಸಿ' : 'Submit Loss Report')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: GOVERNMENT SCHEMES DISCOVERY                       */}
      {/* ========================================================= */}
      {activeTab === 'schemes' && (
        <div>
          {loadingSchemes ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              <RefreshCw size={24} className="spin-icon" style={{ marginBottom: 10 }} />
              <div>{isKn ? 'ಸರ್ಕಾರಿ ವಿಮಾ ಯೋಜನೆಗಳ ವಿವರ ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Loading verified government insurance schemes...'}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
              {schemes.map(sch => (
                <div key={sch.scheme_id} style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', background: '#ECFDF5', padding: '2px 8px', borderRadius: 10 }}>
                        {sch.state_specific ? 'Karnataka State Portal' : 'National Scheme'}
                      </span>
                      <h3 style={{ fontSize: 17, fontWeight: 800, color: '#113826', margin: '6px 0 2px 0' }}>
                        {isKn ? (sch.scheme_name_kn || sch.scheme_name) : sch.scheme_name}
                      </h3>
                      <div style={{ fontSize: 12, color: '#4B5563' }}>{sch.authority}</div>
                    </div>
                  </div>

                  <p style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5, flex: 1, margin: '8px 0 14px 0' }}>
                    {isKn ? (sch.description_kn || sch.description_en) : sch.description_en}
                  </p>

                  <div style={{ background: '#F8FAF9', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#6B7280' }}>{isKn ? 'ರೈತರ ಪ್ರೀಮಿಯಂ:' : 'Farmer Premium:'}</span>
                      <span style={{ fontWeight: 700, color: '#111827' }}>
                        {sch.premium_rate_kharif}% (Kharif) / {sch.premium_rate_rabi}% (Rabi)
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#6B7280' }}>{isKn ? 'ಹಾನಿ ಸೂಚನೆ ಗಡುವು:' : 'Claim Deadline:'}</span>
                      <span style={{ fontWeight: 700, color: '#DC2626' }}>
                        {sch.claim_intimation_deadline_hours} Hours Mandatory
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6B7280' }}>{isKn ? 'ಅಧಿಕೃತ ಸಹಾಯವಾಣಿ:' : 'Helpline:'}</span>
                      <span style={{ fontWeight: 700, color: '#059669' }}>
                        {sch.official_helpline}
                      </span>
                    </div>
                  </div>

                  <a
                    href={sch.official_portal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary"
                    style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <span>{isKn ? 'ಅಧಿಕೃತ ಪೋರ್ಟಲ್‌ಗೆ ಭೇಟಿ ನೀಡಿ' : 'Visit Official Government Portal'}</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: 72-HOUR ELIGIBILITY WIZARD                         */}
      {/* ========================================================= */}
      {activeTab === 'eligibility' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* Form */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', marginBottom: 14 }}>
              {isKn ? 'ಪ್ರಾಥಮಿಕ ವಿಮಾ ಅರ್ಹತಾ ಪರಿಶೀಲನೆ' : 'Preliminary Claim Eligibility Check'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isKn ? 'ಜಿಲ್ಲೆ' : 'District'}</label>
                <select
                  value={eligForm.district}
                  onChange={(e) => setEligForm(prev => ({ ...prev, district: e.target.value }))}
                  className="form-input"
                  style={{ marginTop: 4 }}
                >
                  {KARNATAKA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isKn ? 'ಬೆಳೆ' : 'Crop'}</label>
                <select
                  value={eligForm.crop_name}
                  onChange={(e) => setEligForm(prev => ({ ...prev, crop_name: e.target.value }))}
                  className="form-input"
                  style={{ marginTop: 4 }}
                >
                  {CROPS_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isKn ? 'ಬೆಳೆ ವಿಮೆ ಪಾವತಿಸಲಾಗಿದೆಯೇ?' : 'Is Crop Enrolled in Insurance for Current Season?'}</label>
                <div style={{ display: 'flex', gap: 20, marginTop: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_insured"
                      checked={eligForm.is_insured === true}
                      onChange={() => setEligForm(prev => ({ ...prev, is_insured: true }))}
                    />
                    <span>{isKn ? 'ಹೌದು (Yes)' : 'Yes (Enrolled)'}</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="is_insured"
                      checked={eligForm.is_insured === false}
                      onChange={() => setEligForm(prev => ({ ...prev, is_insured: false }))}
                    />
                    <span>{isKn ? 'ಇಲ್ಲ (No)' : 'No'}</span>
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isKn ? 'ಹಾನಿ ಸಂಭವಿಸಿದ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ' : 'Incident Date'}</label>
                <input
                  type="date"
                  value={eligForm.incident_date}
                  onChange={(e) => setEligForm(prev => ({ ...prev, incident_date: e.target.value }))}
                  className="form-input"
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>{isKn ? 'ಹಾನಿಯ ವಿಧ' : 'Cause of Damage'}</label>
                <select
                  value={eligForm.damage_type}
                  onChange={(e) => setEligForm(prev => ({ ...prev, damage_type: e.target.value }))}
                  className="form-input"
                  style={{ marginTop: 4 }}
                >
                  {DAMAGE_TYPES.map(d => <option key={d.id} value={d.id}>{isKn ? d.kn : d.en}</option>)}
                </select>
              </div>

              <button
                className="btn-primary"
                onClick={handleCheckEligibility}
                disabled={checkingElig}
                style={{ marginTop: 10 }}
              >
                {checkingElig ? (isKn ? 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Evaluating...') : (isKn ? 'ಅರ್ಹತೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ' : 'Evaluate 72-Hour Eligibility')}
              </button>
            </div>
          </div>

          {/* Results Box */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', marginBottom: 14 }}>
              {isKn ? 'ಮೌಲ್ಯಮಾಪನ ಫಲಿತಾಂಶ & ಮಾರ್ಗದರ್ಶನ' : 'Guidance & Next Actions'}
            </h3>

            {eligResult ? (
              <div>
                {/* 72h rule badge */}
                <div style={{
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: eligResult.within_72_hours ? '#DEF7EC' : '#FDE8E8',
                  color: eligResult.within_72_hours ? '#03543F' : '#9B1C1C'
                }}>
                  {eligResult.within_72_hours ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13 }}>
                      {eligResult.within_72_hours
                        ? (isKn ? '72-ಗಂಟೆಗಳ ನಿಯಮದ ವ್ಯಾಪ್ತಿಯಲ್ಲಿದೆ' : 'WITHIN 72-HOUR NOTIFICATION WINDOW')
                        : (isKn ? '72-ಗಂಟೆಗಳ ಕಾಲಾವಕಾಶ ಮೀರಿದೆ' : '72-HOUR WINDOW EXCEEDED')}
                    </div>
                    <div style={{ fontSize: 11.5, marginTop: 2 }}>
                      {eligResult.hours_elapsed !== null && `${eligResult.hours_elapsed} hours elapsed since incident date.`}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#374151', marginBottom: 16 }}>
                  {isKn ? eligResult.guidance_kn : eligResult.guidance_en}
                </div>

                <div style={{ background: '#F8FAF9', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', marginBottom: 6 }}>
                    {isKn ? 'ತಕ್ಷಣದ ಅಧಿಕೃತ ಕ್ರಮಗಳು:' : 'Official Recommended Actions:'}
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#374151' }}>
                    <li>{isKn ? '14447 ಸಹಾಯವಾಣಿಗೆ ಕರೆ ಮಾಡಿ ಹಾನಿ ವಿವರ ದಾಖಲಿಸಿ' : 'Call PMFBY National Helpline 14447'}</li>
                    <li>{isKn ? 'ಸ್ಥಳೀಯ ರೈತ ಸಂಪರ್ಕ ಕೇಂದ್ರಕ್ಕೆ (RSK) ಭೇಟಿ ನೀಡಿ' : 'Visit local Raitha Samparka Kendra (RSK)'}</li>
                    <li>{isKn ? 'ಬೆಳೆ ಹಾನಿಯ ಸ್ಪಷ್ಟ ಫೋಟೋಗಳನ್ನು ದಿನಾಂಕದೊಂದಿಗೆ ತೆಗೆಯಿರಿ' : 'Capture clear timestamped photographs of damaged field'}</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6B7280' }}>
                <Clock size={36} style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
                <p style={{ margin: 0, fontSize: 13 }}>
                  {isKn
                    ? 'ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ "ಅರ್ಹತೆ ಮೌಲ್ಯಮಾಪನ ಮಾಡಿ" ಕ್ಲಿಕ್ ಮಾಡಿ.'
                    : 'Fill the incident details and click Evaluate to see the 72-hour window status.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: CHECKLIST & 8-STEP WORKFLOW                        */}
      {/* ========================================================= */}
      {activeTab === 'checklist' && (
        <div>
          {/* Actions Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#1B4332', margin: 0 }}>
                {isKn ? 'ಅಗತ್ಯವಿರುವ ದಾಖಲೆಗಳ ಪಟ್ಟಿ ಮತ್ತು 8-ಹಂತದ ವಿಧಾನ' : 'Required Document Checklist & 8-Step Official Sequence'}
              </h3>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {isKn ? 'ವಿಮಾ ಸರ್ವೇಯರ್ ಬರುವ ಮುನ್ನ ಈ ಎಲ್ಲಾ ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧಪಡಿಸಿಕೊಳ್ಳಿ.' : 'Keep these documents ready for the joint agricultural surveyor inspection.'}
              </span>
            </div>
            <button
              className="btn-secondary"
              onClick={() => setActiveReportDoc({ docType: 'blank_crop_loss', data: null })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
            >
              <Download size={14} />
              <span>{isKn ? 'ಖಾಲಿ ಅರ್ಜಿ ಡೌನ್‌ಲೋಡ್' : 'Download Physical Blank Form'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
            {/* Checklist */}
            <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#166534', margin: '0 0 14px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                {isKn ? 'ಪರಿಶೀಲನಾ ಪಟ್ಟಿ (Checklist)' : 'Verified Document Inventory'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {checklist.map(item => (
                  <div
                    key={item.id}
                    onClick={() => toggleCheckItem(item.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: 10,
                      borderRadius: 8,
                      border: '1px solid #E2E8F0',
                      cursor: 'pointer',
                      background: checkedItems[item.id] ? '#F0FDF4' : '#FFFFFF',
                      transition: 'background 0.15s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[item.id]}
                      onChange={() => {}}
                      style={{ marginTop: 3, cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1F2937' }}>
                        {isKn ? item.name_kn : item.name_en}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                        {isKn ? item.description_kn : item.description_en}
                      </div>
                    </div>
                    {item.mandatory && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 6px', borderRadius: 4 }}>
                        {isKn ? 'ಕಡ್ಡಾಯ' : 'Mandatory'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 8-Step Workflow */}
            <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: '#166534', margin: '0 0 14px 0', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                {isKn ? 'ಅಧಿಕೃತ ಪರಿಹಾರ ಪ್ರಕ್ರಿಯೆಯ ೮ ಹಂತಗಳು' : '8-Step Official Claim Workflow'}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { step: 1, title_en: 'Incident Intimation within 72h', title_kn: '೭೨ ಗಂಟೆಗಳ ಒಳಗೆ ಹಾನಿ ಮಾಹಿತಿ ನೀಡುವುದು', desc_en: 'Call 14447 or intimate via Crop Insurance App.' },
                  { step: 2, title_en: 'Policy Acknowledgement Receipt', title_kn: 'ವಿಮಾ ಪಾಲಿಸಿ ರಸೀದಿ ಸಲ್ಲಿಕೆ', desc_en: 'Provide Samrakshane proposal or application number.' },
                  { step: 3, title_en: 'Joint Field Loss Assessment', title_kn: 'ಜಂಟಿ ಸ್ಥಳ ಪರಿಶೀಲನಾ ಸಮೀಕ್ಷೆ', desc_en: 'Agri Dept official + Insurer surveyor visit field.' },
                  { step: 4, title_en: 'Geotagged Damage Photographs', title_kn: 'ಸ್ಥಳೀಯ ಜಿಯೋಟ್ಯಾಗ್ ಫೋಟೋಗಳು', desc_en: 'Surveyor uploads timestamped field photos on portal.' },
                  { step: 5, title_en: 'Document & Pahani Verification', title_kn: 'ಪಹಣಿ & ಆಧಾರ್ ದಾಖಲೆ ಪರಿಶೀಲನೆ', desc_en: 'Verification against Bhoomi RTC land registry.' },
                  { step: 6, title_en: 'Loss Quantification Sign-off', title_kn: 'ಹಾನಿ ಪ್ರಮಾಣ ದೃಢೀಕರಣ ಸಹಿ', desc_en: 'Farmer and surveyor co-sign inspection report.' },
                  { step: 7, title_en: 'Insurer Claim Adjudication', title_kn: 'ವಿಮಾ ಕಂಪನಿಯಿಂದ ಅನುಮೋದನೆ', desc_en: 'Calculation of claim amount based on sum insured.' },
                  { step: 8, title_en: 'Direct Benefit Transfer (DBT)', title_kn: 'ನೇರ ಬ್ಯಾಂಕ್ ಖಾತೆಗೆ ಪರಿಹಾರ (DBT)', desc_en: 'Funds credited directly to Aadhaar-linked bank account.' }
                ].map(s => (
                  <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#166534', color: '#FFFFFF', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {s.step}
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#111827' }}>
                        {isKn ? s.title_kn : s.title_en}
                      </div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>
                        {s.desc_en}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MY LOSS REPORTS                                    */}
      {/* ========================================================= */}
      {activeTab === 'my_reports' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', margin: 0 }}>
                {isKn ? 'ನನ್ನ ಬೆಳೆ ಹಾನಿ ವರದಿಗಳು' : 'My Submitted Loss Reports'}
              </h3>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {isKn ? 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ ಸಂಬಂಧಿಸಿದ ಎಲ್ಲಾ ದಾಖಲೆಗಳು.' : 'Track previously submitted reports and download official master templates.'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="tel"
                value={myPhone}
                onChange={(e) => setMyPhone(e.target.value)}
                className="form-input"
                style={{ width: 150 }}
                placeholder="Phone number"
              />
              <button className="btn-secondary" onClick={loadMyReports}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loadingMyReports ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
              <RefreshCw size={22} className="spin-icon" style={{ marginBottom: 8 }} />
              <div>Loading reports...</div>
            </div>
          ) : myReports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              <FileText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>{isKn ? 'ಯಾವುದೇ ವರದಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No crop loss reports found for this phone number.'}</p>
            </div>
          ) : (
            <div className="report-table-container">
              <table className="report-comparison-table">
                <thead>
                  <tr>
                    <th>{isKn ? 'ದಾಖಲಾತಿ ಸಂಖ್ಯೆ' : 'Report ID'}</th>
                    <th>{isKn ? 'ದಿನಾಂಕ' : 'Date'}</th>
                    <th>{isKn ? 'ಬೆಳೆ' : 'Crop'}</th>
                    <th>{isKn ? 'ಜಿಲ್ಲೆ' : 'District'}</th>
                    <th>{isKn ? 'ಹಾನಿಯ ವಿಧ' : 'Damage Type'}</th>
                    <th>{isKn ? 'ವಿಸ್ತೀರ್ಣ' : 'Area'}</th>
                    <th>{isKn ? 'ಕ್ರಮ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {myReports.map((r, i) => (
                    <tr key={r.report_id || i}>
                      <td style={{ fontWeight: 700, color: '#166534' }}>{r.report_id}</td>
                      <td>{r.incident_date}</td>
                      <td>{r.crop_name}</td>
                      <td>{r.district}</td>
                      <td>{r.damage_type}</td>
                      <td>{r.land_area_affected} {r.area_unit}</td>
                      <td>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          onClick={() => setActiveReportDoc({ docType: 'crop_loss_report', data: r })}
                        >
                          <Eye size={12} />
                          <span>{isKn ? 'ವರದಿ ನೋಡಿ' : 'View Report'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Review Dialog Modal */}
      {showReviewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, maxWidth: 500, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', margin: '0 0 16px 0' }}>
              {isKn ? 'ವರದಿ ಪರಿಶೀಲನೆ & ದೃಢೀಕರಣ' : 'Review Crop Loss Incident Details'}
            </h3>
            
            <div style={{ background: '#F9FAFB', borderRadius: 8, padding: 14, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div><strong>{isKn ? 'ರೈತರ ಹೆಸರು:' : 'Farmer:'}</strong> {form.farmer_name}</div>
              <div><strong>{isKn ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ:' : 'Phone:'}</strong> {form.phone}</div>
              <div><strong>{isKn ? 'ಸ್ಥಳ:' : 'Location:'}</strong> {form.district}, {form.taluk || ''}</div>
              <div><strong>{isKn ? 'ಬೆಳೆ:' : 'Crop:'}</strong> {form.crop_name} ({form.growing_season})</div>
              <div><strong>{isKn ? 'ವಿಸ್ತೀರ್ಣ:' : 'Area:'}</strong> {form.land_area_affected} {form.area_unit}</div>
              <div><strong>{isKn ? 'ಹಾನಿ ದಿನಾಂಕ:' : 'Incident Date:'}</strong> {form.incident_date}</div>
              <div><strong>{isKn ? 'ಹಾನಿಯ ವಿಧ:' : 'Damage:'}</strong> {form.damage_type}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setShowReviewModal(false)}>
                {isKn ? 'ತಿದ್ದುಪಡಿ ಮಾಡಿ' : 'Edit'}
              </button>
              <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? (isKn ? 'ದಾಖಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : (isKn ? 'ಖಚಿತಪಡಿಸಿ ಸಲ್ಲಿಸಿ' : 'Confirm & Submit')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
