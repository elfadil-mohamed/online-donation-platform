import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";

const API = "http://localhost:5000";

const categories = [
"All",
"Education",
"Shelter",
"Food",
"Medical",
"Other"
];

const demoCampaigns = [
{
id: "demo-education",
name: "Education Support for Rural Children",
description: "Help children receive educational support, books and learning materials.",
goal: 500000,
raised: 0,
icon: "📚",
beneficiary: "Rural Children",
category: "Education"
},
{
id: "demo-shelter",
name: "Help Homeless Children",
description: "Support safe shelter, clothing and basic needs for children without homes.",
goal: 400000,
raised: 0,
icon: "🏠",
beneficiary: "Homeless Children",
category: "Shelter"
},
{
id: "demo-food",
name: "Food Support for Poor Families",
description: "Provide nutritious food and essential groceries to families in need.",
goal: 300000,
raised: 0,
icon: "🍲",
beneficiary: "Poor Families",
category: "Food"
},
{
id: "demo-medical",
name: "Medical Treatment Support",
description: "Help people receive medical treatment and essential healthcare support.",
goal: 600000,
raised: 0,
icon: "🏥",
beneficiary: "Patients in Need",
category: "Medical"
},
{
id: "demo-other",
name: "Support Children in Need",
description: "Support children with education, food, clothing and other essential needs.",
goal: 350000,
raised: 0,
icon: "❤️",
beneficiary: "Children in Need",
category: "Other"
}
];

/**
 * Normalizes the campaign category for display and filtering.
 *
 * @param {{ category?: string } | null | undefined} campaign - Campaign record returned from the API or local demo data.
 * @returns {string} The category label shown to the user.
 */
function getCategory(campaign) {
return campaign && campaign.category
? campaign.category
: "Other";
}

function getCategoryIcon(category) {
if (category === "Education") return "📚";
if (category === "Shelter") return "🏠";
if (category === "Food") return "🍲";
if (category === "Medical") return "🏥";
return "❤️";
}

function getBeneficiary(campaign) {
if (!campaign) return "People in Need";

if (typeof campaign.beneficiary === "string") {
return campaign.beneficiary;
}

if (campaign.beneficiary && typeof campaign.beneficiary === "object") {
return (
campaign.beneficiary.name ||
campaign.beneficiary.fullName ||
campaign.beneficiary.title ||
"People in Need"
);
}

return "People in Need";
}

function getCampaignKey(campaign) {
return String(
campaign?.id ||
campaign?._id ||
campaign?.name ||
Math.random()
);
}

function normalizeCampaign(campaign) {
const category = getCategory(campaign);

return {
...campaign,
id: campaign?.id || campaign?._id || ("campaign-" + Date.now() + "-" + Math.random()),
name: campaign?.name || "Untitled Campaign",
description: campaign?.description || "Support this meaningful cause.",
goal: Number(campaign?.goal || 0),
raised: Number(campaign?.raised || 0),
icon: campaign?.icon || getCategoryIcon(category),
beneficiary: getBeneficiary(campaign),
category
};
}

/**
 * Merges backend campaigns with local demo campaigns while keeping duplicates out of the list.
 * Demo campaigns act as a fallback when the server is unavailable or when a campaign is not yet stored.
 *
 * @param {Array<object>} [serverCampaigns=[]] - Campaigns returned by the Express API.
 * @returns {Array<object>} A de-duped campaign list sorted as server data first, then demo data.
 */
function mergeCampaigns(serverCampaigns) {
const list = Array.isArray(serverCampaigns)
? serverCampaigns.map(normalizeCampaign)
: [];

const serverNames = new Set(
list.map(function (item) {
return String(item.name).toLowerCase();
})
);

// Keep the default project content available even when MongoDB is down.
const demos = demoCampaigns
.filter(function (item) {
return !serverNames.has(String(item.name).toLowerCase());
})
.map(normalizeCampaign);

return [...list, ...demos];
}

function formatCurrency(amount) {
return "₹" + Number(amount || 0).toLocaleString("en-IN");
}

function getProgress(campaign) {
const goal = Number(campaign?.goal || 0);
const raised = Number(campaign?.raised || 0);

if (goal <= 0) return 0;

return Math.min(100, Math.round((raised / goal) * 100));
}

/**
 * Root component for the GiveHope donation platform.
 *
 * It loads campaigns and donation history, renders the public donation experience,
 * and provides an admin workflow for creating, updating, and deleting campaigns.
 *
 * @returns {JSX.Element} The donation platform UI.
 */
