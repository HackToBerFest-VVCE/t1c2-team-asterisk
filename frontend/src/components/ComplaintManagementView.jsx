import React, { useState, useEffect } from 'react';
import {
  MessageSquareWarning,
  FileText,
  Search,
  List,
  ShieldAlert,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Upload,
  User,
  Phone,
  Building,
  RefreshCw,
  ExternalLink,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  FileCheck
} from 'lucide-react';
import {
  submitComplaint,
  trackComplaint,
  fetchMyComplaints,
  fetchAllComplaintsAdmin,
  updateComplaintStatus,
  fetchComplaintCategories,
  uploadComplaintAttachment
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

const MANDI_NAMES = [
  'Hassan APMC', 'Bangalore (Yeshwanthpur)', 'Mysuru (Bandipalya)', 'Kolar APMC',
  'Hubballi (Amaragol)', 'Belagavi APMC', 'Tumakuru APMC', 'Shivamogga APMC',
  'Chikkamagaluru APMC', 'Davanagere APMC', 'Ballari APMC', 'Kalaburagi APMC',
  'Mandya APMC', 'Raichur APMC', 'Udupi APMC', 'Chintamani APMC'
];

const COMPLAINT_CATEGORIES = [
  { id: 'price_manipulation', en: 'Price Manipulation / Cartelization', kn: 'ಬೆಲೆ ತಿದ್ದುಪಡಿ / ವರ್ತಕರ ಗುಂಪುಗಾರಿಕೆ' },
  { id: 'weighing_fraud', en: 'Faulty Weighing / Weight Deduction', kn: 'ತೂಕದಲ್ಲಿ ಮೋಸ / ಅಕ್ರಮ ಕಡಿತ' },
  { id: 'delay_in_payment', en: 'Delayed Payment / Non-Settlement', kn: 'ಹಣ ಪಾವತಿಯಲ್ಲಿ ವಿಳಂಬ' },
  { id: 'excess_commission', en: 'Excess Commission / Illegal Cess', kn: 'ಹೆಚ್ಚುವರಿ ಕಮಿಷನ್ / ಅಕ್ರಮ ದಲ್ಲಾಳಿ ಶುಲ್ಕ' },
  { id: 'trader_collusion', en: 'Trader Collusion / Auction Rigging', kn: 'ಹರಾಜು ಬಹಿಷ್ಕಾರ / ಒಪ್ಪಂದದ ವ್ಯಾಪಾರ' },
  { id: 'infrastructure', en: 'Market Infrastructure / Water / Shed', kn: 'ಮಾರುಕಟ್ಟೆ ಮೂಲಸೌಕರ್ಯ / ಶೆಡ್ ಸಮಸ್ಯೆ' },
  { id: 'other', en: 'Other Market Malpractice', kn: 'ಇತರ ಮಾರುಕಟ್ಟೆ ಅಕ್ರಮಗಳು' }
];

export default function ComplaintManagementView({ lang = 'en', t, userInfo, userRole = 'public' }) {
  const isKn = lang === 'kn';
  const isAdmin = userRole === 'admin';
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'track' | 'my_complaints' | 'admin' | 'forms'
  const [activeReportDoc, setActiveReportDoc] = useState(null);

  // -------------------------------------------------------------
  // TAB 1: REGISTRATION FORM
  // -------------------------------------------------------------
  const [form, setForm] = useState({
    category: 'weighing_fraud',
    subject: '',
    description: '',
    farmer_name: userInfo?.name || 'Chethan P',
    phone: userInfo?.phone || '9876543210',
    email: '',
    district: userInfo?.district || 'Hassan',
    mandi_name: 'Hassan APMC',
    crop_name: 'Tomato',
    incident_date: new Date().toISOString().slice(0, 10),
    attachments: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [registeredComplaint, setRegisteredComplaint] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert(isKn ? 'ಕಡತದ ಗಾತ್ರ 5MB ಮೀರಬಾರದು.' : 'File size cannot exceed 5MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadComplaintAttachment(file);
      if (res?.file_url) {
        setForm(prev => ({ ...prev, attachments: [...prev.attachments, res.file_url] }));
      }
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.farmer_name || !form.phone || !form.subject || !form.description) {
      alert(isKn ? 'ದಯವಿಟ್ಟು ಅಗತ್ಯವಿರುವ ಎಲ್ಲಾ ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ.' : 'Please fill all mandatory fields.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        preferred_language: lang
      };
      const res = await submitComplaint(payload);
      setRegisteredComplaint(res.data);
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2: TRACK COMPLAINT (WITH PRIVACY VERIFICATION)
  // -------------------------------------------------------------
  const [trackId, setTrackId] = useState('');
  const [trackPhone, setTrackPhone] = useState(userInfo?.phone || '9876543210');
  const [tracking, setTracking] = useState(false);
  const [trackedRecord, setTrackedRecord] = useState(null);
  const [trackError, setTrackError] = useState(null);

  const handleTrackComplaint = async (e) => {
    if (e) e.preventDefault();
    if (!trackId.trim()) return;
    setTracking(true);
    setTrackError(null);
    setTrackedRecord(null);

    try {
      const res = await trackComplaint(trackId.trim(), trackPhone.trim(), null, isAdmin);
      setTrackedRecord(res);
    } catch (err) {
      setTrackError(err.message || 'Unable to track complaint. Please verify reference number and mobile number.');
    } finally {
      setTracking(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: MY COMPLAINTS
  // -------------------------------------------------------------
  const [myPhone, setMyPhone] = useState(userInfo?.phone || '9876543210');
  const [myComplaints, setMyComplaints] = useState([]);
  const [loadingMy, setLoadingMy] = useState(false);

  const loadMyComplaints = () => {
    if (!myPhone) return;
    setLoadingMy(true);
    fetchMyComplaints(myPhone)
      .then(res => setMyComplaints(res))
      .catch(err => console.error(err))
      .finally(() => setLoadingMy(false));
  };

  useEffect(() => {
    if (activeTab === 'my_complaints') {
      loadMyComplaints();
    }
  }, [activeTab]);

  // -------------------------------------------------------------
  // TAB 4: STAFF / ADMIN DESK
  // -------------------------------------------------------------
  const [adminList, setAdminList] = useState([]);
  const [adminFilterStatus, setAdminFilterStatus] = useState('');
  const [adminSearch, setAdminSearch] = useState('');
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [selectedComplaintForAction, setSelectedComplaintForAction] = useState(null);
  const [updateStatusVal, setUpdateStatusVal] = useState('Under Review');
  const [updateNotesVal, setUpdateNotesVal] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadAdminComplaints = () => {
    setLoadingAdmin(true);
    fetchAllComplaintsAdmin(adminFilterStatus || null, null, adminSearch || null)
      .then(res => setAdminList(res))
      .catch(err => console.error(err))
      .finally(() => setLoadingAdmin(false));
  };

  useEffect(() => {
    if (activeTab === 'admin') {
      loadAdminComplaints();
    }
  }, [activeTab, adminFilterStatus]);

  const handleUpdateStatus = async () => {
    if (!selectedComplaintForAction) return;
    setUpdatingStatus(true);
    try {
      await updateComplaintStatus(selectedComplaintForAction.complaint_id, {
        status: updateStatusVal,
        actor_name: userInfo?.name || 'APMC Admin Desk',
        actor_role: 'admin',
        notes: updateNotesVal
      });
      alert(isKn ? 'ದೂರಿನ ಸ್ಥಿತಿ ಯಶಸ್ವಿಯಾಗಿ ನವೀಕರಿಸಲಾಗಿದೆ.' : 'Complaint status updated successfully.');
      setSelectedComplaintForAction(null);
      setUpdateNotesVal('');
      loadAdminComplaints();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Helper for Status Badge Class
  const getBadgeClass = (status) => {
    const s = (status || '').toLowerCase().replace(' ', '-');
    if (s === 'resolved') return 'badge-tag resolved';
    if (s === 'under-review') return 'badge-tag under-review';
    if (s === 'rejected') return 'badge-tag rejected';
    return 'badge-tag submitted';
  };

  // -------------------------------------------------------------
  // RENDER MASTER REPORT (OFFLINE BLANK FORM OR REPORT MODAL)
  // -------------------------------------------------------------
  if (activeReportDoc) {
    if (activeReportDoc.docType === 'blank_complaint') {
      return (
        <MasterReportLayout
          docType="blank_complaint"
          lang={lang}
          title={isKn ? 'ಅಧಿಕೃತ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ದೂರು ನೋಂದಣಿ ನಮೂನೆ (ಆಫ್‌ಲೈನ್ ಪ್ರತಿ)' : 'Official APMC Farmer Complaint Registration Form (Offline Copy)'}
          subtitle={isKn ? 'APMC ಕಾರ್ಯದರ್ಶಿ ಕಚೇರಿ ಮತ್ತು ಜಾಗೃತ ದಳಕ್ಕೆ ಸಲ್ಲಿಸಲು ಅಧಿಕೃತ ದೂರು ಪ್ರತಿ' : 'Physical Paper Form for APMC Secretary Office & Vigilance Cell Submission'}
          metadata={[
            { label: isKn ? 'ಪ್ರಾಧಿಕಾರ' : 'Authority', value: 'Karnataka State Agricultural Marketing Board (KSAMB)', strong: true },
            { label: isKn ? 'ಕಾಯ್ದೆ' : 'Applicable Act', value: 'Karnataka APMR Act 1966 & Rules' },
            { label: isKn ? 'ನಮೂನೆ ಪರಿಷ್ಕರಣೆ' : 'Form Revision', value: 'APMC-GR-2026' },
            { label: isKn ? 'ವಿಲೇವಾರಿ ಗಡುವು' : 'Redressal Target', value: '15 Working Days' }
          ]}
          onClose={() => setActiveReportDoc(null)}
          disclaimerText={isKn
            ? 'ಸೂಚನೆ: ಈ ಮುದ್ರಿತ ನಮೂನೆಯನ್ನು ಭರ್ತಿ ಮಾಡಿ ಸಂಬಂಧಪಟ್ಟ APMC ಕಾರ್ಯದರ್ಶಿ ಕಚೇರಿ ಅಥವಾ ಮಾರುಕಟ್ಟೆ ಜಾಗೃತ ದಳಕ್ಕೆ ಸ್ವೀಕೃತಿ ರಸೀದಿಯೊಂದಿಗೆ ಸಲ್ಲಿಸಬಹುದು.'
            : 'Notice: Fill and submit this physical form with transaction receipts to the APMC Secretary office. An acknowledgement receipt will be issued within 24 hours.'}
        >
          <div style={{ marginTop: 24, padding: '0 8px' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1B4332', borderBottom: '2px solid #C6E9D0', paddingBottom: 6, marginBottom: 16 }}>
              {isKn ? 'ಭಾಗ ೧: ದೂರುದಾರ ರೈತರ ವಿವರಗಳು' : 'Section 1: Complainant Farmer Details'}
            </h3>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ರೈತರ ಪೂರ್ಣ ಹೆಸರು:' : 'Farmer Full Name:'}</span>
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
                <span className="offline-field-label">{isKn ? 'ಜಿಲ್ಲೆ:' : 'District:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ವಿಳಾಸ / ಪಿನ್‌ಕೋಡ್:' : 'Address / Pincode:'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1B4332', borderBottom: '2px solid #C6E9D0', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
              {isKn ? 'ಭಾಗ ೨: ಮಾರುಕಟ್ಟೆ ವಹಿವಾಟು ಮತ್ತು ದೂರಿನ ವಿವರಗಳು' : 'Section 2: APMC Market Transaction & Grievance Details'}
            </h3>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'APMC ಮಂಡಿ ಹೆಸರು:' : 'APMC Mandi Name:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ವರ್ತಕ / ಕಮಿಷನ್ ಏಜೆಂಟ್ ಅಂಗಡಿ ನಂ:' : 'Trader / Shop No:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಘಟನೆಯ ದಿನಾಂಕ:' : 'Transaction Date:'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <div className="report-meta-grid-3col" style={{ marginBottom: 16 }}>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಬೆಳೆ / ಸರಕು:' : 'Commodity / Crop:'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಪ್ರಮಾಣ (ಕ್ವಿಂಟಾಲ್):' : 'Quantity (Quintals):'}</span>
                <div className="offline-dotted-line" />
              </div>
              <div className="offline-field-row">
                <span className="offline-field-label">{isKn ? 'ಹರಾಜು ದರ (ರೂ/ಕ್ವಿಂಟಾಲ್):' : 'Agreed Rate (Rs/q):'}</span>
                <div className="offline-dotted-line" />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1E3A2B', marginBottom: 8 }}>
                {isKn ? 'ದೂರಿನ ಪ್ರಕಾರ (ಸೂಕ್ತವಾದದ್ದನ್ನು ಗುರುತಿಸಿ):' : 'Grievance Classification (Check applicable):'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {COMPLAINT_CATEGORIES.map(c => (
                  <div key={c.id} className="offline-checkbox-item">
                    <div className="offline-box" />
                    <span>{isKn ? c.kn : c.en}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="offline-field-row" style={{ marginTop: 20 }}>
              <span className="offline-field-label">{isKn ? 'ದೂರಿನ ವಿವರವಾದ ಹೇಳಿಕೆ:' : 'Detailed Description of Dispute:'}</span>
              <div className="offline-dotted-line" />
            </div>
            <div className="offline-field-row" style={{ marginTop: 16 }}>
              <div className="offline-dotted-line" style={{ width: '100%' }} />
            </div>
            <div className="offline-field-row" style={{ marginTop: 16 }}>
              <div className="offline-dotted-line" style={{ width: '100%' }} />
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#1B4332', borderBottom: '2px solid #C6E9D0', paddingBottom: 6, marginBottom: 16, marginTop: 24 }}>
              {isKn ? 'ಭಾಗ ೩: ದೃಢೀಕರಣ ಮತ್ತು ಸ್ವೀಕೃತಿ' : 'Section 3: Signatures & Office Acknowledgement'}
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 36, paddingBottom: 24 }}>
              <div>
                <div style={{ height: 40, borderBottom: '1px dashed #4A5568' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2D3748', marginTop: 6, textAlign: 'center' }}>
                  {isKn ? 'ದೂರುದಾರ ರೈತರ ಸಹಿ' : 'Complainant Farmer Signature'}
                </div>
              </div>
              <div>
                <div style={{ height: 40, borderBottom: '1px dashed #4A5568' }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: '#2D3748', marginTop: 6, textAlign: 'center' }}>
                  {isKn ? 'APMC ಕಚೇರಿ ಸ್ವೀಕೃತಿ ಮುದ್ರೆ & ದಿನಾಂಕ' : 'APMC Receiving Officer Stamp & Date'}
                </div>
              </div>
            </div>
          </div>
        </MasterReportLayout>
      );
    }

    if (activeReportDoc.docType === 'complaint_report') {
      const c = activeReportDoc.data;
      return (
        <MasterReportLayout
          docType="complaint_status"
          lang={lang}
          title={isKn ? 'ಅಧಿಕೃತ APMC ದೂರು ಮತ್ತು ಸ್ಥಿತಿ ವರದಿ' : 'Official APMC Farmer Complaint Details & Status Report'}
          subtitle={isKn ? `ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ: ${c.complaint_id} | ಅಧಿಕೃತ ಪರಿಹಾರ ಪ್ರಕ್ರಿಯೆ ದಾಖಲೆ` : `Reference: ${c.complaint_id} | Grievance Audit & Resolution Record`}
          metadata={[
            { label: isKn ? 'ದೂರುದಾರರು' : 'Complainant', value: c.farmer_name, strong: true },
            { label: isKn ? 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Phone', value: c.phone },
            { label: isKn ? 'APMC ಮಾರುಕಟ್ಟೆ' : 'APMC Mandi', value: c.mandi_name || 'Hassan APMC', highlight: true },
            { label: isKn ? 'ಪ್ರಸ್ತುತ ಸ್ಥಿತಿ' : 'Status', value: c.status, strong: true },
            { label: isKn ? 'ದೂರಿನ ಪ್ರಕಾರ' : 'Category', value: c.category },
            { label: isKn ? 'ಘಟನೆಯ ದಿನಾಂಕ' : 'Incident Date', value: c.incident_date || '—' },
            { label: isKn ? 'ದಾಖಲಾದ ದಿನಾಂಕ' : 'Logged Date', value: c.created_at?.slice(0, 10) || '2026-10-27' }
          ]}
          onClose={() => setActiveReportDoc(null)}
        >
          <div style={{ marginTop: 20 }}>
            <div className="report-section-header">
              <div className="section-title-wrap">
                <FileText size={18} color="#15803D" />
                <h2>{isKn ? 'ದೂರಿನ ವಿಷಯ ಮತ್ತು ವಿವರಣೆ' : 'Subject & Complaint Statement'}</h2>
              </div>
            </div>
            <div style={{ background: '#F8FAF9', border: '1px solid #E2E8F0', padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, color: '#2D3748', marginTop: 8 }}>
              <div style={{ fontWeight: 800, color: '#1B4332', marginBottom: 6 }}>{c.subject}</div>
              <div>{c.description}</div>
            </div>

            {c.resolution_notes && (
              <div style={{ marginTop: 18 }}>
                <div className="report-section-header">
                  <div className="section-title-wrap">
                    <CheckCircle2 size={18} color="#15803D" />
                    <h2>{isKn ? 'ಅಧಿಕೃತ ಪರಿಹಾರ / ತನಿಖಾ ಟಿಪ್ಪಣಿ' : 'Official Resolution & Investigation Notes'}</h2>
                  </div>
                </div>
                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: 16, borderRadius: 8, fontSize: 13, color: '#14532D', marginTop: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>
                    {isKn ? 'ಪರಿಹರಿಸಿದವರು:' : 'Action Taken By:'} {c.resolved_by || 'APMC Admin Desk'} ({c.resolved_at?.slice(0, 10)})
                  </div>
                  <div>{c.resolution_notes}</div>
                </div>
              </div>
            )}
          </div>
        </MasterReportLayout>
      );
    }
  }

  return (
    <div className="dashboard-content" style={{ maxWidth: 1240, margin: '0 auto', padding: '1.25rem 1rem' }}>
      
      {/* 1. Hero Header Banner matching Reference Image 2 */}
      <div className="fp-hero-banner">
        <div className="fp-hero-left">
          <div className="fp-hero-icon-box">
            <FileText size={26} />
          </div>
          <div>
            <h1 className="fp-hero-title">
              {isKn ? 'APMC ಮತ್ತು ಮಾರುಕಟ್ಟೆ ದೂರು ನಿರ್ವಹಣೆ' : 'APMC & Market Complaints Management'}
            </h1>
            <p className="fp-hero-subtitle">
              {isKn
                ? 'ಮಾರುಕಟ್ಟೆ ಅಕ್ರಮಗಳು, ತೂಕದ ಮೋಸ, ಹಣ ಪಾವತಿ ವಿಳಂಬದ ಬಗ್ಗೆ ದೂರು ದಾಖಲಿಸಿ ಮತ್ತು ಅಧಿಕೃತ ಪರಿಹಾರ ಪ್ರಕ್ರಿಯೆ ಪರಿಶೀಲಿಸಿ.'
                : 'Submit grievances against APMC malpractices, track lifecycle status, and verify official audit history.'}
            </p>
          </div>
        </div>

        {/* Agricultural Landscape Watermark Illustration matching Reference Image 2 */}
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

      {/* 2. Underline Navigation Tabs matching Reference Image 2 */}
      <div className="fp-underline-tabs">
        <button
          className={`fp-tab-underline-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          <FileText size={16} />
          <span>{isKn ? 'ದೂರು ದಾಖಲಿಸಿ' : 'Register Complaint'}</span>
        </button>

        <button
          className={`fp-tab-underline-btn ${activeTab === 'track' ? 'active' : ''}`}
          onClick={() => setActiveTab('track')}
        >
          <Search size={16} />
          <span>{isKn ? 'ದೂರು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : 'Track Status'}</span>
        </button>

        <button
          className={`fp-tab-underline-btn ${activeTab === 'my_complaints' ? 'active' : ''}`}
          onClick={() => setActiveTab('my_complaints')}
        >
          <List size={16} />
          <span>{isKn ? 'ನನ್ನ ದೂರುಗಳು' : 'My Complaints'}</span>
        </button>

        {isAdmin && (
          <button
            className={`fp-tab-underline-btn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <ShieldAlert size={16} />
            <span>{isKn ? 'ಅಧಿಕಾರಿ ಡೆಸ್ಕ್ (Admin)' : 'Staff / Admin Desk'}</span>
          </button>
        )}

        <button
          className={`fp-tab-underline-btn ${activeTab === 'forms' ? 'active' : ''}`}
          onClick={() => setActiveTab('forms')}
        >
          <Download size={16} />
          <span>{isKn ? 'ಅರ್ಜಿ & ವರದಿ ಡೌನ್‌ಲೋಡ್' : 'Download Forms & Reports'}</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: REGISTER COMPLAINT                                 */}
      {/* ========================================================= */}
      {activeTab === 'register' && (
        <div className="fp-card-box">
          {registeredComplaint ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DEF7EC', color: '#0E9F6E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: '#113826', margin: 0 }}>
                {isKn ? 'ನಿಮ್ಮ ದೂರು ಯಶಸ್ವಿಯಾಗಿ ನೋಂದಣಿಯಾಗಿದೆ!' : 'Complaint Successfully Registered!'}
              </h2>
              <div style={{ display: 'inline-block', background: '#F3F4F6', border: '1px solid #D1D5DB', padding: '6px 16px', borderRadius: 20, fontWeight: 800, fontSize: 16, color: '#1F2937', margin: '14px 0' }}>
                {isKn ? 'ದೂರು ಸಂಖ್ಯೆ:' : 'Reference ID:'} {registeredComplaint.complaint_id}
              </div>
              <p style={{ maxWidth: 640, margin: '0 auto 20px auto', fontSize: 13, color: '#4B5563', lineHeight: 1.6 }}>
                {isKn
                  ? 'ನಿಮ್ಮ ದೂರನ್ನು ಕಾರ್ಯಾಚರಣೆಯ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ದಾಖಲಿಸಲಾಗಿದೆ. APMC ಕಾರ್ಯದರ್ಶಿ ಕಚೇರಿಯಿಂದ ಪರಿಶೀಲನೆ ನಡೆಸಲಾಗುತ್ತದೆ. ಈ ದೂರು ಸಂಖ್ಯೆ ಮತ್ತು ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ಬಳಸಿ ಸ್ಥಿತಿಯನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಬಹುದು.'
                  : 'Your grievance has been permanently logged in the operational database. You can track investigation milestones anytime using this reference number and your registered mobile number.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                <button
                  className="fp-btn-primary"
                  onClick={() => setActiveReportDoc({ docType: 'complaint_report', data: registeredComplaint })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <FileText size={16} />
                  <span>{isKn ? 'ದೂರು ವರದಿ ಡೌನ್‌ಲೋಡ್' : 'Download Complaint Report'}</span>
                </button>

                <button
                  className="fp-btn-secondary"
                  onClick={() => {
                    setTrackId(registeredComplaint.complaint_id);
                    setTrackPhone(registeredComplaint.phone);
                    setRegisteredComplaint(null);
                    setActiveTab('track');
                  }}
                >
                  {isKn ? 'ಸ್ಥಿತಿ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : 'Track This Complaint'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Card Header matching Reference Image 2 */}
              <div className="fp-card-header">
                <div className="fp-card-title-group">
                  <div className="fp-card-icon-badge">
                    <FileText size={18} />
                  </div>
                  <div>
                    <h2 className="fp-card-title">
                      {isKn ? 'ಹೊಸ ದೂರು ನೋಂದಾಯಿಸಿ' : 'Register New Grievance'}
                    </h2>
                    <div className="fp-card-subtitle">
                      {isKn ? 'ಪರಿಶೀಲಿಸಬಹುದಾದ ರೆಫರೆನ್ಸ್ ಟ್ರ್ಯಾಕಿಂಗ್‌ನೊಂದಿಗೆ APMC ಅಕ್ರಮಗಳಿಗೆ ಅಧಿಕೃತ ಪರಿಹಾರ.' : 'Official redressal for APMC malpractices with verifiable reference tracking.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="fp-btn-secondary"
                  onClick={() => setActiveReportDoc({ docType: 'blank_complaint', data: null })}
                  style={{ fontSize: 12.5, padding: '7px 14px' }}
                >
                  <Download size={14} />
                  <span>{isKn ? 'ಖಾಲಿ ಅರ್ಜಿ ಡೌನ್‌ಲೋಡ್' : 'Download Physical Blank Form'}</span>
                </button>
              </div>

              {/* 4-Column Form Grid matching Reference Image 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                <div>
                  <label className="fp-field-label">
                    <User size={13} color="#15803D" />
                    <span>{isKn ? 'ದೂರುದಾರರ ಪೂರ್ಣ ಹೆಸರು' : 'Complainant Full Name'}</span>
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
                    <Phone size={13} color="#15803D" />
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
                    <ShieldAlert size={13} color="#15803D" />
                    <span>{isKn ? 'ದೂರಿನ ಪ್ರಕಾರ' : 'Grievance Category'}</span>
                    <span className="required-star">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleFormChange}
                    className="fp-select-control"
                  >
                    {COMPLAINT_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{isKn ? c.kn : c.en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">
                    <Building size={13} color="#15803D" />
                    <span>{isKn ? 'ಸಂಬಂಧಪಟ್ಟ APMC ಮಂಡಿ' : 'Related APMC Mandi'}</span>
                  </label>
                  <select
                    name="mandi_name"
                    value={form.mandi_name}
                    onChange={handleFormChange}
                    className="fp-select-control"
                  >
                    {MANDI_NAMES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="fp-field-label">
                    <span style={{ fontSize: 13 }}>🌱</span>
                    <span>{isKn ? 'ಸಂಬಂಧಿತ ಬೆಳೆ / ಸರಕು' : 'Related Crop / Commodity'}</span>
                  </label>
                  <input
                    type="text"
                    name="crop_name"
                    value={form.crop_name}
                    onChange={handleFormChange}
                    className="fp-input-control"
                    placeholder="Tomato"
                  />
                </div>

                <div>
                  <label className="fp-field-label">
                    <Clock size={13} color="#15803D" />
                    <span>{isKn ? 'ಘಟನೆಯ ದಿನಾಂಕ' : 'Incident Date'}</span>
                  </label>
                  <input
                    type="date"
                    name="incident_date"
                    value={form.incident_date}
                    onChange={handleFormChange}
                    className="fp-input-control"
                  />
                </div>
              </div>

              {/* Full Width Subject */}
              <div style={{ marginTop: 16 }}>
                <label className="fp-field-label">
                  <FileText size={13} color="#15803D" />
                  <span>{isKn ? 'ದೂರಿನ ವಿಷಯ' : 'Subject of Complaint'}</span>
                  <span className="required-star">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleFormChange}
                  className="fp-input-control"
                  placeholder={isKn ? 'ಉದಾ: ೭ ದಿನಗಳ ನಂತರವೂ ಹಣ ಪಾವತಿಯಲ್ಲಿ ವಿಳಂಬ' : 'e.g. Delay in payment beyond 7 days'}
                  required
                />
              </div>

              {/* Full Width Detailed Description */}
              <div style={{ marginTop: 16 }}>
                <label className="fp-field-label">
                  <FileText size={13} color="#15803D" />
                  <span>{isKn ? 'ದೂರಿನ ಸವಿಸ್ತಾರ ವಿವರಣೆ' : 'Detailed Grievance Description'}</span>
                  <span className="required-star">*</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  className="fp-textarea-control"
                  rows={4}
                  placeholder={isKn
                    ? 'ಸಂಪೂರ್ಣ ವಿವರಗಳನ್ನು ಒದಗಿಸಿ: ವ್ಯಾಪಾರಿ/ಅಂಗಡಿ ಸಂಖ್ಯೆ, ಒಪ್ಪಿದ ದರ ಮತ್ತು ಪಾವತಿಸಿದ ದರ, ತೂಕದ ಚೀಟಿಗಳು ಮತ್ತು ದಿನಾಂಕಗಳು...'
                    : 'Provide complete details: trader/shop number, agreed rate vs paid rate, weight slips, and dates...'}
                  required
                />
              </div>

              {/* File Upload Dropzone matching Reference Image 2 */}
              <div className="fp-upload-dropzone">
                <div className="fp-upload-left">
                  <div className="fp-upload-icon-circle">
                    <Upload size={18} />
                  </div>
                  <div>
                    <div className="fp-upload-title">
                      {isKn ? 'ತೂಕದ ಚೀಟಿ / ಮಾರಾಟ ರಸೀದಿ / ಪುರಾವೆ ಲಗತ್ತಿಸಿ (ಗರಿಷ್ಠ 5MB)' : 'Attach Weight Slip / Sale Receipt / Evidence (Max 5MB)'}
                    </div>
                    <div className="fp-upload-subtitle">
                      {isKn ? 'ಬೆಂಬಲಿತ ಮಾದರಿಗಳು: JPG, PNG, WEBP, PDF' : 'Supported formats: JPG, PNG, WEBP, PDF'}
                    </div>
                  </div>
                </div>

                <label className="fp-upload-btn">
                  <Upload size={14} />
                  <span>{uploading ? (isKn ? 'ಅಪ್‌ಲೋಡ್ ಆಗುತ್ತಿದೆ...' : 'Uploading...') : (isKn ? 'ಫೈಲ್ ಆಯ್ಕೆಮಾಡಿ' : 'Choose File')}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
              </div>

              {form.attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                  {form.attachments.map((url, i) => (
                    <div key={i} style={{ padding: '4px 12px', background: '#DEF7EC', color: '#03543F', borderRadius: 16, fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileCheck size={14} />
                      <span>Evidence #{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Submit Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 22 }}>
                <button
                  type="submit"
                  className="fp-btn-primary"
                  disabled={submitting}
                  style={{ padding: '11px 26px', fontSize: 14 }}
                >
                  <span>{submitting ? (isKn ? 'ದಾಖಲಾಗುತ್ತಿದೆ...' : 'Submitting...') : (isKn ? 'ದೂರು ಸಲ್ಲಿಸಿ' : 'Submit Grievance')}</span>
                  <span style={{ fontSize: 16 }}>➔</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: TRACK COMPLAINT                                    */}
      {/* ========================================================= */}
      {activeTab === 'track' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Search Box with Privacy Protection Notice */}
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', margin: '0 0 12px 0' }}>
              {isKn ? 'ದೂರಿನ ಪ್ರಗತಿ ಮತ್ತು ಪರಿಹಾರ ಸ್ಥಿತಿ ಪರಿಶೀಲನೆ' : 'Verifiable Grievance Status & Timeline Tracker'}
            </h3>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, fontSize: 12, color: '#1E40AF', marginBottom: 16 }}>
              <Lock size={16} />
              <span>
                {isKn
                  ? 'ಗೌಪ್ಯತೆ ರಕ್ಷಣೆ: ದೂರನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಲು ದೂರು ಸಂಖ್ಯೆ ಮತ್ತು ನೋಂದಾಯಿತ ೧೦-ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ ಎರಡೂ ಕಡ್ಡಾಯವಾಗಿದೆ.'
                  : 'Privacy Protected: To safeguard farmer confidentiality, tracking requires both the reference ID and registered 10-digit mobile number.'}
              </span>
            </div>

            <form onSubmit={handleTrackComplaint} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr)) 120px', gap: 12, alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  {isKn ? 'ದೂರು ಸಂಖ್ಯೆ' : 'Complaint Reference ID'}
                </label>
                <input
                  type="text"
                  value={trackId}
                  onChange={(e) => setTrackId(e.target.value)}
                  className="form-input"
                  placeholder="CMP-2026-XXXX"
                  required
                  style={{ marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                  {isKn ? 'ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ' : 'Registered 10-Digit Mobile'}
                </label>
                <input
                  type="tel"
                  value={trackPhone}
                  onChange={(e) => setTrackPhone(e.target.value)}
                  className="form-input"
                  placeholder="9876543210"
                  required
                  style={{ marginTop: 4 }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={tracking}
                style={{ height: 42 }}
              >
                {tracking ? (isKn ? 'ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...' : 'Verifying...') : (isKn ? 'ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : 'Track Status')}
              </button>
            </form>

            {trackError && (
              <div style={{ marginTop: 16, padding: 12, background: '#FEE2E2', color: '#991B1B', borderRadius: 8, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} />
                <span>{trackError}</span>
              </div>
            )}
          </div>

          {/* Tracked Record Result */}
          {trackedRecord && (
            <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid #E2E8F0', paddingBottom: 14 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: '#1B4332' }}>{trackedRecord.complaint_id}</span>
                    <span className={getBadgeClass(trackedRecord.status)}>{trackedRecord.status}</span>
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: '6px 0 2px 0' }}>{trackedRecord.subject}</h4>
                  <div style={{ fontSize: 12, color: '#6B7280' }}>
                    {trackedRecord.mandi_name || 'Hassan APMC'} &bull; {trackedRecord.category} &bull; {trackedRecord.created_at?.slice(0, 10)}
                  </div>
                </div>

                <button
                  className="btn-secondary"
                  onClick={() => setActiveReportDoc({ docType: 'complaint_report', data: trackedRecord })}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                >
                  <FileText size={14} />
                  <span>{isKn ? 'ಅಧಿಕೃತ ವರದಿ ಡೌನ್‌ಲೋಡ್' : 'Download Status Report'}</span>
                </button>
              </div>

              <div style={{ margin: '16px 0', fontSize: 13, lineHeight: 1.6, color: '#374151' }}>
                {trackedRecord.description}
              </div>

              {trackedRecord.resolution_notes && (
                <div style={{ padding: 14, background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#14532D', marginBottom: 4 }}>
                    {isKn ? 'ಅಧಿಕೃತ ಪರಿಹಾರ ಟಿಪ್ಪಣಿ:' : 'Official Resolution Notes:'}
                  </div>
                  <div style={{ fontSize: 13, color: '#166534' }}>
                    {trackedRecord.resolution_notes}
                  </div>
                  <div style={{ fontSize: 11, color: '#15803D', marginTop: 4 }}>
                    {isKn ? 'ಪರಿಹರಿಸಿದವರು:' : 'Action Taken By:'} {trackedRecord.resolved_by} ({trackedRecord.resolved_at})
                  </div>
                </div>
              )}

              {/* Audit Timeline */}
              <div style={{ marginTop: 20 }}>
                <h4 style={{ fontSize: 13, fontWeight: 800, color: '#1B4332', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
                  {isKn ? 'ದೂರಿನ ಪ್ರಗತಿ ಮತ್ತು ಆಡಿಟ್ ಇತಿಹಾಸ' : 'Status Progression & Audit Trail'}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {(trackedRecord.history || []).map((h, i) => (
                    <div key={h.history_id || i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981', marginTop: 6, flexShrink: 0 }} />
                      <div style={{ flex: 1, background: '#F9FAFB', borderRadius: 8, padding: 10, border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1F2937' }}>
                            Status: <span className={getBadgeClass(h.status)}>{h.status}</span>
                          </span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>{h.timestamp}</span>
                        </div>
                        {h.notes && (
                          <div style={{ fontSize: 12, color: '#4B5563', marginTop: 4 }}>{h.notes}</div>
                        )}
                        <div style={{ fontSize: 10.5, color: '#9CA3AF', marginTop: 4 }}>
                          Logged by: {h.actor_name} ({h.actor_role})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MY COMPLAINTS                                      */}
      {/* ========================================================= */}
      {activeTab === 'my_complaints' && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', margin: 0 }}>
                {isKn ? 'ನನ್ನ ನೋಂದಾಯಿತ ದೂರುಗಳು' : 'My Registered Complaints'}
              </h3>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {isKn ? 'ನಿಮ್ಮ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಗೆ ದಾಖಲಾದ ಎಲ್ಲಾ ದೂರುಗಳ ಇತಿಹಾಸ.' : 'Historical records of complaints registered against your mobile number.'}
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
              <button className="btn-secondary" onClick={loadMyComplaints}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loadingMy ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
              <RefreshCw size={22} className="spin-icon" style={{ marginBottom: 8 }} />
              <div>Loading...</div>
            </div>
          ) : myComplaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#6B7280' }}>
              <FileText size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
              <p style={{ margin: 0 }}>{isKn ? 'ಯಾವುದೇ ದೂರುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.' : 'No complaints found registered with this phone number.'}</p>
            </div>
          ) : (
            <div className="report-table-container">
              <table className="report-comparison-table">
                <thead>
                  <tr>
                    <th>{isKn ? 'ದೂರು ಸಂಖ್ಯೆ' : 'Ref ID'}</th>
                    <th>{isKn ? 'ವಿಷಯ' : 'Subject'}</th>
                    <th>{isKn ? 'ಮಂಡಿ' : 'Mandi'}</th>
                    <th>{isKn ? 'ದಿನಾಂಕ' : 'Date'}</th>
                    <th>{isKn ? 'ಸ್ಥಿತಿ' : 'Status'}</th>
                    <th>{isKn ? 'ಕ್ರಮ' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {myComplaints.map(c => (
                    <tr key={c.complaint_id}>
                      <td style={{ fontWeight: 700, color: '#166534' }}>{c.complaint_id}</td>
                      <td>{c.subject}</td>
                      <td>{c.mandi_name || 'Hassan APMC'}</td>
                      <td>{c.created_at?.slice(0, 10)}</td>
                      <td><span className={getBadgeClass(c.status)}>{c.status}</span></td>
                      <td>
                        <button
                          className="btn-secondary"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => {
                            setTrackId(c.complaint_id);
                            setTrackPhone(c.phone);
                            setActiveTab('track');
                          }}
                        >
                          {isKn ? 'ಟ್ರ್ಯಾಕ್ ಮಾಡಿ' : 'Track'}
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

      {/* ========================================================= */}
      {/* TAB 4: STAFF / ADMIN RESOLUTION DESK                      */}
      {/* ========================================================= */}
      {activeTab === 'admin' && isAdmin && (
        <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', margin: 0 }}>
                {isKn ? 'ಅಧಿಕೃತ APMC ದೂರು ಪರಿಹಾರ ಡೆಸ್ಕ್ (Admin Desk)' : 'APMC Staff & Admin Resolution Desk'}
              </h3>
              <span style={{ fontSize: 12, color: '#6B7280' }}>
                {isKn ? 'ದೂರುಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಸ್ಥಿತಿ ಬದಲಾವಣೆ ಮಾಡಿ ಮತ್ತು ಅಧಿಕೃತ ಟಿಪ್ಪಣಿಗಳನ್ನು ದಾಖಲಿಸಿ.' : 'Review incoming grievances, transition lifecycle statuses, and log resolution audit notes.'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <select
                value={adminFilterStatus}
                onChange={(e) => setAdminFilterStatus(e.target.value)}
                className="form-input"
                style={{ width: 150 }}
              >
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <button className="btn-secondary" onClick={loadAdminComplaints}>
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          {loadingAdmin ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#6B7280' }}>
              <RefreshCw size={22} className="spin-icon" style={{ marginBottom: 8 }} />
              <div>Loading complaints...</div>
            </div>
          ) : (
            <div className="report-table-container">
              <table className="report-comparison-table">
                <thead>
                  <tr>
                    <th>Ref ID</th>
                    <th>Complainant</th>
                    <th>Phone</th>
                    <th>Subject</th>
                    <th>Mandi</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {adminList.map(c => (
                    <tr key={c.complaint_id}>
                      <td style={{ fontWeight: 700, color: '#166534' }}>{c.complaint_id}</td>
                      <td>{c.farmer_name}</td>
                      <td>{c.phone}</td>
                      <td>{c.subject}</td>
                      <td>{c.mandi_name || 'Hassan APMC'}</td>
                      <td><span className={getBadgeClass(c.status)}>{c.status}</span></td>
                      <td>
                        <button
                          className="btn-primary"
                          style={{ fontSize: 11, padding: '4px 10px' }}
                          onClick={() => {
                            setSelectedComplaintForAction(c);
                            setUpdateStatusVal(c.status);
                            setUpdateNotesVal(c.resolution_notes || '');
                          }}
                        >
                          Resolve
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

      {/* Admin Action Modal */}
      {selectedComplaintForAction && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, maxWidth: 520, width: '100%', padding: 24, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1B4332', margin: '0 0 16px 0' }}>
              Update Complaint: {selectedComplaintForAction.complaint_id}
            </h3>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                Transition Status
              </label>
              <select
                value={updateStatusVal}
                onChange={(e) => setUpdateStatusVal(e.target.value)}
                className="form-input"
              >
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Resolved">Resolved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                Investigation / Resolution Notes
              </label>
              <textarea
                value={updateNotesVal}
                onChange={(e) => setUpdateNotesVal(e.target.value)}
                className="form-input"
                rows={4}
                placeholder="Enter actions taken, APMC vigilance committee findings, refund order, or rejection reasons..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn-secondary" onClick={() => setSelectedComplaintForAction(null)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleUpdateStatus}
                disabled={updatingStatus}
              >
                {updatingStatus ? 'Updating...' : 'Save Audit Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: DOWNLOADABLE FORMS & REPORTS                       */}
      {/* ========================================================= */}
      {activeTab === 'forms' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#DEF7EC', color: '#03543F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <Download size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', margin: 0 }}>
              {isKn ? 'ಖಾಲಿ ಆಫ್‌ಲೈನ್ ದೂರು ನಮೂನೆ' : 'Blank Physical Complaint Form'}
            </h3>
            <p style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.5, flex: 1, margin: '8px 0 16px 0' }}>
              {isKn ? 'APMC ಕಾರ್ಯದರ್ಶಿ ಕಚೇರಿ ಮತ್ತು ಮಾರುಕಟ್ಟೆ ಜಾಗೃತ ದಳಕ್ಕೆ ಸ್ವತಃ ಭರ್ತಿ ಮಾಡಿ ಸಲ್ಲಿಸಲು ಮುದ್ರಣ ಪ್ರತಿ.' : 'Official physical form template for offline manual submission at any Karnataka APMC Secretary office.'}
            </p>
            <button
              className="btn-primary"
              onClick={() => setActiveReportDoc({ docType: 'blank_complaint', data: null })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Download size={14} />
              <span>{isKn ? 'ನಮೂನೆ ಡೌನ್‌ಲೋಡ್ / ಮುದ್ರಣ' : 'Download / Print Blank Form'}</span>
            </button>
          </div>

          <div style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E2E8F0', padding: 20, display: 'flex', flexDirection: 'column' }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: '#1B4332', margin: 0 }}>
              {isKn ? 'ರೈತರ ಮಾರುಕಟ್ಟೆ ಹಕ್ಕುಗಳು ಮತ್ತು ಗಡುವು' : 'Farmer APMC Rights & Redressal Rules'}
            </h3>
            <p style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.5, flex: 1, margin: '8px 0 16px 0' }}>
              {isKn ? 'ಕರ್ನಾಟಕ APMR ಕಾಯ್ದೆ ಪ್ರಕಾರ ೨೪ ಗಂಟೆಯೊಳಗೆ ಹಣ ಪಾವತಿ ಮತ್ತು ನಿಗದಿತ ಕಮಿಷನ್ ಶುಲ್ಕ ನಿಯಮಾವಳಿಗಳು.' : 'Statutory guidelines mandating 24-hour auction payments and prohibiting buyer deductions.'}
            </p>
            <button
              className="btn-secondary"
              onClick={() => setActiveTab('track')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Eye size={14} />
              <span>{isKn ? 'ಹಕ್ಕುಗಳನ್ನು ಓದಿ' : 'View Redressal Rules'}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
