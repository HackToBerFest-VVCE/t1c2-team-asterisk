import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Store,
  Tag,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  AlertCircle,
  Building2,
  UserCheck,
  Edit3,
  X,
  Send,
  RefreshCw,
  Phone,
  Database,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  ChevronRight,
  Check,
  Layers
} from 'lucide-react';
import {
  fetchMarketplaceListings,
  createMarketplaceListing,
  updateMarketplaceListing,
  submitPurchaseEnquiry,
  fetchPurchaseEnquiries,
  updatePurchaseEnquiryStatus,
  fetchMarketplaceProfiles
} from '../services/api';

export default function MarketplaceView({ t, lang = 'en', userInfo = {}, userRole = 'public' }) {
  // Navigation tabs: 'buyer' | 'farmer' | 'enquiries' | 'directory'
  const [activeTab, setActiveTab] = useState('buyer');

  // Listings state
  const [listings, setListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState(null);

  // Filters state
  const [searchCrop, setSearchCrop] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('All');

  // Enquiries state
  const [enquiries, setEnquiries] = useState([]);
  const [loadingEnquiries, setLoadingEnquiries] = useState(false);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('All');

  // Profiles state
  const [profiles, setProfiles] = useState([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Modal states
  const [isEnquiryModalOpen, setIsEnquiryModalOpen] = useState(false);
  const [selectedListingForEnquiry, setSelectedListingForEnquiry] = useState(null);
  const [enquiryForm, setEnquiryForm] = useState({
    requested_quantity: '',
    offered_price: '',
    buyer_company: '',
    buyer_phone: '',
    buyer_name: '',
    message: ''
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  // Create Listing Modal
  const [isCreateListingModalOpen, setIsCreateListingModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    crop_name: 'Tomato',
    variety: 'Hybrid Shivam',
    available_quantity: '',
    quantity_unit: 'Quintals',
    expected_price: '',
    district: userInfo.district || 'Hassan',
    village_or_town: 'Sakleshpur',
    pickup_address: 'Main Road Farm Plot',
    harvest_date: new Date().toISOString().split('T')[0],
    quality_grade: 'Grade A / Fair Average',
    description: '',
    photo_url: ''
  });
  const [submittingListing, setSubmittingListing] = useState(false);

  // Edit Listing Modal
  const [isEditListingModalOpen, setIsEditListingModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [editForm, setEditForm] = useState({
    expected_price: '',
    available_quantity: '',
    listing_status: 'ACTIVE',
    description: ''
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // 1. Load Listings
  const loadListings = async () => {
    setLoadingListings(true);
    setListingsError(null);
    try {
      const data = await fetchMarketplaceListings({
        crop_name: searchCrop || undefined,
        district: selectedDistrict !== 'All' ? selectedDistrict : undefined,
        limit: 100
      });
      setListings(data || []);
    } catch (err) {
      console.error('Failed to load listings:', err);
      setListingsError(err.message || 'Failed to load live listings from Snowflake');
    } finally {
      setLoadingListings(false);
    }
  };

  // 2. Load Enquiries
  const loadEnquiries = async () => {
    setLoadingEnquiries(true);
    try {
      const data = await fetchPurchaseEnquiries({ limit: 100 });
      setEnquiries(data || []);
    } catch (err) {
      console.warn('Failed to load enquiries:', err);
    } finally {
      setLoadingEnquiries(false);
    }
  };

  // 3. Load Profiles
  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const data = await fetchMarketplaceProfiles();
      setProfiles(data || []);
    } catch (err) {
      console.warn('Failed to load profiles:', err);
    } finally {
      setLoadingProfiles(false);
    }
  };

  useEffect(() => {
    loadListings();
    loadEnquiries();
    loadProfiles();
  }, [searchCrop, selectedDistrict]);

  // Derived metrics for summary banner
  const metrics = useMemo(() => {
    const activeListings = listings.filter((l) => l.listing_status === 'ACTIVE' || l.listing_status === 'PARTIALLY_FULFILLED');
    const totalVolume = activeListings.reduce((sum, l) => sum + (Number(l.available_quantity) || 0), 0);
    const pendingEnquiries = enquiries.filter((e) => e.enquiry_status === 'SUBMITTED').length;
    const acceptedTrades = enquiries.filter((e) => e.enquiry_status === 'ACCEPTED' || e.enquiry_status === 'COMPLETED').length;
    return {
      activeListingsCount: activeListings.length,
      totalVolume: Math.round(totalVolume * 10) / 10,
      pendingEnquiries,
      acceptedTrades
    };
  }, [listings, enquiries]);

  // Open Enquiry Modal
  const handleOpenEnquiry = (listing) => {
    setSelectedListingForEnquiry(listing);
    setEnquiryForm({
      requested_quantity: Math.min(20, listing.available_quantity),
      offered_price: listing.expected_price,
      buyer_company: userInfo.yard_name || userInfo.business_name || (userRole === 'admin' ? 'Hassan APMC Directorate' : 'Agri Traders Corp'),
      buyer_phone: userInfo.phone || '+91 98450 11223',
      buyer_name: userInfo.name || 'APMC Registered Purchaser',
      message: `Interested in procuring ${listing.crop_name} (${listing.variety}) with direct farm pickup.`
    });
    setIsEnquiryModalOpen(true);
  };

  // Submit Enquiry
  const handleSubmitEnquiry = async (e) => {
    e.preventDefault();
    if (!selectedListingForEnquiry) return;

    const requestedQty = parseFloat(enquiryForm.requested_quantity);
    const offeredPr = parseFloat(enquiryForm.offered_price);

    if (isNaN(requestedQty) || requestedQty <= 0) {
      alert('Please enter a valid requested quantity greater than 0.');
      return;
    }
    if (requestedQty > selectedListingForEnquiry.available_quantity) {
      alert(`Requested quantity (${requestedQty}) exceeds available stock (${selectedListingForEnquiry.available_quantity} ${selectedListingForEnquiry.quantity_unit}).`);
      return;
    }
    if (isNaN(offeredPr) || offeredPr <= 0) {
      alert('Please enter a valid offered price greater than 0.');
      return;
    }

    setSubmittingEnquiry(true);
    try {
      const payload = {
        buyer_id: userInfo.user_id || (userRole === 'admin' ? 'buyer_hassan_apmc' : 'buyer_general_trader'),
        buyer_name: enquiryForm.buyer_name || 'Verified APMC Buyer',
        buyer_phone: enquiryForm.buyer_phone || '+91 98450 11223',
        buyer_company: enquiryForm.buyer_company || 'Karnataka Agro Traders',
        requested_quantity: requestedQty,
        offered_price: offeredPr,
        message: enquiryForm.message
      };

      await submitPurchaseEnquiry(selectedListingForEnquiry.listing_id, payload);
      showToast(`Purchase enquiry for ${selectedListingForEnquiry.crop_name} submitted successfully to Snowflake!`);
      setIsEnquiryModalOpen(false);
      loadListings();
      loadEnquiries();
    } catch (err) {
      alert(err.message || 'Failed to submit enquiry');
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // Create Listing
  const handleCreateListing = async (e) => {
    e.preventDefault();
    const qty = parseFloat(createForm.available_quantity);
    const price = parseFloat(createForm.expected_price);

    if (isNaN(qty) || qty <= 0) {
      alert('Available quantity must be greater than 0.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      alert('Expected price must be greater than 0.');
      return;
    }

    setSubmittingListing(true);
    try {
      const payload = {
        farmer_id: userInfo.user_id || 'usr_chethan',
        farmer_name: userInfo.name || 'Chethan Patel',
        farmer_phone: userInfo.phone || '+91 98765 43210',
        crop_name: createForm.crop_name,
        variety: createForm.variety || 'Standard / Hybrid',
        available_quantity: qty,
        quantity_unit: createForm.quantity_unit,
        expected_price: price,
        state: 'Karnataka',
        district: createForm.district,
        village_or_town: createForm.village_or_town,
        pickup_address: createForm.pickup_address,
        harvest_date: createForm.harvest_date,
        quality_grade: createForm.quality_grade,
        description: createForm.description || `Freshly harvested ${createForm.crop_name} ready for direct trade.`,
        photo_url: createForm.photo_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600'
      };

      await createMarketplaceListing(payload);
      showToast(`New ${createForm.crop_name} harvest listing published live to Snowflake!`);
      setIsCreateListingModalOpen(false);
      loadListings();
    } catch (err) {
      alert(err.message || 'Failed to publish listing');
    } finally {
      setSubmittingListing(false);
    }
  };

  // Open Edit Listing Modal
  const handleOpenEditListing = (listing) => {
    setEditingListing(listing);
    setEditForm({
      expected_price: listing.expected_price,
      available_quantity: listing.available_quantity,
      listing_status: listing.listing_status,
      description: listing.description || ''
    });
    setIsEditListingModalOpen(true);
  };

  // Submit Edit Listing
  const handleSubmitEditListing = async (e) => {
    e.preventDefault();
    if (!editingListing) return;

    const qty = parseFloat(editForm.available_quantity);
    const price = parseFloat(editForm.expected_price);

    if (isNaN(qty) || qty < 0) {
      alert('Available quantity cannot be negative.');
      return;
    }
    if (isNaN(price) || price <= 0) {
      alert('Expected price must be greater than 0.');
      return;
    }

    setSubmittingEdit(true);
    try {
      await updateMarketplaceListing(editingListing.listing_id, {
        available_quantity: qty,
        expected_price: price,
        listing_status: editForm.listing_status,
        description: editForm.description
      });
      showToast(`Produce listing ${editingListing.listing_id} updated live in Snowflake!`);
      setIsEditListingModalOpen(false);
      loadListings();
    } catch (err) {
      alert(err.message || 'Failed to update listing');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Accept or Reject Enquiry
  const handleUpdateEnquiryStatus = async (enquiryId, newStatus) => {
    const confirmMsg = newStatus === 'ACCEPTED'
      ? 'Accepting this enquiry will commit the sale and decrement the available produce stock in Snowflake. Proceed?'
      : `Are you sure you want to change this enquiry to ${newStatus}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await updatePurchaseEnquiryStatus(enquiryId, {
        enquiry_status: newStatus,
        farmer_response_note: newStatus === 'ACCEPTED'
          ? 'Enquiry accepted! Sale confirmed, logistics truck dispatched.'
          : 'Thank you for your enquiry. Offer declined at this time.'
      });
      showToast(`Enquiry ${newStatus.toLowerCase()} successfully! Snowflake inventory updated.`);
      loadEnquiries();
      loadListings();
    } catch (err) {
      alert(err.message || 'Failed to update enquiry status');
    }
  };

  // Filtered listings
  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (selectedGrade !== 'All' && !l.quality_grade?.includes(selectedGrade)) return false;
      return true;
    });
  }, [listings, selectedGrade]);

  // Farmer's own listings
  const myListings = useMemo(() => {
    const farmerId = userInfo.user_id || 'usr_chethan';
    const farmerName = userInfo.name || 'Chethan Patel';
    return listings.filter((l) => l.farmer_id === farmerId || l.farmer_name === farmerName);
  }, [listings, userInfo]);

  return (
    <div className="marketplace-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: toastMessage.type === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 500,
            fontSize: '0.95rem'
          }}
        >
          <CheckCircle2 size={20} />
          <span>{toastMessage.msg}</span>
        </div>
      )}

      {/* Hero Header */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(22, 101, 52, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          color: '#ffffff',
          padding: '2rem',
          borderRadius: '16px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span
                style={{
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  color: '#4ade80',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  border: '1px solid rgba(74, 222, 128, 0.3)'
                }}
              >
                <Database size={13} />
                LIVE SNOWFLAKE INTEGRATION • FARMPRICE_DB.AGRICULTURE
              </span>
              <span
                style={{
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  color: '#93c5fd',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Dual-Mirror Mode
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: '4px 0', letterSpacing: '-0.02em', color: '#ffffff' }}>
              {lang === 'kn' ? 'ನೇರ ಕೃಷಿ ಮಾರುಕಟ್ಟೆ ವೇದಿಕೆ' : 'Farmer & Buyer Agri Marketplace'}
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '0.95rem', maxWidth: '750px', margin: 0 }}>
              {lang === 'kn'
                ? 'ರೈತರಿಂದ ನೇರ ಬೆಳೆ ಮಾರಾಟ ಮತ್ತು ಎಪಿಎಂಸಿ ಖರೀದಿದಾರರ ಖರೀದಿ ವಿಚಾರಣೆಗಳು. ಸ್ನೋಫ್ಲೇಕ್ ಡೇಟಾ ವೇರ್‌ಹೌಸ್‌ನಿಂದ ನೈಜ ಸಮಯದಲ್ಲಿ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ.'
                : 'Direct digital trade exchange connecting Karnataka farmers with APMC wholesale buyers. Authoritative produce inventory, real-time enquiries, and automated stock fulfillment powered by Snowflake.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                loadListings();
                loadEnquiries();
                loadProfiles();
                showToast('Refreshed live data from Snowflake');
              }}
              className="btn btn-secondary"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              title="Refresh live data from Snowflake"
            >
              <RefreshCw size={15} className={loadingListings ? 'animate-spin' : ''} />
              Sync Snowflake
            </button>
            <button
              onClick={() => setIsCreateListingModalOpen(true)}
              className="btn btn-primary"
              style={{
                backgroundColor: '#22c55e',
                color: '#fff',
                border: 'none',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)'
              }}
            >
              <PlusCircle size={17} />
              {lang === 'kn' ? 'ಹೊಸ ಬೆಳೆ ಪಟ್ಟಿ ಮಾಡಿ' : 'List New Harvest'}
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)'
          }}
        >
          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.07)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Produce Listings
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: '#4ade80' }}>
              {metrics.activeListingsCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>In Snowflake PRODUCE_LISTINGS</div>
          </div>

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.07)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Available Volume
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: '#60a5fa' }}>
              {metrics.totalVolume} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Quintals</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Aggregated stock across districts</div>
          </div>

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.07)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Enquiries
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: '#facc15' }}>
              {metrics.pendingEnquiries}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Awaiting farmer review</div>
          </div>

          <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.07)', padding: '12px 16px', borderRadius: '10px' }}>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Confirmed Trades
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '4px', color: '#34d399' }}>
              {metrics.acceptedTrades}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.6)' }}>Stock auto-decremented</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '6px' }}>
        <button
          onClick={() => setActiveTab('buyer')}
          className={`btn ${activeTab === 'buyer' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
        >
          <ShoppingBag size={17} />
          {lang === 'kn' ? 'ಖರೀದಿದಾರರ ಮಾರುಕಟ್ಟೆ' : 'Buyer Marketplace (Live Feed)'}
          <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {listings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('farmer')}
          className={`btn ${activeTab === 'farmer' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
        >
          <Store size={17} />
          {lang === 'kn' ? 'ರೈತರ ಕೊಯ್ಲು ಪೋರ್ಟಲ್' : 'Farmer Produce Portal (My Listings)'}
          <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {myListings.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('enquiries')}
          className={`btn ${activeTab === 'enquiries' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
        >
          <Tag size={17} />
          {lang === 'kn' ? 'ಖರೀದಿ ವಿಚಾರಣೆಗಳು' : 'Purchase Enquiries & Orders'}
          <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {enquiries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('directory')}
          className={`btn ${activeTab === 'directory' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '8px', fontWeight: 600 }}
        >
          <Building2 size={17} />
          {lang === 'kn' ? 'ಪರಿಶೀಲಿತ ಎಪಿಎಂಸಿ & ರೈತರು' : 'Verified Directory'}
          <span style={{ backgroundColor: 'rgba(0,0,0,0.15)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
            {profiles.length}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: BUYER MARKETPLACE (LIVE FEED) */}
      {/* =================================================================== */}
      {activeTab === 'buyer' && (
        <div>
          {/* Search & Filter Bar */}
          <div
            className="card"
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--surface-color)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}
          >
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search crops (e.g. Tomato, Onion, Ginger, Potato)..."
                value={searchCrop}
                onChange={(e) => setSearchCrop(e.target.value)}
                className="input-field"
                style={{ width: '100%', paddingLeft: '36px' }}
              />
            </div>

            <div style={{ flex: '0 1 180px' }}>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="All">All Districts</option>
                <option value="Hassan">Hassan</option>
                <option value="Mysore">Mysore</option>
                <option value="Belagavi">Belagavi</option>
                <option value="Davanagere">Davanagere</option>
                <option value="Bengaluru Urban">Bengaluru Urban</option>
                <option value="Mandya">Mandya</option>
              </select>
            </div>

            <div style={{ flex: '0 1 180px' }}>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="input-field"
                style={{ width: '100%' }}
              >
                <option value="All">All Quality Grades</option>
                <option value="Grade A">Grade A Quality</option>
                <option value="Organic">Organic Certified</option>
                <option value="Export">Export Grade</option>
                <option value="FAQ">Fair Average Quality</option>
              </select>
            </div>

            {(searchCrop || selectedDistrict !== 'All' || selectedGrade !== 'All') && (
              <button
                onClick={() => {
                  setSearchCrop('');
                  setSelectedDistrict('All');
                  setSelectedGrade('All');
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.85rem', padding: '8px 12px' }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Listings Grid */}
          {loadingListings ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Querying live crop listings from Snowflake (FARMPRICE_DB.AGRICULTURE)...</p>
            </div>
          ) : listingsError ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center', borderColor: '#ef4444' }}>
              <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
              <h3 style={{ color: '#ef4444', marginBottom: '8px' }}>Failed to Load Snowflake Listings</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>{listingsError}</p>
              <button onClick={loadListings} className="btn btn-primary">
                Retry Query
              </button>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <PackageCheck size={42} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3 style={{ marginBottom: '6px' }}>No produce listings found matching your search</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Try clearing filters or post a new harvest listing.</p>
              <button onClick={() => setIsCreateListingModalOpen(true)} className="btn btn-primary">
                List Produce Now
              </button>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem'
              }}
            >
              {filteredListings.map((listing) => {
                const isSoldOut = listing.available_quantity <= 0;
                const isPartiallyFulfilled = listing.listing_status === 'PARTIALLY_FULFILLED';

                return (
                  <div
                    key={listing.listing_id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      backgroundColor: 'var(--surface-color)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                    }}
                  >
                    {/* Crop Image Header */}
                    <div style={{ position: 'relative', height: '170px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                      <img
                        src={listing.photo_url || 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600'}
                        alt={listing.crop_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600';
                        }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backdropFilter: 'blur(4px)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <ShieldCheck size={13} style={{ color: '#4ade80' }} />
                        {listing.quality_grade || 'Grade A'}
                      </div>

                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          backgroundColor: isSoldOut ? '#ef4444' : isPartiallyFulfilled ? '#f59e0b' : '#10b981',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700
                        }}
                      >
                        {isSoldOut ? 'FULFILLED' : isPartiallyFulfilled ? 'PARTIALLY SOLD' : 'ACTIVE'}
                      </div>

                      <div
                        style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                          padding: '24px 12px 8px',
                          color: '#fff'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{listing.crop_name}</span>
                          <span style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{listing.variety}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '1.1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      {/* Price & Quantity Row */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingBottom: '10px',
                          borderBottom: '1px solid var(--border-color)',
                          marginBottom: '10px'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Price</div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                            ₹{listing.expected_price.toLocaleString('en-IN')}
                            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                              {' '}/ {listing.quantity_unit}
                            </span>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Stock</div>
                          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: isSoldOut ? '#ef4444' : 'var(--text-color)' }}>
                            {listing.available_quantity} <span style={{ fontSize: '0.8rem' }}>{listing.quantity_unit}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stock Progress Bar */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          <span>Fulfillment Progress</span>
                          <span>
                            {Math.round(((listing.initial_quantity - listing.available_quantity) / (listing.initial_quantity || 1)) * 100)}% Claimed
                          </span>
                        </div>
                        <div style={{ height: '6px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, Math.max(0, ((listing.initial_quantity - listing.available_quantity) / (listing.initial_quantity || 1)) * 100))}%`,
                              height: '100%',
                              backgroundColor: isSoldOut ? '#94a3b8' : '#22c55e',
                              borderRadius: '4px'
                            }}
                          />
                        </div>
                      </div>

                      {/* Farmer & Location details */}
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} style={{ color: '#16a34a' }} />
                          <span style={{ fontWeight: 600, color: 'var(--text-color)' }}>{listing.farmer_name}</span>
                          {listing.farmer_is_verified && (
                            <span style={{ fontSize: '0.7rem', color: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                              Verified Farmer
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} />
                          <span>{listing.village_or_town}, {listing.district}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} />
                          <span>Harvest Date: {listing.harvest_date}</span>
                        </div>
                      </div>

                      {/* Description snippet */}
                      {listing.description && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 12px', fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{listing.description}"
                        </p>
                      )}

                      {/* Enquiries badge & CTA Button */}
                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', paddingTop: '10px' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {listing.enquiries_count || 0} enquiry submitted
                        </span>

                        <button
                          disabled={isSoldOut}
                          onClick={() => handleOpenEnquiry(listing)}
                          className="btn btn-primary"
                          style={{
                            padding: '8px 14px',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            opacity: isSoldOut ? 0.6 : 1,
                            cursor: isSoldOut ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <Send size={14} />
                          {isSoldOut ? 'Sold Out' : 'Send Enquiry'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: FARMER PRODUCE PORTAL (MY LISTINGS) */}
      {/* =================================================================== */}
      {activeTab === 'farmer' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                {lang === 'kn' ? 'ನನ್ನ ಬೆಳೆ ಪಟ್ಟಿಗಳು' : 'My Active Produce Listings'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '2px 0 0' }}>
                Manage your live harvests committed to Snowflake. Edit prices or update available stock anytime.
              </p>
            </div>
            <button
              onClick={() => setIsCreateListingModalOpen(true)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <PlusCircle size={16} />
              Publish New Crop Listing
            </button>
          </div>

          {myListings.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <Store size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3>You have not published any produce listings yet</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                Publish your crop harvests to make them visible to APMC buyers across Karnataka.
              </p>
              <button onClick={() => setIsCreateListingModalOpen(true)} className="btn btn-primary">
                Create First Listing
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {myListings.map((listing) => (
                <div key={listing.listing_id} className="card" style={{ padding: '1.25rem', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{listing.listing_id}</span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '2px 0' }}>{listing.crop_name}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{listing.variety}</span>
                    </div>

                    <span
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: listing.listing_status === 'ACTIVE' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                        color: listing.listing_status === 'ACTIVE' ? '#16a34a' : '#ca8a04'
                      }}
                    >
                      {listing.listing_status}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', margin: '10px 0', padding: '10px', backgroundColor: 'var(--bg-color)', borderRadius: '8px' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Stock</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                        {listing.available_quantity} / {listing.initial_quantity} <span style={{ fontSize: '0.75rem' }}>{listing.quantity_unit}</span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Expected Price</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary-color)' }}>
                        ₹{listing.expected_price.toLocaleString('en-IN')} <span style={{ fontSize: '0.75rem' }}>/{listing.quantity_unit}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>📍 {listing.village_or_town}, {listing.district}</div>
                    <div>📅 Harvest Date: {listing.harvest_date}</div>
                    <div>⭐ {listing.quality_grade}</div>
                  </div>

                  <div style={{ marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid var(--border-color)' }}>
                    <button
                      onClick={() => handleOpenEditListing(listing)}
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      <Edit3 size={14} />
                      Edit Details
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('enquiries');
                        setEnquiryStatusFilter('All');
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="View enquiries for this crop"
                    >
                      Enquiries ({listing.enquiries_count || 0})
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: PURCHASE ENQUIRIES & ORDERS */}
      {/* =================================================================== */}
      {activeTab === 'enquiries' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
                {lang === 'kn' ? 'ಖರೀದಿ ವಿಚಾರಣೆಗಳ ನಿರ್ವಹಣೆ' : 'Purchase Enquiries & Trade Pipeline'}
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '2px 0 0' }}>
                All buyer requests recorded in Snowflake `PURCHASE_ENQUIRIES`. Accepting an enquiry automatically decrements produce stock.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {['All', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'COMPLETED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setEnquiryStatusFilter(st)}
                  className={`btn ${enquiryStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {loadingEnquiries ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading enquiries from Snowflake...</p>
            </div>
          ) : enquiries.length === 0 ? (
            <div className="card" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
              <Tag size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3>No enquiries found in Snowflake</h3>
              <p style={{ color: 'var(--text-muted)' }}>Buyers can submit purchase offers from the Buyer Marketplace feed.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {enquiries
                .filter((e) => enquiryStatusFilter === 'All' || e.enquiry_status === enquiryStatusFilter)
                .map((enq) => {
                  const isSubmitted = enq.enquiry_status === 'SUBMITTED';
                  const isAccepted = enq.enquiry_status === 'ACCEPTED';
                  const isRejected = enq.enquiry_status === 'REJECTED';

                  return (
                    <div
                      key={enq.enquiry_id}
                      className="card"
                      style={{
                        padding: '1.25rem',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        borderLeft: `4px solid ${
                          isAccepted ? '#10b981' : isRejected ? '#ef4444' : isSubmitted ? '#f59e0b' : '#3b82f6'
                        }`
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                              {enq.enquiry_id}
                            </span>
                            <span
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: isAccepted ? 'rgba(16, 185, 129, 0.15)' : isRejected ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                color: isAccepted ? '#10b981' : isRejected ? '#ef4444' : '#d97706'
                              }}
                            >
                              {enq.enquiry_status}
                            </span>
                          </div>

                          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '4px 0 2px' }}>
                            Produce: {enq.crop_name || 'Crop Listing'} ({enq.listing_id})
                          </h3>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Farmer: <strong style={{ color: 'var(--text-color)' }}>{enq.farmer_name || 'Registered Farmer'}</strong>
                          </div>
                        </div>

                        {/* Trade Summary */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Trade Valuation</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                            ₹{(enq.requested_quantity * enq.offered_price).toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {enq.requested_quantity} {enq.quantity_unit || 'Quintals'} @ ₹{enq.offered_price}
                          </div>
                        </div>
                      </div>

                      {/* Buyer Details */}
                      <div
                        style={{
                          backgroundColor: 'var(--bg-color)',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          fontSize: '0.85rem',
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <strong>Buyer: </strong> {enq.buyer_name} ({enq.buyer_company || 'Independent Trader'})
                          <span style={{ marginLeft: '12px', color: 'var(--text-muted)' }}>📞 {enq.buyer_phone}</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          Submitted: {enq.created_at || 'Just now'}
                        </div>
                      </div>

                      {/* Buyer Message */}
                      {enq.message && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          "{enq.message}"
                        </div>
                      )}

                      {/* Farmer Response Note */}
                      {enq.farmer_response_note && (
                        <div style={{ fontSize: '0.82rem', color: '#16a34a', backgroundColor: 'rgba(22, 163, 74, 0.08)', padding: '6px 10px', borderRadius: '6px' }}>
                          <strong>Farmer Response: </strong> {enq.farmer_response_note}
                        </div>
                      )}

                      {/* Farmer Action Buttons for SUBMITTED enquiry */}
                      {isSubmitted && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                          <button
                            onClick={() => handleUpdateEnquiryStatus(enq.enquiry_id, 'REJECTED')}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem', color: '#ef4444', borderColor: '#ef4444', padding: '6px 14px' }}
                          >
                            Decline Offer
                          </button>
                          <button
                            onClick={() => handleUpdateEnquiryStatus(enq.enquiry_id, 'ACCEPTED')}
                            className="btn btn-primary"
                            style={{
                              fontSize: '0.85rem',
                              backgroundColor: '#10b981',
                              borderColor: '#10b981',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 16px'
                            }}
                          >
                            <Check size={15} />
                            Accept & Fulfill Stock
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: VERIFIED DIRECTORY */}
      {/* =================================================================== */}
      {activeTab === 'directory' && (
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0 }}>
              {lang === 'kn' ? 'ಪರಿಶೀಲಿತ ಸದಸ್ಯರ ವಿವರ' : 'Verified APMC Buyers & Farmer Directory'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '2px 0 0' }}>
              Profiles seeded and synced directly from Snowflake `MARKETPLACE_PROFILES`.
            </p>
          </div>

          {loadingProfiles ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 10px' }} />
              <p style={{ color: 'var(--text-muted)' }}>Loading profiles from Snowflake...</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {profiles.map((prof) => {
                const isFarmer = prof.role === 'farmer';

                return (
                  <div key={prof.profile_id} className="card" style={{ padding: '1.25rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor: isFarmer ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: isFarmer ? '#16a34a' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '1rem'
                          }}
                        >
                          {prof.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{prof.full_name}</h3>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{prof.business_name || 'Independent'}</span>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: isFarmer ? 'rgba(34, 197, 94, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          color: isFarmer ? '#16a34a' : '#2563eb',
                          textTransform: 'uppercase'
                        }}
                      >
                        {prof.role}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', margin: '10px 0' }}>
                      <div>📍 {prof.village_or_town ? `${prof.village_or_town}, ` : ''}{prof.district}, {prof.state}</div>
                      <div>📞 {prof.phone}</div>
                      {prof.email && <div>✉️ {prof.email}</div>}
                      {prof.kisan_card_or_gst && (
                        <div style={{ fontFamily: 'monospace', color: 'var(--text-color)', marginTop: '4px' }}>
                          ID: {prof.kisan_card_or_gst}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#16a34a', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                      <CheckCircle2 size={14} />
                      <span>Verified & Synced with Snowflake</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: SUBMIT PURCHASE ENQUIRY */}
      {/* =================================================================== */}
      {isEnquiryModalOpen && selectedListingForEnquiry && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: 'var(--surface-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                  Submit Purchase Enquiry
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Produce: {selectedListingForEnquiry.crop_name} ({selectedListingForEnquiry.variety})
                </span>
              </div>
              <button
                onClick={() => setIsEnquiryModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Listing Summary Box */}
            <div
              style={{
                backgroundColor: 'var(--bg-color)',
                padding: '12px 14px',
                borderRadius: '10px',
                marginBottom: '1.25rem',
                fontSize: '0.85rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}
            >
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Farmer:</span>{' '}
                <strong>{selectedListingForEnquiry.farmer_name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Location:</span>{' '}
                <strong>{selectedListingForEnquiry.village_or_town}, {selectedListingForEnquiry.district}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Expected Price:</span>{' '}
                <strong style={{ color: 'var(--primary-color)' }}>₹{selectedListingForEnquiry.expected_price} / {selectedListingForEnquiry.quantity_unit}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Available Stock:</span>{' '}
                <strong style={{ color: '#16a34a' }}>{selectedListingForEnquiry.available_quantity} {selectedListingForEnquiry.quantity_unit}</strong>
              </div>
            </div>

            <form onSubmit={handleSubmitEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Requested Quantity ({selectedListingForEnquiry.quantity_unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={selectedListingForEnquiry.available_quantity}
                    required
                    value={enquiryForm.requested_quantity}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, requested_quantity: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                  {parseFloat(enquiryForm.requested_quantity) > selectedListingForEnquiry.available_quantity && (
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                      ⚠️ Cannot exceed available stock ({selectedListingForEnquiry.available_quantity})
                    </span>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Offered Price (₹ / {selectedListingForEnquiry.quantity_unit}) *
                  </label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    required
                    value={enquiryForm.offered_price}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, offered_price: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Total Estimated Valuation */}
              {enquiryForm.requested_quantity && enquiryForm.offered_price && (
                <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', padding: '10px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated Trade Value:</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>
                    ₹{(parseFloat(enquiryForm.requested_quantity) * parseFloat(enquiryForm.offered_price) || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Purchaser / Company Name
                  </label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.buyer_company}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, buyer_company: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.buyer_phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, buyer_phone: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Trade Notes / Logistics Window
                </label>
                <textarea
                  rows={3}
                  value={enquiryForm.message}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', resize: 'none' }}
                  placeholder="Specify pickup requirements, transport vehicle, weighing terms..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEnquiryModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEnquiry || parseFloat(enquiryForm.requested_quantity) > selectedListingForEnquiry.available_quantity}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingEnquiry ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                  Commit Enquiry to Snowflake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: CREATE NEW PRODUCE LISTING */}
      {/* =================================================================== */}
      {isCreateListingModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: 'var(--surface-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              maxHeight: '92vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>
                  Publish New Harvest Listing
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Live write to Snowflake `PRODUCE_LISTINGS` table
                </span>
              </div>
              <button
                onClick={() => setIsCreateListingModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateListing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Crop Name *</label>
                  <select
                    value={createForm.crop_name}
                    onChange={(e) => setCreateForm({ ...createForm, crop_name: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="Tomato">Tomato (ಟೊಮೆಟೊ)</option>
                    <option value="Onion">Onion (ಈರುಳ್ಳಿ)</option>
                    <option value="Potato">Potato (ಆಲೂಗಡ್ಡೆ)</option>
                    <option value="Ginger">Ginger (ಶುಂಠಿ)</option>
                    <option value="Green Chilli">Green Chilli (ಹಸಿ ಮೆಣಸಿನಕಾಯಿ)</option>
                    <option value="Ragi">Ragi (ರಾಗಿ)</option>
                    <option value="Maize">Maize (ಮೆಕ್ಕೆಜೋಳ)</option>
                    <option value="Paddy">Paddy / Rice (ಭತ್ತ)</option>
                    <option value="Cotton">Cotton (ಹತ್ತಿ)</option>
                    <option value="Turmeric">Turmeric (ಅರಿಶಿನ)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Variety / Hybrid</label>
                  <input
                    type="text"
                    value={createForm.variety}
                    onChange={(e) => setCreateForm({ ...createForm, variety: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Harvest Quantity *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      required
                      placeholder="e.g. 50"
                      value={createForm.available_quantity}
                      onChange={(e) => setCreateForm({ ...createForm, available_quantity: e.target.value })}
                      className="input-field"
                      style={{ flex: 1 }}
                    />
                    <select
                      value={createForm.quantity_unit}
                      onChange={(e) => setCreateForm({ ...createForm, quantity_unit: e.target.value })}
                      className="input-field"
                      style={{ width: '100px' }}
                    >
                      <option value="Quintals">Quintals</option>
                      <option value="Tonnes">Tonnes</option>
                      <option value="Kg">Kg</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Expected Price (₹ / Unit) *</label>
                  <input
                    type="number"
                    step="10"
                    min="1"
                    required
                    placeholder="e.g. 1450"
                    value={createForm.expected_price}
                    onChange={(e) => setCreateForm({ ...createForm, expected_price: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>District *</label>
                  <select
                    value={createForm.district}
                    onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="Hassan">Hassan</option>
                    <option value="Mysore">Mysore</option>
                    <option value="Belagavi">Belagavi</option>
                    <option value="Davanagere">Davanagere</option>
                    <option value="Mandya">Mandya</option>
                    <option value="Shivamogga">Shivamogga</option>
                    <option value="Bengaluru Urban">Bengaluru Urban</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Village / Town *</label>
                  <input
                    type="text"
                    required
                    value={createForm.village_or_town}
                    onChange={(e) => setCreateForm({ ...createForm, village_or_town: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Harvest Date *</label>
                  <input
                    type="date"
                    required
                    value={createForm.harvest_date}
                    onChange={(e) => setCreateForm({ ...createForm, harvest_date: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Quality Grade</label>
                  <select
                    value={createForm.quality_grade}
                    onChange={(e) => setCreateForm({ ...createForm, quality_grade: e.target.value })}
                    className="input-field"
                    style={{ width: '100%' }}
                  >
                    <option value="Grade A / Fair Average">Grade A / Fair Average</option>
                    <option value="Grade A / Organic Certified">Grade A / Organic Certified</option>
                    <option value="Grade A / Export Quality">Grade A / Export Quality</option>
                    <option value="Grade FAQ / Machine Dressed">Grade FAQ / Machine Dressed</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Pickup Address / Landmark</label>
                <input
                  type="text"
                  placeholder="e.g. Survey 42, Sakleshpur-Hanbal Main Road"
                  value={createForm.pickup_address}
                  onChange={(e) => setCreateForm({ ...createForm, pickup_address: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={createForm.photo_url}
                  onChange={(e) => setCreateForm({ ...createForm, photo_url: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Description & Grading Details</label>
                <textarea
                  rows={3}
                  placeholder="Field condition, moisture content, packaging type..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateListingModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingListing}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingListing ? <RefreshCw size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                  Publish to Snowflake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL: EDIT PRODUCE LISTING */}
      {/* =================================================================== */}
      {isEditListingModalOpen && editingListing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
          }}
        >
          <div
            className="card animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '500px',
              backgroundColor: 'var(--surface-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                  Edit Produce Listing
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {editingListing.crop_name} ({editingListing.listing_id})
                </span>
              </div>
              <button
                onClick={() => setIsEditListingModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEditListing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Available Stock ({editingListing.quantity_unit}) *
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  required
                  value={editForm.available_quantity}
                  onChange={(e) => setEditForm({ ...editForm, available_quantity: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Expected Price (₹ / {editingListing.quantity_unit}) *
                </label>
                <input
                  type="number"
                  step="10"
                  min="1"
                  required
                  value={editForm.expected_price}
                  onChange={(e) => setEditForm({ ...editForm, expected_price: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Listing Status
                </label>
                <select
                  value={editForm.listing_status}
                  onChange={(e) => setEditForm({ ...editForm, listing_status: e.target.value })}
                  className="input-field"
                  style={{ width: '100%' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="PARTIALLY_FULFILLED">PARTIALLY_FULFILLED</option>
                  <option value="FULFILLED">FULFILLED (Sold Out)</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="input-field"
                  style={{ width: '100%', resize: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsEditListingModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {submittingEdit ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Save to Snowflake
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