export default function App() {
const [campaigns, setCampaigns] = useState([]);
const [donations, setDonations] = useState([]);

const [search, setSearch] = useState("");
const [category, setCategory] = useState("All");

const [selectedCampaign, setSelectedCampaign] = useState(null);
const [showDonation, setShowDonation] = useState(false);
const [showReceipt, setShowReceipt] = useState(false);
const [showHistory, setShowHistory] = useState(false);

const [showAdminLogin, setShowAdminLogin] = useState(false);
const [showAdmin, setShowAdmin] = useState(false);

const [adminPassword, setAdminPassword] = useState("");
const [adminError, setAdminError] = useState("");

const [showCampaignForm, setShowCampaignForm] = useState(false);
const [editingCampaign, setEditingCampaign] = useState(null);

const [lastDonation, setLastDonation] = useState(null);
const [message, setMessage] = useState("");

useEffect(function () {
loadCampaigns();
loadDonations();
}, []);

async function loadCampaigns() {
try {
const response = await fetch(API + "/api/campaigns");

  if (!response.ok) {
    throw new Error("Campaign API error");
  }

  const data = await response.json();
  setCampaigns(mergeCampaigns(data));
} catch (error) {
  console.error(error);

  const saved = localStorage.getItem("givehope-campaigns");

  if (saved) {
    try {
      setCampaigns(mergeCampaigns(JSON.parse(saved)));
    } catch {
      setCampaigns(demoCampaigns);
    }
  } else {
    setCampaigns(demoCampaigns);
  }
}

}

async function loadDonations() {
try {
const response = await fetch(API + "/api/donations");

  if (!response.ok) {
    throw new Error("Donation API error");
  }

  const data = await response.json();
  const list = Array.isArray(data) ? data : [];

  setDonations(list);
  localStorage.setItem("givehope-donations", JSON.stringify(list));
} catch (error) {
  console.error(error);

  const saved = localStorage.getItem("givehope-donations");

  if (saved) {
    try {
      setDonations(JSON.parse(saved));
    } catch {
      setDonations([]);
    }
  } else {
    setDonations([]);
  }
}

}

function saveLocalCampaigns(list) {
localStorage.setItem(
"givehope-campaigns",
JSON.stringify(list)
);
}

async function handleDonation(formData) {
const campaign = selectedCampaign;

if (!campaign) return;

const amount = Number(formData.amount || 0);

if (amount <= 0) {
  setMessage("Please enter a valid donation amount.");
  return;
}

const donation = {
  name: formData.name || "Anonymous Donor",
  email: formData.email || "",
  amount,
  payment: formData.payment || "UPI",
  campaignId: campaign.id || campaign._id,
  campaignName: campaign.name,
  date: new Date().toISOString()
};

try {
  const response = await fetch(API + "/api/donations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(donation)
  });

  if (!response.ok) {
    throw new Error("Donation could not be saved");
  }

  const savedDonation = await response.json();

  setDonations(function (previous) {
    const updated = [savedDonation, ...previous];
    localStorage.setItem(
      "givehope-donations",
      JSON.stringify(updated)
    );
    return updated;
  });
} catch (error) {
  console.error(error);

  const localDonation = {
    ...donation,
    id: "donation-" + Date.now()
  };

  setDonations(function (previous) {
    const updated = [localDonation, ...previous];

    localStorage.setItem(
      "givehope-donations",
      JSON.stringify(updated)
    );

    return updated;
  });
}

const updatedCampaigns = campaigns.map(function (item) {
  const same =
    String(getCampaignKey(item)) ===
    String(getCampaignKey(campaign));

  if (!same) return item;

  return {
    ...item,
    raised: Number(item.raised || 0) + amount
  };
});

setCampaigns(updatedCampaigns);
saveLocalCampaigns(updatedCampaigns);

setLastDonation(donation);
setSelectedCampaign(null);
setShowDonation(false);
setShowReceipt(true);
setMessage("Donation completed successfully.");

}

