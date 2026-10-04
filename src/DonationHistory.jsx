```jsx
function DonationHistory({ donations, onViewReceipt }) {
  if (!donations || donations.length === 0) {
    return (
      <section className="donation-history">
        <h2>📜 My Donation History</h2>
        <div className="no-results">
          <p>💙 You have not made any donations yet.</p>
          <p>Your donation history will appear here after you donate.</p>
        </div>
      </section>
    );
  }

  const sortedDonations = [...donations].sort(
    (a, b) =>
      new Date(b.createdAt || 0) -
      new Date(a.createdAt || 0)
  );

  return (
    <section className="donation-history">
      <div className="section-heading">
        <div>
          <h2>📜 My Donation History</h2>
          <p>View your previous donations and receipts.</p>
        </div>
      </div>

      <div className="donation-history-table-wrapper">
        <table className="donation-history-table">
          <thead>
            <tr>
              <th>Donor</th>
              <th>Campaign</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Date</th>
              <th>Receipt</th>
            </tr>
          </thead>

          <tbody>
            {sortedDonations.map((donation, index) => (
              <tr key={donation._id || donation.id || index}>
                <td>{donation.name || "Anonymous"}</td>

                <td>
                  {donation.campaignName ||
                    donation.campaign ||
                    "Unknown Campaign"}
                </td>

                <td>
                  ₹{Number(donation.amount || 0).toLocaleString("en-IN")}
                </td>

                <td>{donation.payment || "Demo Payment"}</td>

                <td>
                  {donation.createdAt
                    ? new Date(donation.createdAt).toLocaleDateString(
                        "en-IN"
                      )
                    : "N/A"}
                </td>

                <td>
                  <button
                    className="secondary-btn"
                    onClick={() => onViewReceipt(donation)}
                  >
                    🧾 View Receipt
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default DonationHistory;
```
