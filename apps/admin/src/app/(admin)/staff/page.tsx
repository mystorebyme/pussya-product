export default function StaffPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>Staff & roles</h1>
          <p>RBAC: owner, catalog manager, dispatch</p>
        </div>
      </div>
      <div className="panel" style={{ marginTop: 0 }}>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Access</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Owner</td>
              <td>Sab kuch — settings, staff, refunds, reports</td>
            </tr>
            <tr>
              <td>Catalog manager</td>
              <td>Products, collections, price (stock), images</td>
            </tr>
            <tr>
              <td>Dispatch</td>
              <td>Orders (status update only), customer contact</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="notice">
        Phase 1 me ek hi owner login hai. Multi-user staff accounts (invite + role + 2FA) Phase 2 me
        aayenge — design `docs/07-security/authorization-rbac.md` me hai.
      </div>
    </>
  );
}