function downloadReceipt(donation) {
if (!donation) return;

const pdf = new jsPDF();

pdf.setFontSize(24);
pdf.text("GiveHope", 20, 25);

pdf.setFontSize(18);
pdf.text("Donation Receipt", 20, 40);

pdf.setFontSize(12);

pdf.text(
  "Thank you for supporting a meaningful cause.",
  20,
  55
);

pdf.text(
  "Donor Name: " + (donation.name || "Anonymous"),
  20,
  75
);

pdf.text(
  "Email: " + (donation.email || "Not provided"),
  20,
  88
);

pdf.text(
  "Campaign: " + (donation.campaignName || "GiveHope Campaign"),
  20,
  101
);

pdf.text(
  "Amount: " + formatCurrency(donation.amount),
  20,
  114
);

pdf.text(
  "Payment Method: " + (donation.payment || "Not specified"),
  20,
  127
);

pdf.text(
  "Date: " +
    new Date(donation.date || Date.now()).toLocaleString(),
  20,
  140
);

pdf.text(
  "This is a demo donation receipt for a college project.",
  20,
  165
);

pdf.save("GiveHope-Donation-Receipt.pdf");

}

async function shareCampaign(campaign) {
if (!campaign) return;

const text =
  "Support " +
  campaign.name +
  " on GiveHope. " +
  campaign.description;

if (navigator.share) {
  try {
    await navigator.share({
      title: campaign.name,
      text: text
    });
    return;
  } catch (error) {
    console.log(error);
  }
}

try {
  await navigator.clipboard.writeText(text);
  setMessage("Campaign information copied to clipboard.");
} catch {
  setMessage("Sharing is not available on this browser.");
}

}

function handleAdminLogin() {
if (adminPassword === "admin123") {
setShowAdminLogin(false);
setShowAdmin(true);
setAdminPassword("");
setAdminError("");
} else {
setAdminError("Incorrect admin password.");
}
}

function handleAdminLogout() {
setShowAdmin(false);
}

async function createCampaign(formData) {
const newCampaign = normalizeCampaign({
...formData,
id: "campaign-" + Date.now(),
raised: 0,
icon: formData.icon || getCategoryIcon(formData.category)
});

try {
  const response = await fetch(API + "/api/campaigns", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(newCampaign)
  });

  if (response.ok) {
    const saved = await response.json();

    setCampaigns(function (previous) {
      const updated = [...previous, normalizeCampaign(saved)];
      saveLocalCampaigns(updated);
      return updated;
    });
  } else {
    throw new Error("Campaign API error");
  }
} catch (error) {
  console.error(error);

  setCampaigns(function (previous) {
    const updated = [...previous, newCampaign];
    saveLocalCampaigns(updated);
    return updated;
  });
}

setShowCampaignForm(false);
setEditingCampaign(null);
setMessage("Campaign created successfully.");

}

async function updateCampaign(formData) {
if (!editingCampaign) return;

const campaignId =
  editingCampaign._id || editingCampaign.id;

const updatedCampaign = normalizeCampaign({
  ...editingCampaign,
  ...formData,
  id: editingCampaign.id || campaignId
});

try {
  const response = await fetch(
    API + "/api/campaigns/" + campaignId,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updatedCampaign)
    }
  );

  if (!response.ok) {
    throw new Error("Update API error");
  }
} catch (error) {
  console.error(error);
}

setCampaigns(function (previous) {
  const updated = previous.map(function (item) {
    const itemId = item._id || item.id;

    if (String(itemId) === String(campaignId)) {
      return updatedCampaign;
    }

    return item;
  });

  saveLocalCampaigns(updated);
  return updated;
});

setShowCampaignForm(false);
setEditingCampaign(null);
setMessage("Campaign updated successfully.");

}

async function deleteCampaign(campaign) {
if (!campaign) return;

const confirmed = window.confirm(
  "Are you sure you want to delete this campaign?"
);

if (!confirmed) return;

const campaignId = campaign._id || campaign.id;

try {
  await fetch(
    API + "/api/campaigns/" + campaignId,
    {
      method: "DELETE"
    }
  );
} catch (error) {
  console.error(error);
}

setCampaigns(function (previous) {
  const updated = previous.filter(function (item) {
    const itemId = item._id || item.id;

    return String(itemId) !== String(campaignId);
  });

  saveLocalCampaigns(updated);
  return updated;
});

setMessage("Campaign deleted successfully.");

}

const filteredCampaigns = useMemo(
function () {
const searchText = search.toLowerCase().trim();

  return campaigns.filter(function (campaign) {
    const matchesCategory =
      category === "All" ||
      getCategory(campaign) === category;

    const text =
      String(campaign.name || "") +
      " " +
      String(campaign.description || "") +
      " " +
      String(getBeneficiary(campaign));

    const matchesSearch =
      searchText === "" ||
      text.toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });
},
[campaigns, search, category]

);

const totalRaised = donations.reduce(
function (total, donation) {
return total + Number(donation.amount || 0);
},
0
);

const totalDonations = donations.length;

const totalCampaigns = campaigns.length;

/**
 * Builds the last six months of donation totals for the summary chart.
 *
 * @returns {Array<{ month: string, year: number, amount: number }>} Donation totals by month.
 */
function getMonthlyDonationData() {
const months = [];

for (let i = 5; i >= 0; i--) {
  const date = new Date();

  date.setMonth(date.getMonth() - i);

  months.push({
    month: date.toLocaleString("en-US", {
      month: "short"
    }),
    year: date.getFullYear(),
    amount: 0
  });
}

donations.forEach(function (donation) {
  const date = new Date(
    donation.date || donation.createdAt || Date.now()
  );

  months.forEach(function (item) {
    if (
      date.getMonth() ===
        new Date(
          item.year,
          months.indexOf(item)
        ).getMonth() &&
      date.getFullYear() === item.year
    ) {
      item.amount += Number(donation.amount || 0);
    }
  });
});

return months;

}

// The chart uses a rolling window of six months so the dashboard stays readable while the app is still in demo mode.
const monthlyData = getMonthlyDonationData();

return (
<div className="app">
<nav className="navbar">
<div className="container navbar-inner">
<div className="brand">
<span className="brand-icon">❤️</span>
<span>GiveHope</span>
</div>

      <div className="nav-links">
        <button
          className="nav-button"
          onClick={function () {
            window.scrollTo({
              top: 0,
              behavior: "smooth"
            });
          }}
        >
          Home
        </button>

        <button
          className="nav-button"
          onClick={function () {
            document
              .getElementById("campaigns")
              ?.scrollIntoView({
                behavior: "smooth"
              });
          }}
        >
          Campaigns
        </button>

        <button
          className="nav-button"
          onClick={function () {
            setShowHistory(true);
          }}
        >
          Donation History
        </button>

        <button
          className="nav-button"
          onClick={function () {
            setShowAdminLogin(true);
          }}
        >
          Admin
        </button>
      </div>
    </div>
  </nav>

  {message && (
    <div className="message-bar">
      <span>{message}</span>

      <button
        onClick={function () {
          setMessage("");
        }}
      >
        ×
      </button>
    </div>
  )}

  <main>
    <section className="hero">
      <div className="container hero-content">
        <div className="hero-text">
          <span className="hero-badge">
            ❤️ Make a Difference
          </span>

          <h1>
            Give Hope.
            <br />
            Change Lives.
          </h1>

          <p>
            GiveHope connects generous people with meaningful
            causes. Every donation can help create a better
            future.
          </p>

          <button
            className="hero-button"
            onClick={function () {
              document
                .getElementById("campaigns")
                ?.scrollIntoView({
                  behavior: "smooth"
                });
            }}
          >
            Explore Campaigns
          </button>
        </div>

        <div className="hero-card">
          <div className="hero-card-icon">🤝</div>
          <h2>Together We Can Help</h2>
          <p>
            Support education, food, shelter, medical care
            and other important causes.
          </p>
        </div>
      </div>
    </section>

    <section className="stats-section">
      <div className="container stats-grid">
        <div className="stat-card">
          <div className="stat-icon">🎯</div>
          <div>
            <strong>{totalCampaigns}</strong>
            <span>Campaigns</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div>
            <strong>{formatCurrency(totalRaised)}</strong>
            <span>Total Donations</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">❤️</div>
          <div>
            <strong>{totalDonations}</strong>
            <span>Donations Made</span>
          </div>
        </div>
      </div>
    </section>

    <section className="main-content" id="campaigns">
      <div className="container">
        <div className="section-heading">
          <div>
            <span className="section-label">
              SUPPORT A CAUSE
            </span>

            <h2>Donation Campaigns</h2>

            <p>
              Choose a campaign and make a positive
              difference today.
            </p>
          </div>
        </div>

        <div className="search-filter">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={search}
            onChange={function (event) {
              setSearch(event.target.value);
            }}
          />

          <select
            value={category}
            onChange={function (event) {
              setCategory(event.target.value);
            }}
          >
            {categories.map(function (item) {
              return (
                <option key={item} value={item}>
                  {item}
                </option>
              );
            })}
          </select>
        </div>

        <div className="campaign-grid">
          {filteredCampaigns.map(function (campaign) {
            const progress = getProgress(campaign);

            return (
              <article
                className="campaign-card"
                key={getCampaignKey(campaign)}
              >
                <div className="campaign-icon">
                  {campaign.icon}
                </div>

                <div className="campaign-content">
                  <span className="campaign-category">
                    {getCategory(campaign)}
                  </span>

                  <h3>{campaign.name}</h3>

                  <p>{campaign.description}</p>

                  <div className="beneficiary">
                    <strong>Beneficiary:</strong>{" "}
                    {getBeneficiary(campaign)}
                  </div>

                  <div className="progress-container">
                    <div className="progress-info">
                      <span>
                        {formatCurrency(campaign.raised)}
                      </span>

                      <span>
                        Goal {formatCurrency(campaign.goal)}
                      </span>
                    </div>

                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{
                          width: progress + "%"
                        }}
                      />
                    </div>

                    <small>
                      {progress}% funded
                    </small>
                  </div>

                  <div className="campaign-actions">
                    <button
                      className="primary-button"
                      onClick={function () {
                        setSelectedCampaign(campaign);
                        setShowDonation(true);
                      }}
                    >
                      Donate Now
                    </button>

                    <button
                      className="secondary-button"
                      onClick={function () {
                        shareCampaign(campaign);
                      }}
                    >
                      Share
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="empty-state">
            <div>🔎</div>
            <h3>No campaigns found</h3>
            <p>
              Try another search term or category.
            </p>
          </div>
        )}
      </div>
    </section>

    <section className="about-section">
      <div className="container">
        <div className="about-header">
          <span className="section-label">
            ABOUT GIVEHOPE
          </span>

          <h2>Making Giving Simple</h2>

          <p>
            GiveHope is a simple online donation platform
            created to connect people with meaningful causes.
          </p>
        </div>

        <div className="about-grid">
          <div className="about-card">
            <div className="about-icon">❤️</div>
            <h3>What GiveHope Is</h3>
            <p>
              GiveHope provides a simple way for people to
              discover campaigns and support causes they care
              about.
            </p>
          </div>

          <div className="about-card">
            <div className="about-icon">🎯</div>
            <h3>Our Purpose</h3>
            <p>
              Our purpose is to make charitable giving easier,
              clearer and more accessible.
            </p>
          </div>

          <div className="about-card">
            <div className="about-icon">🤝</div>
            <h3>How It Works</h3>
            <p>
              Browse a campaign, enter your donation details,
              choose a payment method and receive a donation
              receipt.
            </p>
          </div>

          <div className="about-card">
            <div className="about-icon">🌍</div>
            <h3>Causes Supported</h3>
            <p>
              GiveHope supports education, food, shelter,
              medical care and other important causes.
            </p>
          </div>
        </div>

        <div className="about-highlight">
          <div className="about-highlight-icon">
            🌟
          </div>

          <div>
            <h3>Every Contribution Matters</h3>

            <p>
              Small acts of kindness can make a meaningful
              difference in someone's life.
            </p>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer className="footer">
    <div className="container">
      <div className="footer-content">
        <div>
          <div className="footer-brand">
            ❤️ GiveHope
          </div>

          <p>
            GiveHope is an online donation platform created
            to connect people with meaningful causes and make
            charitable giving simple.
          </p>
        </div>

        <div>
          <h3>Quick Links</h3>

          <p
            onClick={function () {
              document
                .getElementById("campaigns")
                ?.scrollIntoView({
                  behavior: "smooth"
                });
            }}
          >
            Campaigns
          </p>

          <p
            onClick={function () {
              setShowHistory(true);
            }}
          >
            Donation History
          </p>

          <p
            onClick={function () {
              setShowAdminLogin(true);
            }}
          >
            Admin Dashboard
          </p>
        </div>

        <div>
          <h3>Our Mission</h3>

          <p>
            Together, we can support education, food, shelter,
            medical care and other important causes.
          </p>
        </div>
      </div>

      <div className="footer-bottom">
        © 2026 GiveHope. All rights reserved.
      </div>
    </div>
  </footer>

  {showDonation && selectedCampaign && (
    <Modal
      title="Make a Donation"
      onClose={function () {
        setShowDonation(false);
        setSelectedCampaign(null);
      }}
    >
      <DonationForm
        campaign={selectedCampaign}
        onSubmit={handleDonation}
        onCancel={function () {
          setShowDonation(false);
          setSelectedCampaign(null);
        }}
      />
    </Modal>
  )}

  {showReceipt && lastDonation && (
    <Modal
      title="Donation Successful"
      onClose={function () {
        setShowReceipt(false);
        setLastDonation(null);
      }}
    >
      <Receipt
        donation={lastDonation}
        onDownload={downloadReceipt}
        onClose={function () {
          setShowReceipt(false);
          setLastDonation(null);
        }}
      />
    </Modal>
  )}

  {showHistory && (
    <Modal
      title="Donation History"
      onClose={function () {
        setShowHistory(false);
      }}
    >
      <DonationHistory donations={donations} />
    </Modal>
  )}

  {showAdminLogin && (
    <Modal
      title="Admin Login"
      onClose={function () {
        setShowAdminLogin(false);
        setAdminPassword("");
        setAdminError("");
      }}
    >
      <div className="form">
        <label>Admin Password</label>

        <input
          type="password"
          value={adminPassword}
          onChange={function (event) {
            setAdminPassword(event.target.value);
          }}
          placeholder="Enter admin password"
        />

        {adminError && (
          <p className="error-text">
            {adminError}
          </p>
        )}

        <button
          className="primary-button"
          onClick={handleAdminLogin}
        >
          Login
        </button>

        <p className="demo-note">
          Demo password: Elfadil0101
        </p>
      </div>
    </Modal>
  )}

  {showCampaignForm && (
    <Modal
      title={
        editingCampaign
          ? "Edit Campaign"
          : "Create New Campaign"
      }
      onClose={function () {
        setShowCampaignForm(false);
        setEditingCampaign(null);
      }}
    >
      <CampaignForm
        campaign={editingCampaign}
        onSubmit={
          editingCampaign
            ? updateCampaign
            : createCampaign
        }
        onCancel={function () {
          setShowCampaignForm(false);
          setEditingCampaign(null);
        }}
      />
    </Modal>
  )}

  {showAdmin && (
    <Modal
      title="Admin Dashboard"
      onClose={handleAdminLogout}
    >
      <AdminDashboard
        campaigns={campaigns}
        donations={donations}
        monthlyData={monthlyData}
        onCreate={function () {
          setEditingCampaign(null);
          setShowCampaignForm(true);
        }}
        onEdit={function (campaign) {
          setEditingCampaign(campaign);
          setShowCampaignForm(true);
        }}
        onDelete={deleteCampaign}
        onLogout={handleAdminLogout}
      />
    </Modal>
  )}
</div>

);
}

function Modal({ title, children, onClose }) {
return (
<div
className="modal-overlay"
onClick={function (event) {
if (event.target === event.currentTarget) {
onClose();
}
}}
>
<div className="modal">
<div className="modal-header">
<h2>{title}</h2>

      <button
        className="modal-close"
        onClick={onClose}
      >
        ×
      </button>
    </div>

    <div className="modal-body">
      {children}
    </div>
  </div>
</div>

);
}

function DonationForm({ campaign, onSubmit, onCancel }) {
const [name, setName] = useState("");
const [email, setEmail] = useState("");
const [amount, setAmount] = useState("");
const [payment, setPayment] = useState("UPI");

function submit(event) {
event.preventDefault();

onSubmit({
  name,
  email,
  amount,
  payment
});

}

return (
<form className="form" onSubmit={submit}>
<div className="selected-campaign">
<div className="selected-icon">
{campaign.icon}
</div>

    <div>
      <h3>{campaign.name}</h3>
      <p>{campaign.description}</p>
    </div>
  </div>

  <label>Your Name</label>

  <input
    type="text"
    value={name}
    onChange={function (event) {
      setName(event.target.value);
    }}
    placeholder="Enter your name"
    required
  />


  <label> Email</label>

  <input
    type="email"
    value={email}
    onChange={function (event) {
      setEmail(event.target.value);
    }}
    placeholder="Enter your email"
    required
  />


  <label>Donation Amount</label>

  <input
    type="number"
    min="1"
    value={amount}
    onChange={function (event) {
      setAmount(event.target.value);
    }}
    placeholder="Enter amount"
    required
  />


  <label>Payment Method</label>

  <select
    value={payment}
    onChange={function (event) {
      setPayment(event.target.value);
    }}
  >
    <option value="UPI">UPI</option>
    <option value="Credit Card">Credit Card</option>
    <option value="Debit Card">Debit Card</option>
    <option value="Net Banking">Net Banking</option>
  </select>

  <div className="form-actions">
    <button
      type="button"
      className="secondary-button"
      onClick={onCancel}
    >
      Cancel
    </button>

    <button
      type="submit"
      className="primary-button"
    >
      Donate Now
    </button>
  </div>

  <p className="demo-note">
    This is a elfadil and boya  payment system for a college project.
  </p>
</form>

);
}

function Receipt({ donation, onDownload, onClose }) {
return (
<div className="receipt">
<div className="receipt-success">
✓
</div>

  <h3>Thank You!</h3>

  <p>
    Your donation has been recorded successfully.
  </p>

  <div className="receipt-details">
    <div>
      <span>Donor</span>
      <strong>
        {donation.name || "Anonymous"}
      </strong>
    </div>

    <div>
      <span>Campaign</span>
      <strong>
        {donation.campaignName}
      </strong>
    </div>

    <div>
      <span>Amount</span>
      <strong>
        {formatCurrency(donation.amount)}
      </strong>
    </div>

    <div>
      <span>Payment</span>
      <strong>
        {donation.payment}
      </strong>
    </div>
  </div>

  <div className="form-actions">
    <button
      className="secondary-button"
      onClick={function () {
        onDownload(donation);
      }}
    >
      Download Donation Receipt PDF
    </button>

    <button
      className="primary-button"
      onClick={onClose}
    >
      Done
    </button>
  </div>
</div>

);
}

function DonationHistory({ donations }) {
if (!donations || donations.length === 0) {
return (
<div className="empty-state">
<div>💝</div>
<h3>No Donations Yet</h3>
<p>
Your donation history will appear here.
</p>
</div>
);
}

return (
<div className="donation-history">
{donations.map(function (donation, index) {
return (
<div
className="history-item"
key={
donation._id ||
donation.id ||
index
}
>
<div>
<h3>
{donation.campaignName ||
"GiveHope Campaign"}
</h3>

          <p>
            Donor:{" "}
            {donation.name || "Anonymous"}
          </p>

          <small>
            {new Date(
              donation.date ||
                donation.createdAt ||
                Date.now()
            ).toLocaleString()}
          </small>
        </div>

        <strong>
          {formatCurrency(donation.amount)}
        </strong>
      </div>
    );
  })}
</div>

);
}

function CampaignForm({
campaign,
onSubmit,
onCancel
}) {
const [name, setName] = useState(
campaign?.name || ""
);

const [description, setDescription] =
useState(campaign?.description || "");

const [goal, setGoal] = useState(
campaign?.goal || ""
);

const [category, setCategory] = useState(
campaign?.category || "Education"
);

const [beneficiary, setBeneficiary] =
useState(getBeneficiary(campaign));

const [icon, setIcon] = useState(
campaign?.icon ||
getCategoryIcon(
campaign?.category || "Education"
)
);

function submit(event) {
event.preventDefault();

onSubmit({
  name,
  description,
  goal: Number(goal),
  category,
  beneficiary,
  icon
});

}

return (
<form className="form" onSubmit={submit}>
<label>Campaign Name</label>

  <input
    type="text"
    value={name}
    onChange={function (event) {
      setName(event.target.value);
    }}
    placeholder="Campaign name"
    required
  />

  <label>Description</label>

  <textarea
    value={description}
    onChange={function (event) {
      setDescription(event.target.value);
    }}
    placeholder="Campaign description"
    rows="4"
    required
  />

  <label>Goal Amount</label>

  <input
    type="number"
    min="1"
    value={goal}
    onChange={function (event) {
      setGoal(event.target.value);
    }}
    placeholder="Goal amount"
    required
  />

  <label>Category</label>

  <select
    value={category}
    onChange={function (event) {
      const value = event.target.value;

      setCategory(value);
      setIcon(getCategoryIcon(value));
    }}
  >
    {categories
      .filter(function (item) {
        return item !== "All";
      })
      .map(function (item) {
        return (
          <option key={item} value={item}>
            {item}
          </option>
        );
      })}
  </select>

  <label>Beneficiary</label>

  <input
    type="text"
    value={beneficiary}
    onChange={function (event) {
      setBeneficiary(event.target.value);
    }}
    placeholder="Beneficiary name"
    required
  />

  <label>Icon</label>

  <input
    type="text"
    value={icon}
    onChange={function (event) {
      setIcon(event.target.value);
    }}
    placeholder="Example: 📚"
  />

  <div className="form-actions">
    <button
      type="button"
      className="secondary-button"
      onClick={onCancel}
    >
      Cancel
    </button>

    <button
      type="submit"
      className="primary-button"
    >
      {campaign
        ? "Update Campaign"
        : "Create Campaign"}
    </button>
  </div>
</form>

);
}

function AdminDashboard({
campaigns,
donations,
monthlyData,
onCreate,
onEdit,
onDelete,
onLogout
}) {
const totalRaised = donations.reduce(
function (total, donation) {
return total + Number(donation.amount || 0);
},
0
);

return (
<div className="admin-dashboard">
<div className="admin-heading">
<div>
<span className="section-label">
ADMIN AREA
</span>

      <h2>GiveHope Dashboard</h2>

      <p>
        Manage campaigns and view donation statistics.
      </p>
    </div>

    <button
      className="secondary-button"
      onClick={onLogout}
    >
      Logout
    </button>
  </div>

  <div className="admin-stats">
    <div className="admin-stat">
      <span>Campaigns</span>
      <strong>{campaigns.length}</strong>
    </div>

    <div className="admin-stat">
      <span>Donations</span>
      <strong>{donations.length}</strong>
    </div>

    <div className="admin-stat">
      <span>Total Raised</span>
      <strong>
        {formatCurrency(totalRaised)}
      </strong>
    </div>
  </div>

  <div className="admin-section">
    <div className="admin-section-header">
      <h3>Campaign Management</h3>

      <button
        className="primary-button"
        onClick={onCreate}
      >
        + Create New Campaign
      </button>
    </div>

    <div className="admin-campaign-list">
      {campaigns.map(function (campaign) {
        return (
          <div
            className="admin-campaign"
            key={getCampaignKey(campaign)}
          >
            <div>
              <span>
                {campaign.icon}{" "}
                {campaign.name}
              </span>

              <small>
                {getCategory(campaign)} •{" "}
                {formatCurrency(campaign.raised)} raised
              </small>
            </div>

            <div className="admin-actions">
              <button
                className="secondary-button"
                onClick={function () {
                  onEdit(campaign);
                }}
              >
                Edit
              </button>

              <button
                className="danger-button"
                onClick={function () {
                  onDelete(campaign);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>

  <div className="admin-section">
    <div className="admin-section-header">
      <h3>Monthly Donation Analytics</h3>
    </div>

    <div className="monthly-chart">
      {monthlyData.map(function (item) {
        const maxAmount = Math.max(
          ...monthlyData.map(function (month) {
            return month.amount;
          }),
          1
        );

        const height =
          Math.max(
            8,
            (item.amount / maxAmount) * 100
          );

        return (
          <div
            className="chart-column"
            key={item.month + item.year}
          >
            <div className="chart-value">
              {formatCurrency(item.amount)}
            </div>

            <div className="chart-bar-wrapper">
              <div
                className="chart-bar"
                style={{
                  height: height + "%"
                }}
              />
            </div>

            <span>
              {item.month}
            </span>
          </div>
        );
      })}
    </div>
  </div>

  <div className="admin-section">
    <div className="admin-section-header">
      <h3>Campaign Donation Statistics</h3>
    </div>

    <div className="campaign-statistics">
      {campaigns.map(function (campaign) {
        const campaignDonations =
          donations.filter(function (donation) {
            return (
              String(
                donation.campaignId || ""
              ) ===
                String(
                  campaign.id ||
                    campaign._id ||
                    ""
                ) ||
              donation.campaignName ===
                campaign.name
            );
          });

        const amount =
          campaignDonations.reduce(
            function (total, donation) {
              return (
                total +
                Number(donation.amount || 0)
              );
            },
            0
          );

        return (
          <div
            className="campaign-stat-row"
            key={getCampaignKey(campaign)}
          >
            <div>
              <strong>
                {campaign.icon}{" "}
                {campaign.name}
              </strong>

              <small>
                {campaignDonations.length} donation(s)
              </small>
            </div>

            <strong>
              {formatCurrency(amount)}
            </strong>
          </div>
        );
      })}
    </div>
  </div>
</div>

);
}

